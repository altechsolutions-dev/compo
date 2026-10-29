drop function if exists public.get_match_discussions(uuid);

create function public.get_match_discussions(p_organization_id uuid)
returns table (
  match_id uuid,
  match_date text,
  match_time text,
  venue text,
  status text,
  last_message_body text,
  last_author_name text,
  last_message_at timestamptz,
  has_unread boolean
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
    slot.status,
    latest.body,
    coalesce(author.display_name, 'Joueur'),
    latest.created_at,
    exists (
      select 1
      from public.match_discussion_messages as unread
      left join public.match_discussion_reads as receipt
        on receipt.match_slot_id = slot.id
        and receipt.user_id = auth.uid()
      where unread.match_slot_id = slot.id
        and slot.status <> 'finished'
        and unread.author_id <> auth.uid()
        and (
          receipt.user_id is null
          or (unread.created_at, unread.id) >
            (receipt.last_read_at, receipt.last_read_message_id)
        )
    )
  from public.match_slots as slot
  join lateral (
    select message.body, message.author_id, message.created_at
    from public.match_discussion_messages as message
    where message.match_slot_id = slot.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as latest on true
  left join public.organization_members as author
    on author.organization_id = slot.organization_id
    and author.user_id = latest.author_id
  where slot.organization_id = p_organization_id
  order by latest.created_at desc;
end;
$$;

revoke all on function public.get_match_discussions(uuid) from public;
grant execute on function public.get_match_discussions(uuid) to authenticated;

notify pgrst, 'reload schema';