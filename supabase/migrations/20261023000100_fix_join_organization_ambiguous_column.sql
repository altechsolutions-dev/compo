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

revoke all on function public.join_organization_by_code(text) from public;
grant execute on function public.join_organization_by_code(text) to authenticated;