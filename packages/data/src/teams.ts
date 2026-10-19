import type { SupabaseClient } from "@supabase/supabase-js";

import { check } from "./auth";

export type PlayerRole = "batter" | "bowler" | "all_rounder" | "wicket_keeper";

export const PLAYER_ROLES: { value: PlayerRole; label: string }[] = [
  { value: "batter", label: "Batter" },
  { value: "bowler", label: "Bowler" },
  { value: "all_rounder", label: "All-rounder" },
  { value: "wicket_keeper", label: "Wicket-keeper" },
];

export interface Team {
  id: string;
  ownerId: string;
  name: string;
  shortCode: string;
  color: string;
  homeGround: string | null;
  /** Public URL of the team logo, if one has been uploaded. */
  logoUrl: string | null;
  playerCount: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  shirtNumber: number | null;
  /** Only filled in for players the signed-in account created; null when none is saved. */
  email?: string | null;
}

interface TeamRow {
  id: string;
  owner_id: string;
  name: string;
  short_code: string;
  color: string;
  home_ground: string | null;
  logo_url: string | null;
  team_players: { count: number }[];
}

const TEAM_COLUMNS = "id, owner_id, name, short_code, color, home_ground, logo_url, team_players(count)";

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    shortCode: row.short_code,
    color: row.color,
    homeGround: row.home_ground,
    logoUrl: row.logo_url,
    playerCount: row.team_players[0]?.count ?? 0,
  };
}

export async function listTeams(client: SupabaseClient): Promise<Team[]> {
  const rows = check(await client.from("teams").select(TEAM_COLUMNS).order("name"), "Loading teams") as TeamRow[];
  return rows.map(toTeam);
}

export interface NewTeam {
  name: string;
  shortCode?: string;
  color: string;
  homeGround?: string;
}

/** Initials of the first two words, e.g. "Riverside XI" → "RX". */
export function defaultShortCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export async function createTeam(client: SupabaseClient, input: NewTeam): Promise<Team> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Team name needs at least 2 characters.");
  const row = check(
    await client
      .from("teams")
      .insert({
        name,
        short_code: (input.shortCode?.trim() || defaultShortCode(name)).toUpperCase().slice(0, 3),
        color: input.color,
        home_ground: input.homeGround?.trim() || null,
      })
      .select(TEAM_COLUMNS)
      .single(),
    "Creating team",
  ) as TeamRow;
  return toTeam(row);
}

export type TeamChanges = Partial<Pick<NewTeam, "name" | "shortCode" | "color" | "homeGround">>;

export async function updateTeam(client: SupabaseClient, teamId: string, changes: TeamChanges): Promise<Team> {
  const patch: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (name.length < 2) throw new Error("Team name needs at least 2 characters.");
    patch.name = name;
  }
  if (changes.shortCode !== undefined) {
    const code = changes.shortCode.trim().toUpperCase().slice(0, 3);
    if (!code) throw new Error("Short code can't be empty.");
    patch.short_code = code;
  }
  if (changes.color !== undefined) patch.color = changes.color;
  if (changes.homeGround !== undefined) patch.home_ground = changes.homeGround.trim() || null;
  const row = check(
    await client.from("teams").update(patch).eq("id", teamId).select(TEAM_COLUMNS).maybeSingle(),
    "Updating team",
  ) as TeamRow | null;
  // Row-level security turns someone else's team into "no rows updated".
  if (!row) throw new Error("Only the team's creator can edit it.");
  return toTeam(row);
}

