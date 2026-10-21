create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  is_player boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.create_organization(
  p_name text,
  p_join_as_player boolean default true
)
returns table (organization_id uuid, organization_name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(p_name);
  new_code text;
  new_id uuid;
  account_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Organization name must contain 2 to 80 characters';
  end if;

  select coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'Joueur'
  )
  into account_name
  from auth.users as users
  where users.id = auth.uid();

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (
      select 1 from public.organizations as org where org.invite_code = new_code
    );
  end loop;

  insert into public.organizations (name, invite_code, created_by)
  values (clean_name, new_code, auth.uid())
  returning id into new_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    display_name,
    role,
    is_player
  ) values (
    new_id,
    auth.uid(),
    account_name,
    'owner',
    p_join_as_player
  );

  return query select new_id, clean_name, new_code;
end;
$$;

create or replace function public.preview_organization_invite(p_code text)
returns table (organization_id uuid, organization_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select org.id, org.name
  from public.organizations as org
  where org.invite_code = upper(trim(p_code))
  limit 1;
$$;

create or replace function public.join_organization_by_code(p_code text)
returns table (organization_id uuid, organization_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_org public.organizations%rowtype;
  account_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select org.* into invite_org
  from public.organizations as org
  where org.invite_code = upper(trim(p_code))
  limit 1;

  if invite_org.id is null then
    raise exception 'Invitation code not found';
  end if;

  select coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'Joueur'
  )
  into account_name
  from auth.users as users
  where users.id = auth.uid();

  insert into public.organization_members (
    organization_id,
    user_id,
    display_name,
    role,
    is_player
  ) values (
    invite_org.id,
    auth.uid(),
    account_name,
    'member',
    true
  )
  on conflict (organization_id, user_id) do nothing;

  return query select invite_org.id, invite_org.name;
end;
$$;

create or replace function public.get_my_organizations()
returns table (
  organization_id uuid,
  organization_name text,
  invite_code text,
  role text,
  member_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select org.id, org.name, org.invite_code, membership.role,
    (select count(*) from public.organization_members as all_members
    where all_members.organization_id = org.id and all_members.is_player)
  from public.organizations as org
  join public.organization_members as membership
    on membership.organization_id = org.id
  where membership.user_id = (select auth.uid())
  order by membership.joined_at desc;
$$;

create or replace function public.get_organization_members(p_organization_id uuid)
returns table (user_id uuid, display_name text, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  return query
  select member.user_id, member.display_name, member.role
  from public.organization_members as member
  where member.organization_id = p_organization_id
    and member.is_player
  order by member.joined_at;
end;
$$;

revoke all on function public.create_organization(text, boolean) from public;
revoke all on function public.preview_organization_invite(text) from public;
revoke all on function public.join_organization_by_code(text) from public;
revoke all on function public.get_my_organizations() from public;
revoke all on function public.get_organization_members(uuid) from public;

grant execute on function public.create_organization(text, boolean) to authenticated;
grant execute on function public.preview_organization_invite(text) to anon, authenticated;
grant execute on function public.join_organization_by_code(text) to authenticated;
grant execute on function public.get_my_organizations() to authenticated;
grant execute on function public.get_organization_members(uuid) to authenticated;

create table if not exists public.match_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  match_date date not null,
  match_time time not null,
  venue text not null check (char_length(trim(venue)) between 1 and 160),
  max_players integer not null default 10 check (max_players between 2 and 30),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists match_slots_organization_schedule_idx
  on public.match_slots (organization_id, match_date, match_time);

alter table public.match_slots enable row level security;
revoke all on table public.match_slots from anon, authenticated;

create table if not exists public.match_slot_attendees (
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (match_slot_id, user_id)
);

create index if not exists match_slot_attendees_user_id_idx
  on public.match_slot_attendees (user_id);

alter table public.match_slot_attendees enable row level security;
revoke all on table public.match_slot_attendees from anon, authenticated;

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  return query
  select
    slot.id,
    to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'),
    slot.venue,
    slot.max_players,
    coalesce(
      array_agg(attendee.user_id order by attendee.registered_at)
        filter (where attendee.user_id is not null),
      array[]::uuid[]
    )
  from public.match_slots as slot
  left join public.match_slot_attendees as attendee
    on attendee.match_slot_id = slot.id
  where slot.organization_id = p_organization_id
  group by slot.id
  order by slot.match_date, slot.match_time;
end;
$$;

drop function if exists public.create_match_slot(uuid, date, time, text);
drop function if exists public.create_match_slot(uuid, date, time, text, integer);

create function public.create_match_slot(
  p_organization_id uuid,
  p_match_date date,
  p_match_time time,
  p_venue text,
  p_max_players integer,
  p_register_creator boolean
)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_venue text := trim(p_venue);
  new_match_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if clean_venue is null or char_length(clean_venue) not between 1 and 160 then
    raise exception 'Venue must contain 1 to 160 characters';
  end if;
  if p_max_players is null or p_max_players not between 2 and 30 then
    raise exception 'Match capacity must be between 2 and 30';
  end if;

  insert into public.match_slots (
    organization_id,
    match_date,
    match_time,
    venue,
    max_players,
    created_by
  ) values (
    p_organization_id,
    p_match_date,
    p_match_time,
    clean_venue,
    p_max_players,
    auth.uid()
  ) returning match_slots.id into new_match_id;

  if p_register_creator then
    insert into public.match_slot_attendees (match_slot_id, user_id)
    values (new_match_id, auth.uid());
  end if;

  return query
  select
    slot.id,
    to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'),
    slot.venue,
    slot.max_players,
    coalesce(
      array_agg(attendee.user_id order by attendee.registered_at)
        filter (where attendee.user_id is not null),
      array[]::uuid[]
    )
  from public.match_slots as slot
  left join public.match_slot_attendees as attendee
    on attendee.match_slot_id = slot.id
  where slot.id = new_match_id
  group by slot.id;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.create_match_slot(uuid, date, time, text, integer, boolean) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.create_match_slot(uuid, date, time, text, integer, boolean) to authenticated;

create or replace function public.register_for_match(p_match_id uuid)
returns table (attendees uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  attendee_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.max_players
  into match_organization_id, match_capacity
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  select count(*)::integer
  into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if attendee_count >= match_capacity and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = auth.uid()
  ) then
    raise exception 'Match is full';
  end if;

  insert into public.match_slot_attendees (match_slot_id, user_id)
  values (p_match_id, auth.uid())
  on conflict (match_slot_id, user_id) do nothing;

  return query
  select coalesce(
    array_agg(attendee.user_id order by attendee.registered_at),
    array[]::uuid[]
  )
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

revoke all on function public.register_for_match(uuid) from public;
grant execute on function public.register_for_match(uuid) to authenticated;

notify pgrst, 'reload schema';
