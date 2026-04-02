create table if not exists public.sheets_cache (
  id text primary key default 'main',
  data jsonb not null,
  cached_at timestamptz not null default now()
);

alter table public.sheets_cache enable row level security;

-- Edge functions using service role can read/write
create policy "service role full access" on public.sheets_cache
  to service_role
  using (true)
  with check (true);