/** Lower-cased email, or null for blank. Throws on an invalid address. */
export function normaliseEmail(input: string | null | undefined): string | null {
  const email = (input ?? "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`"${input}" isn't a valid email address.`);
  return email;
}

interface SquadRow {
  shirt_number: number | null;
  players: { id: string; name: string; role: PlayerRole } | null;
}

/** Emails for the given players that this account may see (its own players), by player id. */
async function loadEmails(client: SupabaseClient, playerIds: string[]): Promise<Record<string, string | null>> {
  if (playerIds.length === 0) return {};
  const res = await client.from("player_contacts").select("player_id, email").in("player_id", playerIds);
  // Before the player_contacts migration has been run, carry on without emails.
  if (res.error?.code === "PGRST205") return {};
  const rows = check(res, "Loading player emails") as { player_id: string; email: string | null }[];
  return Object.fromEntries(rows.map((r) => [r.player_id, r.email]));
}

export async function listPlayers(client: SupabaseClient, teamId: string): Promise<Player[]> {
  const rows = check(
    await client
      .from("team_players")
      .select("shirt_number, players(id, name, role)")
      .eq("team_id", teamId),
    "Loading players",
  ) as unknown as SquadRow[]; // many-to-one embed: an object at runtime
  const players = rows
    .filter((r) => r.players)
    .map((r) => ({ id: r.players!.id, name: r.players!.name, role: r.players!.role, shirtNumber: r.shirt_number }));
  const emails = await loadEmails(client, players.map((p) => p.id));
  return players
    .map((p) => (p.id in emails ? { ...p, email: emails[p.id] } : p))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function friendlyEmailError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (/duplicate key|player_contacts_email_key/.test(msg)) throw new Error("That email is already used by another player.");
  if (/player_contacts/.test(msg) && /schema cache|does not exist/.test(msg)) {
    throw new Error("Player emails need the player_contacts migration. Run it in the Supabase SQL editor.");
  }
  throw e;
}

async function saveEmail(client: SupabaseClient, playerId: string, email: string | null): Promise<void> {
  try {
    check(
      await client.from("player_contacts").upsert({ player_id: playerId, email, updated_at: new Date().toISOString() }),
      "Saving email",
    );
  } catch (e) {
    // Clearing an email before the player_contacts migration exists is a no-op, not an error.
    if (email === null && /schema cache|does not exist/.test(e instanceof Error ? e.message : "")) return;
    friendlyEmailError(e);
  }
}

export interface PlayerInput {
  name: string;
  role: PlayerRole;
  shirtNumber?: number | null;
  email?: string | null;
}

export async function addPlayer(client: SupabaseClient, teamId: string, input: PlayerInput): Promise<Player> {
  const name = input.name.trim();
  if (!name) throw new Error("Player name is required.");
  const email = normaliseEmail(input.email); // validate before creating anything
  const player = check(
    await client.from("players").insert({ name, role: input.role }).select("id, name, role").single(),
    "Adding player",
  ) as { id: string; name: string; role: PlayerRole };
  check(
    await client
      .from("team_players")
      .insert({ team_id: teamId, player_id: player.id, shirt_number: input.shirtNumber ?? null }),
    "Adding player to team",
  );
  if (email) await saveEmail(client, player.id, email);
  return { ...player, shirtNumber: input.shirtNumber ?? null, email };
}

export async function updatePlayer(
  client: SupabaseClient,
  teamId: string,
  playerId: string,
  input: PlayerInput,
): Promise<Player> {
  const name = input.name.trim();
  if (!name) throw new Error("Player name is required.");
  const email = input.email === undefined ? undefined : normaliseEmail(input.email);
  const player = check(
    await client.from("players").update({ name, role: input.role }).eq("id", playerId).select("id, name, role").maybeSingle(),
    "Updating player",
  ) as { id: string; name: string; role: PlayerRole } | null;
  if (!player) throw new Error("Only the account that added this player can edit them.");
  if (input.shirtNumber !== undefined) {
    check(
      await client
        .from("team_players")
        .update({ shirt_number: input.shirtNumber })
        .eq("team_id", teamId)
        .eq("player_id", playerId),
      "Updating shirt number",
    );
  }
  if (email !== undefined) await saveEmail(client, playerId, email);
  return { ...player, shirtNumber: input.shirtNumber ?? null, ...(email !== undefined ? { email } : {}) };
}
