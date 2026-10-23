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

revoke all on function public.leave_organization(uuid) from public;
grant execute on function public.leave_organization(uuid) to authenticated;