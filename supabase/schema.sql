-- Canonical schema (post-migration). Run this only on a fresh database.
-- For applying to an existing database, use supabase/migrations/0001_add_city.sql instead.

-- Profiles table (one per auth user)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null check (char_length(username) between 1 and 64),
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Scores table (one row per completed game)
create table public.scores (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  city        text not null default 'sofia',
  mode        text not null check (mode in ('easy', 'normal', 'hard', 'district', 'neighbourhood')),
  submode     text check (submode is null or char_length(submode) <= 100),
  correct     smallint not null check (correct >= 0),
  wrong       smallint not null default 0 check (wrong >= 0),
  skipped     smallint not null default 0 check (skipped >= 0),
  total       smallint not null check (total > 0 and correct <= total),
  duration_ms integer not null check (duration_ms > 0),
  played_at   timestamptz default now() not null
);

create index scores_map_idx     on public.scores (city, mode, submode, correct desc, duration_ms asc);
create index scores_user_id_idx on public.scores (user_id);
create unique index scores_user_map_unique
  on public.scores (user_id, city, mode, coalesce(submode, ''));

-- Leaderboard view: personal best per user per map
-- score = correct - skipped; time is tiebreaker only
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

-- Map play counter (one row per city+mode+submode, incremented on every game end)
-- submode is '' for main modes (easy/normal/hard), district/neighbourhood name otherwise
create table public.map_plays (
  city    text not null default 'sofia',
  mode    text not null,
  submode text not null default '',
  plays   bigint not null default 1,
  primary key (city, mode, submode)
);

-- Atomically upsert a score — only replaces existing if the new result is a personal best.
-- Returns true if the score was saved (new or improved), false if the existing best is better.
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

-- Row-Level Security
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete using (auth.uid() = id);

create policy "Scores are publicly readable"
  on public.scores for select using (true);

create policy "Authenticated users can insert their own scores"
  on public.scores for insert with check (auth.uid() = user_id);

create policy "Users can delete their own scores"
  on public.scores for delete using (auth.uid() = user_id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'preferred_username', split_part(new.email, '@', 1)), 64),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Street data table (populated by scripts/refresh-streets.ts, read by API)
-- submode is '' for main city, district/neighbourhood name otherwise
create table public.street_data (
  city         text        not null default 'sofia',
  mode         text        not null,
  submode      text        not null default '',
  data         jsonb       not null,
  street_count integer,
  updated_at   timestamptz not null default now(),
  constraint street_data_pkey primary key (city, mode, submode)
);

alter table public.map_plays    enable row level security;
alter table public.street_data  enable row level security;

create policy "Map plays are publicly readable"
  on public.map_plays for select using (true);

create policy "Street data is publicly readable"
  on public.street_data for select using (true);
