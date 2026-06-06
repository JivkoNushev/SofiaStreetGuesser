-- Run this in the Supabase SQL editor to set up the database.

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
  mode        text not null check (mode in ('easy', 'normal', 'hard', 'district', 'neighbourhood')),
  submode     text check (submode is null or char_length(submode) <= 100),
  correct     smallint not null check (correct >= 0),
  wrong       smallint not null default 0 check (wrong >= 0),
  skipped     smallint not null default 0 check (skipped >= 0),
  total       smallint not null check (total > 0 and correct <= total),
  duration_ms integer not null check (duration_ms > 0),
  played_at   timestamptz default now() not null
);

create index scores_map_idx     on public.scores (mode, submode, correct desc, duration_ms asc);
create index scores_user_id_idx on public.scores (user_id);

-- Leaderboard view: personal best per user per map
-- score = correct - skipped; time is tiebreaker only
create view public.leaderboard as
select distinct on (user_id, mode, submode)
  s.id,
  s.user_id,
  p.username,
  p.avatar_url,
  s.mode,
  s.submode,
  s.correct,
  s.wrong,
  s.skipped,
  s.total,
  s.duration_ms,
  s.played_at,
  (s.correct - s.skipped) as score,
  rank() over (
    partition by s.mode, s.submode
    order by (s.correct - s.skipped) desc, s.duration_ms asc
  ) as rank
from public.scores s
join public.profiles p on p.id = s.user_id
order by s.user_id, s.mode, s.submode, (s.correct - s.skipped) desc, s.duration_ms asc;

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
  mode         text        not null,
  submode      text        not null default '',
  data         jsonb       not null,
  street_count integer,
  updated_at   timestamptz not null default now(),
  constraint street_data_pkey primary key (mode, submode)
);

alter table public.street_data enable row level security;

create policy "Street data is publicly readable"
  on public.street_data for select using (true);
