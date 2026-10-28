create table if not exists public.match_finish_push_claims (
  match_id uuid primary key references public.match_slots (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.match_finish_push_claims enable row level security;
revoke all on table public.match_finish_push_claims from public, anon, authenticated;
grant all on table public.match_finish_push_claims to service_role;

notify pgrst, 'reload schema';