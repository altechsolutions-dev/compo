drop function if exists public.vote_guest_match_motm(text, uuid);
drop function if exists public.get_guest_match_motm_vote(text);
drop function if exists public.create_guest_match_motm_vote_links(uuid, jsonb);
drop function if exists public.resolve_guest_match_motm_token(text);
drop table if exists public.match_slot_guest_motm_tokens;

create table public.match_slot_guest_motm_links (
  match_slot_id uuid primary key references public.match_slots (id) on delete cascade,
  token_hash bytea not null,
  created_at timestamptz not null default now()
);

alter table public.match_slot_guest_motm_links enable row level security;
revoke all on table public.match_slot_guest_motm_links
  from public, anon, authenticated;

create or replace function public.resolve_guest_match_motm_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select link.match_slot_id
  from public.match_slot_guest_motm_links as link
  where p_token ~ '^[0-9a-f]{64}$'
    and link.token_hash = extensions.digest(
      convert_to(p_token, 'UTF8'), 'sha256'
    )
$$;

revoke all on function public.resolve_guest_match_motm_token(text)
  from public, anon, authenticated;

create or replace function public.create_guest_match_motm_vote_link(
  p_match_id uuid,
  p_token text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_creator_id uuid;
  match_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid vote token';
  end if;

  select slot.organization_id, slot.created_by, slot.status
  into match_organization_id, match_creator_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null or match_status <> 'finished' then
    raise exception 'Finished match required';
  end if;
  if match_creator_id <> auth.uid() and not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  ) then
    raise exception 'Match creator or organization owner required';
  end if;
  if exists (
    select 1 from public.match_slots as slot
    where slot.id = p_match_id and slot.motm_awarded_at is not null
  ) then
    raise exception 'Voting is closed';
  end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.account_user_id is null
  ) then
    raise exception 'Guest attendee required';
  end if;

  insert into public.match_slot_guest_motm_links (match_slot_id, token_hash)
  values (
    p_match_id,
    extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
  )
  on conflict (match_slot_id)
  do update set token_hash = excluded.token_hash, created_at = now();

  return p_token;
end;
$$;

create or replace function public.get_guest_match_motm_vote(
  p_token text,
  p_voter_id uuid
)
returns table (
  match_id uuid,
  venue text,
  match_date text,
  match_time text,
  guest_name text,
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[],
  guest_voters jsonb,
  candidates jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_match_id uuid;
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
begin
  guest_match_id := public.resolve_guest_match_motm_token(p_token);
  if guest_match_id is null then raise exception 'Invalid vote link'; end if;

  select slot.organization_id, slot.status, slot.motm_awarded_at is not null
  into match_organization_id, match_status, poll_is_complete
  from public.match_slots as slot
  where slot.id = guest_match_id
  for update;
  if match_status <> 'finished' then raise exception 'Match is not finished'; end if;

  if p_voter_id is not null and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = guest_match_id
      and attendee.user_id = p_voter_id
      and attendee.account_user_id is null
  ) then
    raise exception 'Guest attendee required';
  end if;

  poll_is_complete := public.complete_match_motm_if_ready(guest_match_id);

  return query
  select slot.id, slot.venue, to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'), selected_guest.guest_name,
    (select vote.candidate_id
     from public.match_slot_motm_votes as vote
     where vote.match_slot_id = guest_match_id
       and vote.voter_id = p_voter_id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'candidate_id', totals.candidate_id,
        'vote_count', totals.vote_count
      ) order by totals.vote_count desc, totals.candidate_id)
      from (
        select vote.candidate_id, count(*)::integer as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = guest_match_id
        group by vote.candidate_id
      ) as totals
    ), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
     where vote.match_slot_id = guest_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
     where attendee.match_slot_id = guest_match_id),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (
        select vote.candidate_id, count(*) as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = guest_match_id
        group by vote.candidate_id
      ) as totals
      where totals.vote_count = (
        select max(counts.vote_count)
        from (
          select count(*) as vote_count
          from public.match_slot_motm_votes as vote
          where vote.match_slot_id = guest_match_id
          group by vote.candidate_id
        ) as counts
      )
    ), array[]::uuid[]) else array[]::uuid[] end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', attendee.user_id,
        'name', attendee.guest_name
      ) order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = guest_match_id
        and attendee.account_user_id is null
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', attendee.user_id,
        'name', coalesce(attendee.guest_name, membership.display_name),
        'team', case
          when attendee.user_id = any(slot.team_a) then 0
          when attendee.user_id = any(slot.team_b) then 1
          else null
        end
      ) order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      left join public.organization_members as membership
        on membership.organization_id = match_organization_id
       and membership.user_id = attendee.account_user_id
      where attendee.match_slot_id = guest_match_id
    ), '[]'::jsonb)
  from public.match_slots as slot
  left join public.match_slot_attendees as selected_guest
    on selected_guest.match_slot_id = slot.id
   and selected_guest.user_id = p_voter_id
   and selected_guest.account_user_id is null
  where slot.id = guest_match_id;
end;
$$;

create or replace function public.vote_guest_match_motm(
  p_token text,
  p_voter_id uuid,
  p_candidate_id uuid
)
returns table (
  match_id uuid,
  venue text,
  match_date text,
  match_time text,
  guest_name text,
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[],
  guest_voters jsonb,
  candidates jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_match_id uuid;
  poll_is_complete boolean;
begin
  guest_match_id := public.resolve_guest_match_motm_token(p_token);
  if guest_match_id is null then raise exception 'Invalid vote link'; end if;
  if p_voter_id is null then raise exception 'Choose a guest attendee'; end if;

  select poll.is_complete into poll_is_complete
  from public.get_guest_match_motm_vote(p_token, p_voter_id) as poll;
  if poll_is_complete then
    return query select poll.*
      from public.get_guest_match_motm_vote(p_token, p_voter_id) as poll;
    return;
  end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = guest_match_id
      and attendee.user_id = p_candidate_id
  ) then
    raise exception 'Candidate must be a match attendee';
  end if;

  insert into public.match_slot_motm_votes (
    match_slot_id, voter_id, candidate_id
  ) values (guest_match_id, p_voter_id, p_candidate_id)
  on conflict (match_slot_id, voter_id)
  do update set candidate_id = excluded.candidate_id;

  perform public.complete_match_motm_if_ready(guest_match_id);
  return query select poll.*
    from public.get_guest_match_motm_vote(p_token, p_voter_id) as poll;
end;
$$;

revoke all on function public.create_guest_match_motm_vote_link(uuid, text)
  from public;
revoke all on function public.get_guest_match_motm_vote(text, uuid)
  from public;
revoke all on function public.vote_guest_match_motm(text, uuid, uuid)
  from public;
grant execute on function public.create_guest_match_motm_vote_link(uuid, text)
  to authenticated;
grant execute on function public.get_guest_match_motm_vote(text, uuid)
  to anon, authenticated;
grant execute on function public.vote_guest_match_motm(text, uuid, uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';