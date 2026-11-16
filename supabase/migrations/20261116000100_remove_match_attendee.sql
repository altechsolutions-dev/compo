create or replace function public.remove_match_attendee(
  p_match_id uuid,
  p_attendee_id uuid
)
returns table (attendees uuid[], attendee_names jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_creator_id uuid;
  match_status text;
  removed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.created_by, slot.status
  into match_organization_id, match_creator_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;
  if match_status <> 'scheduled' then
    raise exception 'Only scheduled matches can have attendees removed';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if auth.uid() <> p_attendee_id
    and auth.uid() <> match_creator_id
    and not exists (
      select 1 from public.organization_members as membership
      where membership.organization_id = match_organization_id
        and membership.user_id = auth.uid()
        and membership.role = 'owner'
    ) then
    raise exception 'Only the attendee or a match owner can remove this attendee';
  end if;

  delete from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id
    and attendee.user_id = p_attendee_id;
  get diagnostics removed_count = row_count;

  if removed_count = 0 then
    raise exception 'Match attendee not found';
  end if;

  update public.match_slots as slot
  set team_a = null,
      team_b = null
  where slot.id = p_match_id;

  return query
  select
    coalesce(
      array_agg(attendee.user_id order by attendee.registered_at),
      array[]::uuid[]
    ),
    coalesce(
      jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
        filter (where attendee.guest_name is not null),
      '{}'::jsonb
    )
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

revoke all on function public.remove_match_attendee(uuid, uuid) from public;
grant execute on function public.remove_match_attendee(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
