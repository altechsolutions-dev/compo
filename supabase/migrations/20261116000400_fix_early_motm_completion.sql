create or replace function public.complete_match_motm_if_ready(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  voting_deadline timestamptz;
  current_vote_count integer;
  current_voter_count integer;
  first_votes integer;
  second_votes integer;
  poll_is_complete boolean;
begin
  select slot.organization_id, slot.motm_voting_deadline, slot.motm_awarded_at is not null
  into match_organization_id, voting_deadline, poll_is_complete
  from public.match_slots as slot
  where slot.id = p_match_id and slot.status = 'finished'
  for update;
  if match_organization_id is null or poll_is_complete then
    return coalesce(poll_is_complete, false);
  end if;
  select
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id),
    coalesce((select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
      order by count(*) desc limit 1), 0),
    coalesce((select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
      order by count(*) desc offset 1 limit 1), 0)
  into current_vote_count, current_voter_count, first_votes, second_votes;

  if (current_vote_count = current_voter_count and current_voter_count > 0)
    or (first_votes > second_votes + current_voter_count - current_vote_count)
    or (voting_deadline <= now() and current_vote_count >= 3) then
    update public.match_slots as slot set motm_awarded_at = now()
    where slot.id = p_match_id and slot.motm_awarded_at is null;
    with totals as (
      select vote.candidate_id, count(*) as votes
      from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
    )
    update public.players as player
    set man_of_the_match_count = player.man_of_the_match_count + 1
    from totals
    where player.organization_id = match_organization_id
      and player.user_id = totals.candidate_id
      and totals.votes = (select max(t.votes) from totals as t);
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.get_match_man_of_the_match(p_match_id uuid)
returns table (
  my_vote uuid, vote_totals jsonb, vote_count integer,
  eligible_voter_count integer, is_complete boolean, winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status
  into match_organization_id, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if match_status <> 'finished' then raise exception 'Match must be finished before voting'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id and attendee.account_user_id = membership.user_id
    where membership.organization_id = match_organization_id and membership.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;
  poll_is_complete := public.complete_match_motm_if_ready(p_match_id);

  return query
  select
    (select vote.candidate_id from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id and vote.voter_id = auth.uid()),
    coalesce((select jsonb_agg(jsonb_build_object(
      'candidate_id', totals.candidate_id, 'vote_count', totals.votes
    ) order by totals.votes desc, totals.candidate_id)
      from (select vote.candidate_id, count(*)::integer as votes
        from public.match_slot_motm_votes as vote where vote.match_slot_id = p_match_id
        group by vote.candidate_id) as totals), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (select vote.candidate_id, count(*) as votes
        from public.match_slot_motm_votes as vote where vote.match_slot_id = p_match_id
        group by vote.candidate_id) as totals
      where totals.votes = (select max(counts.votes) from (
        select count(*) as votes from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id group by vote.candidate_id
      ) as counts)
    ), array[]::uuid[]) else array[]::uuid[] end;
end;
$$;

notify pgrst, 'reload schema';
