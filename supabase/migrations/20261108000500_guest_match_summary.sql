create or replace function public.get_guest_match_summary(p_token text)
returns table (elapsed_seconds integer, goals jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    slot.elapsed_seconds,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id,
        'scorer_id', goal.scorer_id,
        'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds,
        'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal
      where goal.match_slot_id = slot.id
    ), '[]'::jsonb)
  from public.match_slots as slot
  where slot.id = public.resolve_guest_match_motm_token(p_token)
    and slot.status = 'finished'
$$;

revoke all on function public.get_guest_match_summary(text) from public;
grant execute on function public.get_guest_match_summary(text) to anon, authenticated;

notify pgrst, 'reload schema';