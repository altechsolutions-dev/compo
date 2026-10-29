create or replace function public.purge_finished_match_discussion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished' and old.status is distinct from new.status then
    delete from public.match_discussion_messages as message
    where message.match_slot_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.purge_finished_match_discussion() from public;

drop trigger if exists match_slots_purge_discussion_on_finish
  on public.match_slots;
create trigger match_slots_purge_discussion_on_finish
after update of status on public.match_slots
for each row
when (old.status is distinct from new.status and new.status = 'finished')
execute function public.purge_finished_match_discussion();

create or replace function public.get_match_discussion_messages(p_match_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
begin
  select slot.organization_id, slot.status
  into match_organization_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if match_status = 'finished' then
    raise exception 'Discussion was deleted when the match finished';
  end if;

  return query
  select recent.id, recent.author_id,
    coalesce(author.display_name, 'Joueur'), recent.body, recent.created_at
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
  order by recent.created_at, recent.id;
end;
$$;

revoke all on function public.get_match_discussion_messages(uuid) from public;
grant execute on function public.get_match_discussion_messages(uuid) to authenticated;

notify pgrst, 'reload schema';