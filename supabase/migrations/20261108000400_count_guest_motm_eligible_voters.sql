create or replace function public.get_match_man_of_the_match(p_match_id uuid)
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
  voting_deadline timestamptz;
  current_vote_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status,
    slot.motm_awarded_at is not null, slot.motm_voting_deadline
  into match_organization_id, match_status, poll_is_complete, voting_deadline
  from public.match_slots as slot
  where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
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
  ) then raise exception 'Match attendee required'; end if;

  if not poll_is_complete and voting_deadline <= now() then
    select count(*)::integer into current_vote_count
    from public.match_slot_motm_votes as vote
    where vote.match_slot_id = p_match_id;
    if current_vote_count >= 3 then
      update public.match_slots as slot
      set motm_awarded_at = now()
      where slot.id = p_match_id and slot.motm_awarded_at is null;
      with vote_totals as (
        select vote.candidate_id, count(*) as total_votes
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ), highest_vote_count as (
        select max(totals.total_votes) as total_votes from vote_totals as totals
      )
      update public.players as player
      set man_of_the_match_count = player.man_of_the_match_count + 1
      from vote_totals as totals
      cross join highest_vote_count as highest
      where totals.total_votes = highest.total_votes
        and player.organization_id = match_organization_id
        and player.user_id = totals.candidate_id;
      poll_is_complete := true;
    end if;
  end if;

  return query
  select
    (select vote.candidate_id from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id and vote.voter_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'candidate_id', totals.candidate_id,
        'vote_count', totals.vote_count
      ) order by totals.vote_count desc, totals.candidate_id)
      from (
        select vote.candidate_id, count(*)::integer as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ) as totals
    ), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (
        select vote.candidate_id, count(*) as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ) as totals
      where totals.vote_count = (
        select max(counts.vote_count)
        from (
          select count(*) as vote_count
          from public.match_slot_motm_votes as vote
          where vote.match_slot_id = p_match_id
          group by vote.candidate_id
        ) as counts
      )
    ), array[]::uuid[]) else array[]::uuid[] end;
end;
$$;

revoke all on function public.get_match_man_of_the_match(uuid) from public;
grant execute on function public.get_match_man_of_the_match(uuid) to authenticated;

notify pgrst, 'reload schema';