create or replace function public.remove_departed_member_from_match_signups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.match_slot_attendees as attendee
  using public.match_slots as slot
  where attendee.match_slot_id = slot.id
    and slot.organization_id = old.organization_id
    and slot.status = 'scheduled'
    and attendee.user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists organization_members_remove_scheduled_signups_after_delete
  on public.organization_members;

create trigger organization_members_remove_scheduled_signups_after_delete
  after delete on public.organization_members
  for each row execute function public.remove_departed_member_from_match_signups();

revoke all on function public.remove_departed_member_from_match_signups() from public;

notify pgrst, 'reload schema';