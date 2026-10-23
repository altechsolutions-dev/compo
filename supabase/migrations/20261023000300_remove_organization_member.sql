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

revoke all on function public.remove_organization_member(uuid, uuid) from public;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;