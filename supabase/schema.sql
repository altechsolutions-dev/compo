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

create table if not exists public.players (
  organization_id uuid not null,
  user_id uuid not null,
  overall_rating integer not null default 50 check (overall_rating between 0 and 100),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  man_of_the_match_count integer not null default 0 check (man_of_the_match_count >= 0),
  goals integer not null default 0 check (goals >= 0),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id)
    on delete cascade
);

alter table public.players enable row level security;
revoke all on table public.players from anon, authenticated;
grant select on table public.players to authenticated;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;

create policy players_select_for_organization_members
  on public.players
  for select
  to authenticated
  using (public.is_organization_member(players.organization_id));

create or replace function public.create_player_for_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_player then
    insert into public.players (organization_id, user_id)
    values (new.organization_id, new.user_id)
    on conflict (organization_id, user_id) do nothing;
  else
    delete from public.players
    where organization_id = new.organization_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace trigger organization_members_create_player_after_insert
  after insert on public.organization_members
  for each row execute function public.create_player_for_membership();

create or replace trigger organization_members_create_player_after_player_update
  after update of is_player on public.organization_members
  for each row execute function public.create_player_for_membership();

revoke all on function public.create_player_for_membership() from public;

insert into public.players (organization_id, user_id)
select membership.organization_id, membership.user_id
from public.organization_members as membership
where membership.is_player
on conflict (organization_id, user_id) do nothing;

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create unique index if not exists organizations_name_normalized_key
  on public.organizations (lower(trim(name)));

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
  violated_constraint text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Organization name must contain 2 to 80 characters';
  end if;
  if exists (
    select 1
    from public.organizations as org
    where lower(trim(org.name)) = lower(clean_name)
  ) then
    raise exception 'Organization name is already taken';
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

  begin
    insert into public.organizations (name, invite_code, created_by)
    values (clean_name, new_code, auth.uid())
    returning id into new_id;
  exception
    when unique_violation then
      get stacked diagnostics violated_constraint = constraint_name;
      if violated_constraint = 'organizations_name_normalized_key' then
        raise exception 'Organization name is already taken';
      end if;
      raise;
  end;

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

  if exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = invite_org.id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'You are already a member of this organization';
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
  on conflict on constraint organization_members_pkey do nothing;

  if not found then
    raise exception 'You are already a member of this organization';
  end if;

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

create or replace function public.leave_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_role text;
  next_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform 1
  from public.organizations as org
  where org.id = p_organization_id
  for update;
  if not found then
    raise exception 'Organization not found';
  end if;

  select membership.role into membership_role
  from public.organization_members as membership
  where membership.organization_id = p_organization_id
    and membership.user_id = auth.uid()
  for update;
  if membership_role is null then
    raise exception 'Organization membership required';
  end if;

  if membership_role = 'owner' then
    select membership.user_id into next_owner_id
    from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id <> auth.uid()
    order by membership.joined_at, membership.user_id
    limit 1
    for update;

    if next_owner_id is null then
      raise exception 'Le dernier propriétaire ne peut pas quitter l’organisation.';
    end if;

    update public.organization_members as membership
    set role = 'owner'
    where membership.organization_id = p_organization_id
      and membership.user_id = next_owner_id;

    update public.organizations as org
    set created_by = next_owner_id
    where org.id = p_organization_id;
  end if;

  delete from public.organization_members as membership
  where membership.organization_id = p_organization_id
    and membership.user_id = auth.uid();
end;
$$;

create or replace function public.remove_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use leave_organization to remove yourself';
  end if;

  perform 1
  from public.organizations as org
  where org.id = p_organization_id
  for update;
  if not found then
    raise exception 'Organization not found';
  end if;

  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  ) then
    raise exception 'Organization owner required';
  end if;

  delete from public.organization_members as target_member
  where target_member.organization_id = p_organization_id
    and target_member.user_id = p_user_id
    and target_member.role = 'member';

  if not found then
    raise exception 'Member not found or cannot be removed';
  end if;
end;
$$;

revoke all on function public.create_organization(text, boolean) from public;
revoke all on function public.preview_organization_invite(text) from public;
revoke all on function public.join_organization_by_code(text) from public;
revoke all on function public.get_my_organizations() from public;
revoke all on function public.get_organization_members(uuid) from public;
revoke all on function public.leave_organization(uuid) from public;
revoke all on function public.remove_organization_member(uuid, uuid) from public;

