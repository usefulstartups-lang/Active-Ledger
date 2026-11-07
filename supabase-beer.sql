-- Run once in Supabase: SQL Editor -> New query -> paste all -> Run

create table if not exists beer_payments (
  id          bigint generated always as identity primary key,
  order_id    text unique not null,
  payment_id  text unique,
  username    text not null,
  tier        text,
  amount      numeric not null,
  status      text not null default 'created',   -- created | paid
  hidden      boolean not null default false,    -- set to true to remove a name from the leaderboard
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);

-- Nobody can read or write this table from the browser. Only our server (service key) can.
alter table beer_payments enable row level security;

-- Public leaderboard: ONLY usernames and totals, never payment ids.
create or replace view beer_leaderboard as
  select (array_agg(username order by paid_at desc))[1] as username,
         sum(amount)  as total,
         count(*)     as contributions,
         max(paid_at) as last_paid
  from beer_payments
  where status = 'paid' and not hidden
  group by lower(username);

grant select on beer_leaderboard to anon, authenticated;
