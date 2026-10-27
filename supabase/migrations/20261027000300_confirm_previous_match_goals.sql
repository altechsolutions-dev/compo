alter table public.match_slot_goals
  add column if not exists undoable boolean not null default false;

with latest_goal as (
  select distinct on (goal.match_slot_id) goal.id, goal.created_at
  from public.match_slot_goals as goal
  order by goal.match_slot_id, goal.created_at desc, goal.id desc
)
update public.match_slot_goals as goal
set undoable = true
from latest_goal
where goal.id = latest_goal.id
  and latest_goal.created_at > now() - interval '10 seconds';

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
  goals jsonb,
  attendee_names jsonb,
  created_by uuid
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
  select slot.id, to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'), slot.venue, slot.max_players,
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status, slot.started_at, slot.elapsed_seconds,
    slot.team_a, slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id, 'scorer_id', goal.scorer_id, 'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds, 'created_at', goal.created_at,
        'undoable', goal.undoable
      ) order by goal.created_at, goal.id)
      from public.match_slot_goals as goal where goal.match_slot_id = slot.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id and attendee.guest_name is not null
    ), '{}'::jsonb),
    slot.created_by
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

  if match_status is null
    or (match_status = 'in_progress' and match_started_at is null) then
    raise exception 'Active match attendee required';
  end if;
  if p_scorer_id = any(match_team_a) then
    goal_team := 0;
  elsif p_scorer_id = any(match_team_b) then
    goal_team := 1;
  else
    raise exception 'Scorer is not part of the match';
  end if;

  update public.match_slot_goals as previous_goal
  set undoable = false
  where previous_goal.match_slot_id = p_match_id
    and previous_goal.undoable;

  return query
  insert into public.match_slot_goals as goal (
    match_slot_id, scorer_id, team, elapsed_seconds, created_at, undoable
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
    goal_time,
    true
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.record_match_goal(uuid, uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';