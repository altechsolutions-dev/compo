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
  match_status text;
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

  select slot.status, slot.started_at, slot.elapsed_seconds, slot.team_a, slot.team_b
  into match_status, match_started_at, match_elapsed_seconds, match_team_a, match_team_b
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id
    and slot.status in ('in_progress', 'paused')
  for update of slot;

  if match_status is null then
    raise exception 'Active match attendee required';
  end if;
  if match_status = 'in_progress' and match_started_at is null then
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
    match_elapsed_seconds + case
      when match_status = 'in_progress' then greatest(
        0,
        floor(extract(epoch from (goal_time - match_started_at)))::integer
      )
      else 0
    end,
    goal_time
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
end;
$$;

create or replace function public.swap_match_teams(
  p_match_id uuid,
  p_red_player_id uuid,
  p_blue_player_id uuid
)
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
  red_player_index integer;
  blue_player_index integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status, slot.team_a, slot.team_b
  into match_organization_id, match_status, current_team_a, current_team_b
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null
    or match_status not in ('in_progress', 'paused') then
    raise exception 'Active match required';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as caller
      on caller.match_slot_id = p_match_id
     and caller.user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;

  red_player_index := array_position(current_team_a, p_red_player_id);
  blue_player_index := array_position(current_team_b, p_blue_player_id);
  if red_player_index is null or blue_player_index is null then
    raise exception 'Players must belong to opposing teams';
  end if;

  current_team_a[red_player_index] := p_blue_player_id;
  current_team_b[blue_player_index] := p_red_player_id;

  update public.match_slots as slot
  set team_a = current_team_a,
      team_b = current_team_b
  where slot.id = p_match_id;

  return query select current_team_a, current_team_b;
end;
$$;

revoke all on function public.record_match_goal(uuid, uuid) from public;
revoke all on function public.swap_match_teams(uuid, uuid, uuid) from public;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;
grant execute on function public.swap_match_teams(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';