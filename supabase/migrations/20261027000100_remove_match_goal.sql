create or replace function public.remove_match_goal(
  p_match_id uuid,
  p_goal_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_status text;
  removed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.status
  into match_status
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id
   and caller.user_id = auth.uid()
  where slot.id = p_match_id
    and slot.status in ('in_progress', 'paused')
  for update of slot;

  if match_status is null then
    raise exception 'Active match attendee required';
  end if;

  delete from public.match_slot_goals as goal
  where goal.id = p_goal_id
    and goal.match_slot_id = p_match_id;

  get diagnostics removed_count = row_count;
  if removed_count = 0 then
    raise exception 'Match goal not found';
  end if;

  return true;
end;
$$;

revoke all on function public.remove_match_goal(uuid, uuid) from public;
grant execute on function public.remove_match_goal(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';