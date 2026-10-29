create table if not exists public.match_discussion_reads (
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null,
  last_read_message_id uuid not null,
  primary key (match_slot_id, user_id)
);

alter table public.match_discussion_reads enable row level security;
revoke all on table public.match_discussion_reads from anon, authenticated;

create or replace function public.purge_finished_match_discussion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished' and old.status is distinct from new.status then
    delete from public.match_discussion_reads as receipt
    where receipt.match_slot_id = new.id;
    delete from public.match_discussion_messages as message
    where message.match_slot_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.get_unread_match_discussion_count(
  p_organization_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  unread_count integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  select count(distinct slot.id)::integer
  into unread_count
  from public.match_slots as slot
  join public.match_discussion_messages as message
    on message.match_slot_id = slot.id
  left join public.match_discussion_reads as receipt
    on receipt.match_slot_id = slot.id
    and receipt.user_id = auth.uid()
  where slot.organization_id = p_organization_id
    and slot.status <> 'finished'
    and message.author_id <> auth.uid()
    and (
      receipt.user_id is null
      or (message.created_at, message.id) >
        (receipt.last_read_at, receipt.last_read_message_id)
    );

  return coalesce(unread_count, 0);
end;
$$;

create or replace function public.get_match_discussion_messages_with_readers(
  p_match_id uuid
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz,
  readers jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  latest_read_at timestamptz;
  latest_read_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status
  into match_organization_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if match_status = 'finished' then
    raise exception 'Discussion was deleted when the match finished';
  end if;

  select message.created_at, message.id
  into latest_read_at, latest_read_message_id
  from public.match_discussion_messages as message
  where message.match_slot_id = p_match_id
  order by message.created_at desc, message.id desc
  limit 1;

  if latest_read_message_id is not null then
    insert into public.match_discussion_reads (
      match_slot_id,
      user_id,
      last_read_at,
      last_read_message_id
    ) values (
      p_match_id,
      auth.uid(),
      latest_read_at,
      latest_read_message_id
    )
    on conflict (match_slot_id, user_id)
    do update set
      last_read_at = excluded.last_read_at,
      last_read_message_id = excluded.last_read_message_id
    where (excluded.last_read_at, excluded.last_read_message_id) >
      (match_discussion_reads.last_read_at, match_discussion_reads.last_read_message_id);
  end if;

  return query
  select recent.id, recent.author_id,
    coalesce(author.display_name, 'Joueur'), recent.body, recent.created_at,
    coalesce(reader_data.readers, '[]'::jsonb)
  from (
    select message.id, message.author_id, message.body, message.created_at
    from public.match_discussion_messages as message
    where message.match_slot_id = p_match_id
    order by message.created_at desc, message.id desc
    limit 500
  ) as recent
  left join public.organization_members as author
    on author.organization_id = match_organization_id
    and author.user_id = recent.author_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'user_id', receipt.user_id,
        'display_name', reader.display_name
      ) order by reader.display_name
    ) as readers
    from public.match_discussion_reads as receipt
    join public.organization_members as reader
      on reader.organization_id = match_organization_id
      and reader.user_id = receipt.user_id
    where receipt.match_slot_id = p_match_id
      and receipt.user_id <> recent.author_id
      and (receipt.last_read_at, receipt.last_read_message_id) >=
        (recent.created_at, recent.id)
  ) as reader_data on true
  order by recent.created_at, recent.id;
end;
$$;

revoke all on function public.get_unread_match_discussion_count(uuid) from public;
revoke all on function public.get_match_discussion_messages_with_readers(uuid) from public;
grant execute on function public.get_unread_match_discussion_count(uuid) to authenticated;
grant execute on function public.get_match_discussion_messages_with_readers(uuid) to authenticated;

notify pgrst, 'reload schema';