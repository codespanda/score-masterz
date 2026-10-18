-- Score Masterz: initial schema.
-- Every score is derived from `balls` (one row per delivery); nothing else stores totals
-- except `matches.result`, written once when a match is completed.

create type player_role as enum ('batter', 'bowler', 'all_rounder', 'wicket_keeper');
create type match_status as enum ('scheduled', 'toss', 'live', 'innings_break', 'completed', 'abandoned');
create type toss_decision as enum ('bat', 'bowl');
create type extra_type as enum ('wide', 'noball', 'bye', 'legbye', 'penalty');
create type wicket_kind as enum ('bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'retired');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null check (char_length(name) between 2 and 60),
  short_code text not null check (char_length(short_code) between 1 and 3),
  color text not null default '#1F6F4E' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  home_ground text,
  captain_player_id uuid,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null check (char_length(name) between 1 and 80),
  role player_role not null default 'batter',
  batting_hand text check (batting_hand in ('right', 'left')),
  bowling_style text,
  created_at timestamptz not null default now()
);

alter table teams
  add constraint teams_captain_fk foreign key (captain_player_id) references players (id) on delete set null;

create table team_players (
  team_id uuid not null references teams (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  shirt_number smallint check (shirt_number between 0 and 999),
  primary key (team_id, player_id)
);

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  overs_per_innings smallint not null default 20 check (overs_per_innings between 1 and 50),
  starts_on date,
  ends_on date,
  points_win smallint not null default 2,
  points_tie smallint not null default 1,
  points_no_result smallint not null default 1,
  created_at timestamptz not null default now()
);

create table tournament_teams (
  tournament_id uuid not null references tournaments (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  primary key (tournament_id, team_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  tournament_id uuid references tournaments (id) on delete set null,
  team_a_id uuid not null references teams (id),
  team_b_id uuid not null references teams (id),
  venue text,
  scheduled_at timestamptz,
  status match_status not null default 'scheduled',
  -- MatchRules from @score-masterz/scoring (overs, balls per over, free hit, ...).
  rules jsonb not null default '{"oversPerInnings":20,"ballsPerOver":6,"wicketsPerInnings":10,"wideNoBallPenalty":1,"freeHitOnNoBall":true,"maxOversPerBowler":4}',
  toss_winner_id uuid references teams (id),
  toss_decision toss_decision,
  result jsonb,
  created_at timestamptz not null default now(),
  check (team_a_id <> team_b_id)
);

create table match_players (
  match_id uuid not null references matches (id) on delete cascade,
  team_id uuid not null references teams (id),
  player_id uuid not null references players (id),
  primary key (match_id, player_id)
);

-- People allowed to score a match besides its owner.
create table match_scorers (
  match_id uuid not null references matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (match_id, user_id)
);

create table innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  number smallint not null check (number between 1 and 4),
  batting_team_id uuid not null references teams (id),
  bowling_team_id uuid not null references teams (id),
  created_at timestamptz not null default now(),
  unique (match_id, number)
);

create table balls (
  -- Generated on the device so offline-recorded balls sync without clashes.
  id uuid primary key,
  innings_id uuid not null references innings (id) on delete cascade,
  seq integer not null check (seq >= 0),
  striker_id uuid not null references players (id),
  non_striker_id uuid not null references players (id),
  bowler_id uuid not null references players (id),
  runs smallint not null default 0 check (runs between 0 and 8),
  extra_type extra_type,
  extra_runs smallint not null default 0 check (extra_runs between 0 and 10),
  wicket_kind wicket_kind,
  player_out_id uuid references players (id),
  fielder_id uuid references players (id),
  new_batter_id uuid references players (id),
  recorded_by uuid default auth.uid() references auth.users (id),
  recorded_at timestamptz not null default now(),
  unique (innings_id, seq),
  check ((extra_type is null) = (extra_runs = 0) or extra_type = 'penalty'),
  check ((wicket_kind is null) = (player_out_id is null))
);

create index balls_innings_seq_idx on balls (innings_id, seq);
create index matches_status_idx on matches (status);
create index matches_tournament_idx on matches (tournament_id);

-- ---------------------------------------------------------------------------
-- Access: anyone can read scores; only owners (and named scorers) can write.
-- ---------------------------------------------------------------------------

create function can_score(p_match_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches m where m.id = p_match_id and m.owner_id = auth.uid())
      or exists (select 1 from match_scorers s where s.match_id = p_match_id and s.user_id = auth.uid());
$$;

alter table profiles enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table team_players enable row level security;
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table match_scorers enable row level security;
alter table innings enable row level security;
alter table balls enable row level security;

create policy "profiles readable" on profiles for select using (true);
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "teams readable" on teams for select using (true);
create policy "teams owner writes" on teams for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "players readable" on players for select using (true);
create policy "players owner writes" on players for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "team_players readable" on team_players for select using (true);
create policy "team_players team owner writes" on team_players for all
  using (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

create policy "tournaments readable" on tournaments for select using (true);
create policy "tournaments owner writes" on tournaments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "tournament_teams readable" on tournament_teams for select using (true);
create policy "tournament_teams owner writes" on tournament_teams for all
  using (exists (select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()));

create policy "matches readable" on matches for select using (true);
create policy "matches owner inserts" on matches for insert with check (owner_id = auth.uid());
create policy "matches scorers update" on matches for update using (can_score(id)) with check (can_score(id));
create policy "matches owner deletes" on matches for delete using (owner_id = auth.uid());

create policy "match_players readable" on match_players for select using (true);
create policy "match_players scorers write" on match_players for all using (can_score(match_id)) with check (can_score(match_id));

create policy "match_scorers readable" on match_scorers for select using (true);
create policy "match_scorers owner writes" on match_scorers for all
  using (exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from matches m where m.id = match_id and m.owner_id = auth.uid()));

create policy "innings readable" on innings for select using (true);
create policy "innings scorers write" on innings for all using (can_score(match_id)) with check (can_score(match_id));

create policy "balls readable" on balls for select using (true);
create policy "balls scorers write" on balls for all
  using (exists (select 1 from innings i where i.id = innings_id and can_score(i.match_id)))
  with check (exists (select 1 from innings i where i.id = innings_id and can_score(i.match_id)));

-- Create a profile row when someone signs up.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Live scores: push new balls and match status changes to subscribers.
alter publication supabase_realtime add table balls, matches;
