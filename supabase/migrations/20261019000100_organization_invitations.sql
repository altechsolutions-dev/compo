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