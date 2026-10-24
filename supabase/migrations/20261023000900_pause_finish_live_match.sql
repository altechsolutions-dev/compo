alter table public.match_slots
  add column if not exists elapsed_seconds integer not null default 0;

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