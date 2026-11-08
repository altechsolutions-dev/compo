create or replace function public.vote_match_man_of_the_match(
  p_match_id uuid,
  p_candidate_id uuid
)
returns table (
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
  current_vote_count integer;
  current_voter_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status, slot.motm_awarded_at is not null
  into match_organization_id, match_status, poll_is_complete
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if match_status <> 'finished' then
    raise exception 'Match must be finished before voting';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.account_user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;
  if not exists (
    select 1
    from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = p_candidate_id
  ) then
    raise exception 'Candidate must be a match attendee';
  end if;

  select poll.is_complete
  into poll_is_complete
  from public.get_match_man_of_the_match(p_match_id) as poll;

  if poll_is_complete then
    return query
    select poll.*
    from public.get_match_man_of_the_match(p_match_id) as poll;
    return;
  end if;

  insert into public.match_slot_motm_votes (
    match_slot_id,
    voter_id,
    candidate_id
  ) values (
    p_match_id,
    auth.uid(),
    p_candidate_id
  )
  on conflict (match_slot_id, voter_id)
  do update set candidate_id = excluded.candidate_id;

  select
    (select count(*)::integer
     from public.match_slot_motm_votes as vote
     where vote.match_slot_id = p_match_id),
    (select count(*)::integer
     from public.match_slot_attendees as attendee
     where attendee.match_slot_id = p_match_id)
  into current_vote_count, current_voter_count;

  if current_vote_count = current_voter_count and current_voter_count > 0 then
    update public.match_slots as slot
    set motm_awarded_at = now()
    where slot.id = p_match_id
      and slot.motm_awarded_at is null;

    with vote_totals as (
      select vote.candidate_id, count(*) as total_votes
      from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id
      group by vote.candidate_id
    ), highest_vote_count as (
      select max(totals.total_votes) as total_votes
      from vote_totals as totals
    )
    update public.players as player
    set man_of_the_match_count = player.man_of_the_match_count + 1
    from vote_totals as totals
    cross join highest_vote_count as highest
    where totals.total_votes = highest.total_votes
      and player.organization_id = match_organization_id
      and player.user_id = totals.candidate_id;
  end if;

  return query
  select poll.*
  from public.get_match_man_of_the_match(p_match_id) as poll;
end;
$$;

drop trigger if exists match_slot_votes_reject_guest_stats
  on public.match_slot_motm_votes;

revoke all on function public.vote_match_man_of_the_match(uuid, uuid)
  from public;
grant execute on function public.vote_match_man_of_the_match(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';