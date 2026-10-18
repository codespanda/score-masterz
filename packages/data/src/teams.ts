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
  playerCount: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  shirtNumber: number | null;
}

interface TeamRow {
  id: string;
  owner_id: string;
  name: string;
  short_code: string;
  color: string;
  home_ground: string | null;
  team_players: { count: number }[];
}

const TEAM_COLUMNS = "id, owner_id, name, short_code, color, home_ground, team_players(count)";

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    shortCode: row.short_code,
    color: row.color,
    homeGround: row.home_ground,
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

interface SquadRow {
  shirt_number: number | null;
  players: { id: string; name: string; role: PlayerRole } | null;
}

export async function listPlayers(client: SupabaseClient, teamId: string): Promise<Player[]> {
  const rows = check(
    await client
      .from("team_players")
      .select("shirt_number, players(id, name, role)")
      .eq("team_id", teamId),
    "Loading players",
  ) as unknown as SquadRow[]; // many-to-one embed: an object at runtime
  return rows
    .filter((r) => r.players)
    .map((r) => ({ id: r.players!.id, name: r.players!.name, role: r.players!.role, shirtNumber: r.shirt_number }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addPlayer(
  client: SupabaseClient,
  teamId: string,
  input: { name: string; role: PlayerRole; shirtNumber?: number },
): Promise<Player> {
  const name = input.name.trim();
  if (!name) throw new Error("Player name is required.");
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
  return { ...player, shirtNumber: input.shirtNumber ?? null };
}
