-- Phase B migration: add the `city` dimension to street_data, scores, and map_plays.
-- Apply in the Supabase SQL editor (Dashboard → SQL editor → New query).
--
-- All existing rows are backfilled to city = 'sofia' via the column defaults,
-- so existing data and old-client calls continue to work unchanged.
-- Run once; re-running is safe (uses IF NOT EXISTS / CREATE OR REPLACE where possible).

-- ── 1. street_data ──────────────────────────────────────────────────────────────
alter table public.street_data
  add column if not exists city text not null default 'sofia';

alter table public.street_data
  drop constraint if exists street_data_pkey;

alter table public.street_data
  add constraint street_data_pkey primary key (city, mode, submode);

-- ── 2. scores ───────────────────────────────────────────────────────────────────
alter table public.scores
  add column if not exists city text not null default 'sofia';

drop index if exists public.scores_user_map_unique;
create unique index scores_user_map_unique
  on public.scores (user_id, city, mode, coalesce(submode, ''));

drop index if exists public.scores_map_idx;
create index scores_map_idx
  on public.scores (city, mode, submode, correct desc, duration_ms asc);

-- ── 3. map_plays ────────────────────────────────────────────────────────────────
alter table public.map_plays
  add column if not exists city text not null default 'sofia';

alter table public.map_plays
  drop constraint if exists map_plays_pkey;

alter table public.map_plays
  add constraint map_plays_pkey primary key (city, mode, submode);

-- ── 4. leaderboard view ─────────────────────────────────────────────────────────
drop view if exists public.leaderboard;

create view public.leaderboard as
with best_per_user as (
  select distinct on (user_id, city, mode, submode)
    s.id,
    s.user_id,
    p.username,
    p.avatar_url,
    s.city,
    s.mode,
    s.submode,
    s.correct,
    s.wrong,
    s.skipped,
    s.total,
    s.duration_ms,
    s.played_at,
    (s.correct - s.skipped) as score
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.user_id, s.city, s.mode, s.submode,
           (s.correct - s.skipped) desc, s.duration_ms asc
)
select *,
  rank() over (
    partition by city, mode, submode
    order by score desc, duration_ms asc
  ) as rank
from best_per_user;

-- ── 5. save_score RPC ───────────────────────────────────────────────────────────
-- p_city defaults to 'sofia' so callers that omit it (old deploys) still work.
create or replace function public.save_score(
  p_user_id     uuid,
  p_mode        text,
  p_submode     text,
  p_correct     smallint,
  p_wrong       smallint,
  p_skipped     smallint,
  p_total       smallint,
  p_duration_ms integer,
  p_city        text default 'sofia'
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_rows integer;
begin
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.scores
    (user_id, city, mode, submode, correct, wrong, skipped, total, duration_ms)
  values
    (p_user_id, p_city, p_mode, p_submode, p_correct, p_wrong, p_skipped, p_total, p_duration_ms)
  on conflict (user_id, city, mode, coalesce(submode, '')) do update
    set correct     = excluded.correct,
        wrong       = excluded.wrong,
        skipped     = excluded.skipped,
        total       = excluded.total,
        duration_ms = excluded.duration_ms,
        played_at   = now()
    where (excluded.correct - excluded.skipped) > (scores.correct - scores.skipped)
       or ((excluded.correct - excluded.skipped) = (scores.correct - scores.skipped)
           and excluded.duration_ms < scores.duration_ms);

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- ── 6. increment_map_plays RPC ──────────────────────────────────────────────────
create or replace function public.increment_map_plays(
  p_mode    text,
  p_submode text,
  p_city    text default 'sofia'
) returns void language sql security definer set search_path = public as $$
  insert into public.map_plays (city, mode, submode, plays)
  values (p_city, p_mode, coalesce(p_submode, ''), 1)
  on conflict (city, mode, submode) do update
    set plays = map_plays.plays + 1;
$$;
