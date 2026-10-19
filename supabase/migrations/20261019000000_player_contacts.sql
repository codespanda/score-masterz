-- Player email addresses, kept out of the public `players` table.
-- `players` is readable by anyone (scorecards show names); contact details are
-- visible only to the account that created the player.

create table player_contacts (
  player_id uuid primary key references players (id) on delete cascade,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

alter table player_contacts enable row level security;

create policy "player owner reads contacts" on player_contacts for select
  using (exists (select 1 from players p where p.id = player_id and p.owner_id = auth.uid()));

create policy "player owner writes contacts" on player_contacts for all
  using (exists (select 1 from players p where p.id = player_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from players p where p.id = player_id and p.owner_id = auth.uid()));

-- One email per player across the app makes it usable for sign-in invites later.
create unique index player_contacts_email_key on player_contacts (lower(email)) where email is not null;
