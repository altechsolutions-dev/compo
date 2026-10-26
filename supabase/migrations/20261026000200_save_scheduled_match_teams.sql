create or replace function public.save_scheduled_match_teams(
  p_match_id uuid,
  p_team_a uuid[],
  p_team_b uuid[]
)
returns table (team_a uuid[], team_b uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  match_status text;
  attendee_count integer;
  all_team_ids uuid[] := coalesce(p_team_a, array[]::uuid[]) || coalesce(p_team_b, array[]::uuid[]);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.max_players, slot.status
  into match_organization_id, match_capacity, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;
  if match_status <> 'scheduled' then
    raise exception 'Only scheduled matches can have their teams edited';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;

  select count(*)::integer
  into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if attendee_count < match_capacity then
    raise exception 'Match must be full before its teams can be edited';
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
    ) then
    raise exception 'Teams must contain every attendee exactly once';
  end if;

  update public.match_slots as slot
  set team_a = p_team_a,
      team_b = p_team_b
  where slot.id = p_match_id;

  return query select p_team_a, p_team_b;
end;
$$;

revoke all on function public.save_scheduled_match_teams(uuid, uuid[], uuid[]) from public;
grant execute on function public.save_scheduled_match_teams(uuid, uuid[], uuid[]) to authenticated;

notify pgrst, 'reload schema';