grant execute on function public.create_organization(text, boolean) to authenticated;
grant execute on function public.preview_organization_invite(text) to anon, authenticated;
grant execute on function public.join_organization_by_code(text) to authenticated;
grant execute on function public.get_my_organizations() to authenticated;
grant execute on function public.get_organization_members(uuid) to authenticated;
grant execute on function public.leave_organization(uuid) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;

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

alter table public.match_slots
  add column if not exists elapsed_seconds integer not null default 0;

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[],
  status text,
  started_at timestamptz,
  elapsed_seconds integer,
  team_a uuid[],
  team_b uuid[],
  goals jsonb
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
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status,
    slot.started_at,
    slot.elapsed_seconds,
    slot.team_a,
    slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id,
        'scorer_id', goal.scorer_id,
        'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds,
        'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal
      where goal.match_slot_id = slot.id
    ), '[]'::jsonb)
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.record_match_goal(
  p_match_id uuid,
  p_scorer_id uuid
)
returns table (
  id uuid,
  scorer_id uuid,
  team smallint,
  elapsed_seconds integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_started_at timestamptz;
  match_elapsed_seconds integer;
  match_team_a uuid[];
  match_team_b uuid[];
  goal_team smallint;
  goal_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.started_at, slot.elapsed_seconds, slot.team_a, slot.team_b
  into match_started_at, match_elapsed_seconds, match_team_a, match_team_b
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id and slot.status = 'in_progress'
  for update of slot;

  if match_started_at is null then
    raise exception 'Active match attendee required';
  end if;
  if p_scorer_id = any(match_team_a) then
    goal_team := 0;
  elsif p_scorer_id = any(match_team_b) then
    goal_team := 1;
  else
    raise exception 'Scorer is not part of the match';
  end if;

  return query
  insert into public.match_slot_goals as goal (
    match_slot_id, scorer_id, team, elapsed_seconds, created_at
  ) values (
    p_match_id,
    p_scorer_id,
    goal_team,
    match_elapsed_seconds + greatest(
      0,
      floor(extract(epoch from (goal_time - match_started_at)))::integer
    ),
    goal_time
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
end;
$$;

create or replace function public.set_match_state(
  p_match_id uuid,
  p_action text
)
returns table (
  status text,
  started_at timestamptz,
  elapsed_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  current_status text;
  current_started_at timestamptz;
  current_elapsed_seconds integer;
  next_status text;
  next_started_at timestamptz;
  next_elapsed_seconds integer;
  action_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status, slot.started_at, slot.elapsed_seconds
  into match_organization_id, current_status, current_started_at, current_elapsed_seconds
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;

  if p_action = 'pause'
    and current_status = 'in_progress'
    and current_started_at is not null then
    next_status := 'paused';
    next_started_at := null;
    next_elapsed_seconds := current_elapsed_seconds + greatest(
      0,
      floor(extract(epoch from (action_time - current_started_at)))::integer
    );
  elsif p_action = 'resume' and current_status = 'paused' then
    next_status := 'in_progress';
    next_started_at := action_time;
    next_elapsed_seconds := current_elapsed_seconds;
  elsif p_action = 'finish'
    and current_status in ('in_progress', 'paused') then
    next_status := 'finished';
    next_started_at := null;
    next_elapsed_seconds := current_elapsed_seconds;
    if current_status = 'in_progress' and current_started_at is not null then
      next_elapsed_seconds := next_elapsed_seconds + greatest(
        0,
        floor(extract(epoch from (action_time - current_started_at)))::integer
      );
    end if;
  else
    raise exception 'Invalid match state transition';
  end if;

  update public.match_slots as slot
  set status = next_status,
      started_at = next_started_at,
      elapsed_seconds = next_elapsed_seconds
  where slot.id = p_match_id;

  return query select next_status, next_started_at, next_elapsed_seconds;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.record_match_goal(uuid, uuid) from public;
revoke all on function public.set_match_state(uuid, text) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;
grant execute on function public.set_match_state(uuid, text) to authenticated;

notify pgrst, 'reload schema';

alter table public.match_slots
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'finished')),
  add column if not exists started_at timestamptz,
  add column if not exists team_a uuid[],
  add column if not exists team_b uuid[];

create table if not exists public.match_slot_goals (
  id uuid primary key default gen_random_uuid(),
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  scorer_id uuid not null,
  team smallint not null check (team in (0, 1)),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  created_at timestamptz not null default now(),
  foreign key (match_slot_id, scorer_id)
    references public.match_slot_attendees (match_slot_id, user_id)
    on delete cascade
);

create index if not exists match_slot_goals_match_created_idx
  on public.match_slot_goals (match_slot_id, created_at);

alter table public.match_slot_goals enable row level security;
revoke all on table public.match_slot_goals from anon, authenticated;

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[],
  status text,
  started_at timestamptz,
  team_a uuid[],
  team_b uuid[],
  goals jsonb
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
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status,
    slot.started_at,
    slot.team_a,
    slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id,
        'scorer_id', goal.scorer_id,
        'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds,
        'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal
      where goal.match_slot_id = slot.id
    ), '[]'::jsonb)
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.start_match(
  p_match_id uuid,
  p_team_a uuid[],
  p_team_b uuid[]
)
returns table (status text, started_at timestamptz, team_a uuid[], team_b uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  attendee_count integer;
  start_time timestamptz := now();
  all_team_ids uuid[] := coalesce(p_team_a, array[]::uuid[]) || coalesce(p_team_b, array[]::uuid[]);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select slot.organization_id, slot.max_players
  into match_organization_id, match_capacity
  from public.match_slots as slot where slot.id = p_match_id for update;

  if match_organization_id is null then raise exception 'Match not found'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Organization membership required'; end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;
  if exists (
    select 1 from public.match_slots as slot
    where slot.id = p_match_id and slot.status <> 'scheduled'
  ) then raise exception 'Match has already started'; end if;

  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
  if attendee_count < match_capacity then
    raise exception 'Match must be full before it can start';
  end if;
  if cardinality(all_team_ids) <> attendee_count
    or exists (
      select 1 from unnest(all_team_ids) as player_id
      group by player_id having count(*) > 1
    )
    or exists (
      select 1 from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id
        and not (attendee.user_id = any(all_team_ids))
    ) then raise exception 'Teams must contain every attendee exactly once'; end if;

  update public.match_slots as slot
  set status = 'in_progress', started_at = start_time,
      team_a = p_team_a, team_b = p_team_b
  where slot.id = p_match_id;
  return query select 'in_progress'::text, start_time, p_team_a, p_team_b;
end;
$$;

create or replace function public.record_match_goal(p_match_id uuid, p_scorer_id uuid)
returns table (
  id uuid, scorer_id uuid, team smallint, elapsed_seconds integer, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_started_at timestamptz;
  match_team_a uuid[];
  match_team_b uuid[];
  goal_team smallint;
  goal_time timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.started_at, slot.team_a, slot.team_b
  into match_started_at, match_team_a, match_team_b
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id and slot.status = 'in_progress'
  for update of slot;
  if match_started_at is null then raise exception 'Active match attendee required'; end if;
  if p_scorer_id = any(match_team_a) then goal_team := 0;
  elsif p_scorer_id = any(match_team_b) then goal_team := 1;
  else raise exception 'Scorer is not part of the match'; end if;

  return query
  insert into public.match_slot_goals as goal (
    match_slot_id, scorer_id, team, elapsed_seconds, created_at
  ) values (
    p_match_id, p_scorer_id, goal_team,
    greatest(0, floor(extract(epoch from (goal_time - match_started_at)))::integer),
    goal_time
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
end;
$$;

create or replace function public.register_for_match(p_match_id uuid)
returns table (attendees uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  match_status text;
  attendee_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.max_players, slot.status
  into match_organization_id, match_capacity, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Organization membership required'; end if;
  if match_status <> 'scheduled' and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then raise exception 'Match has already started'; end if;
  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
  if attendee_count >= match_capacity and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then raise exception 'Match is full'; end if;
  insert into public.match_slot_attendees (match_slot_id, user_id)
  values (p_match_id, auth.uid()) on conflict (match_slot_id, user_id) do nothing;
  return query select coalesce(
    array_agg(attendee.user_id order by attendee.registered_at), array[]::uuid[]
  ) from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

create or replace function public.switch_match_team(p_match_id uuid, p_player_id uuid)
returns table (team_a uuid[], team_b uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  current_team_a uuid[];
  current_team_b uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status, slot.team_a, slot.team_b
  into match_organization_id, match_status, current_team_a, current_team_b
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null or match_status <> 'in_progress' then
    raise exception 'Active match required';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as caller
      on caller.match_slot_id = p_match_id and caller.user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;
  if p_player_id = any(current_team_a) then
    current_team_a := array_remove(current_team_a, p_player_id);
    current_team_b := array_append(current_team_b, p_player_id);
  elsif p_player_id = any(current_team_b) then
    current_team_b := array_remove(current_team_b, p_player_id);
    current_team_a := array_append(current_team_a, p_player_id);
  else raise exception 'Player is not part of the match'; end if;
  update public.match_slots as slot
  set team_a = current_team_a, team_b = current_team_b
  where slot.id = p_match_id;
  return query select current_team_a, current_team_b;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.start_match(uuid, uuid[], uuid[]) from public;
revoke all on function public.record_match_goal(uuid, uuid) from public;
revoke all on function public.register_for_match(uuid) from public;
revoke all on function public.switch_match_team(uuid, uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.start_match(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;
grant execute on function public.register_for_match(uuid) to authenticated;
grant execute on function public.switch_match_team(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

alter table public.match_slots
  drop constraint if exists match_slots_status_check;

alter table public.match_slots
  add constraint match_slots_status_check
  check (status in ('scheduled', 'in_progress', 'paused', 'finished'));

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[],
  status text,
  started_at timestamptz,
  elapsed_seconds integer,
  team_a uuid[],
  team_b uuid[],
  goals jsonb
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
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status,
    slot.started_at,
    slot.elapsed_seconds,
    slot.team_a,
    slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id,
        'scorer_id', goal.scorer_id,
        'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds,
        'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal
      where goal.match_slot_id = slot.id
    ), '[]'::jsonb)
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.record_match_goal(
  p_match_id uuid,
  p_scorer_id uuid
)
returns table (
  id uuid,
  scorer_id uuid,
  team smallint,
  elapsed_seconds integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_started_at timestamptz;
  match_elapsed_seconds integer;
  match_team_a uuid[];
  match_team_b uuid[];
  goal_team smallint;
  goal_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.started_at, slot.elapsed_seconds, slot.team_a, slot.team_b
  into match_started_at, match_elapsed_seconds, match_team_a, match_team_b
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id and slot.status = 'in_progress'
  for update of slot;

  if match_started_at is null then
    raise exception 'Active match attendee required';
  end if;
  if p_scorer_id = any(match_team_a) then
    goal_team := 0;
  elsif p_scorer_id = any(match_team_b) then
    goal_team := 1;
  else
    raise exception 'Scorer is not part of the match';
  end if;

  return query
  insert into public.match_slot_goals as goal (
    match_slot_id, scorer_id, team, elapsed_seconds, created_at
  ) values (
    p_match_id,
    p_scorer_id,
    goal_team,
    match_elapsed_seconds + greatest(
      0,
      floor(extract(epoch from (goal_time - match_started_at)))::integer
    ),
    goal_time
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
end;
$$;

create or replace function public.set_match_state(
  p_match_id uuid,
  p_action text
)
returns table (
  status text,
  started_at timestamptz,
  elapsed_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  current_status text;
  current_started_at timestamptz;
  current_elapsed_seconds integer;
  next_status text;
  next_started_at timestamptz;
  next_elapsed_seconds integer;
  action_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status, slot.started_at, slot.elapsed_seconds
  into match_organization_id, current_status, current_started_at, current_elapsed_seconds
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;

  if p_action = 'pause'
    and current_status = 'in_progress'
    and current_started_at is not null then
    next_status := 'paused';
    next_started_at := null;
    next_elapsed_seconds := current_elapsed_seconds + greatest(
      0,
      floor(extract(epoch from (action_time - current_started_at)))::integer
    );
  elsif p_action = 'resume' and current_status = 'paused' then
    next_status := 'in_progress';
    next_started_at := action_time;
    next_elapsed_seconds := current_elapsed_seconds;
  elsif p_action = 'finish'
    and current_status in ('in_progress', 'paused') then
    next_status := 'finished';
    next_started_at := null;
    next_elapsed_seconds := current_elapsed_seconds;
    if current_status = 'in_progress' and current_started_at is not null then
      next_elapsed_seconds := next_elapsed_seconds + greatest(
        0,
        floor(extract(epoch from (action_time - current_started_at)))::integer
      );
    end if;
  else
    raise exception 'Invalid match state transition';
  end if;

  update public.match_slots as slot
  set status = next_status,
      started_at = next_started_at,
      elapsed_seconds = next_elapsed_seconds
  where slot.id = p_match_id;

  return query select next_status, next_started_at, next_elapsed_seconds;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.record_match_goal(uuid, uuid) from public;
revoke all on function public.set_match_state(uuid, text) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;
grant execute on function public.set_match_state(uuid, text) to authenticated;

notify pgrst, 'reload schema';
