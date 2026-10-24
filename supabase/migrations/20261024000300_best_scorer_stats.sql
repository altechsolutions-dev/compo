alter table public.players
  add column if not exists best_scorer_count integer not null default 0
  check (best_scorer_count >= 0);

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
  match_team_a uuid[];
  match_team_b uuid[];
  next_status text;
  next_started_at timestamptz;
  next_elapsed_seconds integer;
  team_a_score integer;
  team_b_score integer;
  action_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select
    slot.organization_id,
    slot.status,
    slot.started_at,
    slot.elapsed_seconds,
    slot.team_a,
    slot.team_b
  into
    match_organization_id,
    current_status,
    current_started_at,
    current_elapsed_seconds,
    match_team_a,
    match_team_b
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

  if p_action = 'finish' then
    select
      (count(*) filter (where goal.team = 0))::integer,
      (count(*) filter (where goal.team = 1))::integer
    into team_a_score, team_b_score
    from public.match_slot_goals as goal
    where goal.match_slot_id = p_match_id;

    update public.players as player
    set matches_played = player.matches_played + 1,
        wins = player.wins + case
          when attendee.user_id = any(match_team_a)
            and team_a_score > team_b_score then 1
          when attendee.user_id = any(match_team_b)
            and team_b_score > team_a_score then 1
          else 0
        end,
        draws = player.draws + case
          when (attendee.user_id = any(match_team_a)
              or attendee.user_id = any(match_team_b))
            and team_a_score = team_b_score then 1
          else 0
        end,
        losses = player.losses + case
          when attendee.user_id = any(match_team_a)
            and team_a_score < team_b_score then 1
          when attendee.user_id = any(match_team_b)
            and team_b_score < team_a_score then 1
          else 0
        end,
        goals = player.goals + (
          select count(*)::integer
          from public.match_slot_goals as goal
          where goal.match_slot_id = p_match_id
            and goal.scorer_id = player.user_id
        ),
        best_scorer_count = player.best_scorer_count + case
          when (
            select count(*)
            from public.match_slot_goals as goal
            where goal.match_slot_id = p_match_id
              and goal.scorer_id = player.user_id
          ) > 0
            and (
              select count(*)
              from public.match_slot_goals as goal
              where goal.match_slot_id = p_match_id
                and goal.scorer_id = player.user_id
            ) = (
              select max(scorer_totals.goal_count)
              from (
                select count(*) as goal_count
                from public.match_slot_goals as goal
                where goal.match_slot_id = p_match_id
                group by goal.scorer_id
              ) as scorer_totals
            ) then 1
          else 0
        end
    from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and player.organization_id = match_organization_id
      and player.user_id = attendee.user_id;
  end if;

  return query select next_status, next_started_at, next_elapsed_seconds;
end;
$$;

revoke all on function public.set_match_state(uuid, text) from public;
grant execute on function public.set_match_state(uuid, text) to authenticated;

notify pgrst, 'reload schema';