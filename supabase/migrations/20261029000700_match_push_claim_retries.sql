alter table public.match_chat_push_claims
  add column if not exists endpoint text not null default 'legacy';

alter table public.match_finish_push_claims
  add column if not exists endpoint text not null default 'legacy';

alter table public.match_confirmation_push_claims
  add column if not exists endpoint text not null default 'legacy';

do $$
declare
  claim_table text;
  primary_key_name text;
begin
  foreach claim_table in array array[
    'match_chat_push_claims',
    'match_finish_push_claims',
    'match_confirmation_push_claims'
  ] loop
    select constraint_info.conname
    into primary_key_name
    from pg_constraint as constraint_info
    where constraint_info.conrelid =
      format('public.%I', claim_table)::regclass
      and constraint_info.contype = 'p';

    if primary_key_name is not null then
      execute format(
        'alter table public.%I drop constraint %I',
        claim_table,
        primary_key_name
      );
    end if;

    if claim_table = 'match_chat_push_claims' then
      execute format(
        'alter table public.%I add primary key (message_id, endpoint)',
        claim_table
      );
    else
      execute format(
        'alter table public.%I add primary key (match_id, endpoint)',
        claim_table
      );
    end if;
  end loop;
end;
$$;

create or replace function public.clear_match_confirmation_claims_when_incomplete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_match_id uuid;
begin
  if tg_table_name = 'match_slot_attendees' then
    if tg_op = 'DELETE' then
      target_match_id := old.match_slot_id;
    else
      target_match_id := new.match_slot_id;
    end if;
  else
    target_match_id := new.id;
  end if;

  delete from public.match_confirmation_push_claims as claim
  where claim.match_id = target_match_id
    and exists (
      select 1
      from public.match_slots as slot
      where slot.id = target_match_id
        and slot.status = 'scheduled'
        and (
          select count(*)
          from public.match_slot_attendees as attendee
          where attendee.match_slot_id = slot.id
        ) < slot.max_players
    );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function
  public.clear_match_confirmation_claims_when_incomplete()
  from public, anon, authenticated;

create trigger clear_match_confirmation_claims_on_attendee_change
after insert or delete on public.match_slot_attendees
for each row execute function
  public.clear_match_confirmation_claims_when_incomplete();

create trigger clear_match_confirmation_claims_on_capacity_change
after update of max_players, status on public.match_slots
for each row execute function
  public.clear_match_confirmation_claims_when_incomplete();

notify pgrst, 'reload schema';