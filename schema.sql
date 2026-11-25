-- ============================================================================
-- Useful Startups: complete Supabase schema.
-- Run once: Supabase -> SQL Editor -> New query -> paste ALL -> Run.
-- Safe to re-run any time: every statement is idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SHEET DATA  (Google Sheet = control panel, this table = the live database)
--    Every tab of the Sheet is stored here as rows of JSON, keyed by the
--    column headers you type in the Sheet. Add a column in the Sheet and it
--    shows up here automatically: no migration needed.
--    Only the sync script (service_role key) can write. The website can only read.
-- ---------------------------------------------------------------------------
create table if not exists sheet_data (
  tab     text    not null,             -- ledger | founders | settings | nav | pages | team | highlights | unlisted
  row_num integer not null,             -- order of the row in the Sheet
  data    jsonb   not null,             -- {"Startup Name": "...", "Sector": "...", ...}
  primary key (tab, row_num)
);

alter table sheet_data enable row level security;
drop policy if exists "public read sheet_data" on sheet_data;
create policy "public read sheet_data" on sheet_data for select using (true);

-- Replaces ONE tab atomically (a visitor never sees a half-synced tab).
create or replace function replace_tab(p_tab text, p_rows jsonb)
returns integer
language plpgsql
as $$
declare n integer;
begin
  delete from sheet_data where tab = p_tab;
  insert into sheet_data (tab, row_num, data)
    select p_tab, (t.ord - 1)::integer, t.val
    from jsonb_array_elements(p_rows) with ordinality as t(val, ord);
  get diagnostics n = row_count;
  return n;
end $$;

-- Lock the function down: ONLY the sync script (service_role) may call it.
revoke all on function replace_tab(text, jsonb) from public, anon, authenticated;
grant execute on function replace_tab(text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 2. NEWS  (filled hourly by scripts/fetch-news.js through GitHub Actions)
-- ---------------------------------------------------------------------------
create table if not exists articles (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  link         text not null unique,
  source       text not null,
  summary      text,
  image_url    text,
  published_at timestamptz not null,
  created_at   timestamptz default now()
);
-- Columns the news page and the fetcher rely on:
alter table articles add column if not exists category     text not null default 'general';  -- general | startup
alter table articles add column if not exists startup_name text;
create index if not exists articles_cat_pub_idx on articles (category, published_at desc);
create index if not exists articles_startup_idx on articles (startup_name);

create table if not exists likes (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique (article_id, visitor_id)
);

create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  article_id   uuid references articles(id) on delete cascade,
  visitor_id   text not null,
  display_name text not null,
  body         text not null,
  created_at   timestamptz default now()
);

alter table articles enable row level security;
alter table likes    enable row level security;
alter table comments enable row level security;

drop policy if exists "public read articles"  on articles;
drop policy if exists "public read likes"     on likes;
drop policy if exists "public read comments"  on comments;
drop policy if exists "public insert likes"   on likes;
drop policy if exists "public delete own like" on likes;
drop policy if exists "public insert comments" on comments;

create policy "public read articles"  on articles for select using (true);
create policy "public read likes"     on likes    for select using (true);
create policy "public read comments"  on comments for select using (true);
create policy "public insert likes"   on likes    for insert with check (true);
create policy "public delete own like" on likes   for delete using (true);
create policy "public insert comments" on comments for insert with check (
  char_length(body) > 0 and char_length(body) < 1000
  and char_length(display_name) > 0 and char_length(display_name) < 60
);

-- ---------------------------------------------------------------------------
-- 3. BUY ME A COFFEE  (written only by the Cloudflare functions in functions/api/coffee, service_role key)
-- ---------------------------------------------------------------------------
create table if not exists coffee_payments (
  id         bigint generated always as identity primary key,
  order_id   text unique not null,
  payment_id text unique,
  username   text not null,
  tier       text,
  site       text not null default 'useful',
  amount     numeric not null,
  status     text not null default 'created',     -- created | paid
  hidden     boolean not null default false,      -- set true to remove a name from the leaderboard
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);

-- Nobody can read or write this table from the browser.
alter table coffee_payments enable row level security;

-- Public leaderboard: ONLY usernames and totals, never payment ids.
create or replace view coffee_leaderboard as
  select (array_agg(username order by paid_at desc))[1] as username,
         sum(amount)  as total,
         count(*)     as contributions,
         max(paid_at) as last_paid
  from coffee_payments
  where status = 'paid' and not hidden and site = 'useful'
  group by lower(username);

grant select on coffee_leaderboard to anon, authenticated;
