import { T20_RULES, type MatchRules } from "@score-masterz/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

import { check } from "./auth";

export type MatchStatus = "scheduled" | "toss" | "live" | "innings_break" | "completed" | "abandoned";

export interface TeamRef {
  id: string;
  name: string;
  shortCode: string;
  color: string;
}

export interface InningsRef {
  id: string;
  number: number;
  battingTeamId: string;
  bowlingTeamId: string;
}

export interface MatchSummary {
  id: string;
  status: MatchStatus;
  venue: string | null;
  scheduledAt: string | null;
  rules: MatchRules;
  teamA: TeamRef;
  teamB: TeamRef;
  innings: InningsRef[];
}

export interface MatchDetail extends MatchSummary {
  /** Player id → name, for both squads. */
  playerNames: Record<string, string>;
}

interface TeamRow {
  id: string;
  name: string;
  short_code: string;
  color: string;
}

interface MatchRow {
  id: string;
  status: MatchStatus;
  venue: string | null;
  scheduled_at: string | null;
  rules: Partial<MatchRules> | null;
  team_a: TeamRow | null;
  team_b: TeamRow | null;
  innings: { id: string; number: number; batting_team_id: string; bowling_team_id: string }[];
}

const MATCH_COLUMNS =
  "id, status, venue, scheduled_at, rules, " +
  "team_a:teams!matches_team_a_id_fkey(id, name, short_code, color), " +
  "team_b:teams!matches_team_b_id_fkey(id, name, short_code, color), " +
  "innings(id, number, batting_team_id, bowling_team_id)";

const toTeam = (t: TeamRow): TeamRef => ({ id: t.id, name: t.name, shortCode: t.short_code, color: t.color });

function toSummary(row: MatchRow): MatchSummary {
  if (!row.team_a || !row.team_b) throw new Error("Match is missing a team.");
  return {
    id: row.id,
    status: row.status,
    venue: row.venue,
    scheduledAt: row.scheduled_at,
    rules: { ...T20_RULES, ...row.rules },
    teamA: toTeam(row.team_a),
    teamB: toTeam(row.team_b),
    innings: row.innings
      .map((i) => ({ id: i.id, number: i.number, battingTeamId: i.batting_team_id, bowlingTeamId: i.bowling_team_id }))
      .sort((a, b) => a.number - b.number),
  };
}

/** Matches being scored right now, newest first. Readable by anyone. */
export async function listLiveMatches(client: SupabaseClient): Promise<MatchSummary[]> {
  const rows = check(
    await client.from("matches").select(MATCH_COLUMNS).eq("status", "live").order("created_at", { ascending: false }),
    "Loading live matches",
  ) as unknown as MatchRow[]; // to-one embeds are objects at runtime
  return rows.map(toSummary);
}

export async function getMatch(client: SupabaseClient, matchId: string): Promise<MatchDetail | null> {
  const row = check(
    await client.from("matches").select(MATCH_COLUMNS).eq("id", matchId).maybeSingle(),
    "Loading match",
  ) as unknown as MatchRow | null;
  if (!row) return null;
  const summary = toSummary(row);

  const squads = check(
    await client
      .from("team_players")
      .select("players(id, name)")
      .in("team_id", [summary.teamA.id, summary.teamB.id]),
    "Loading squads",
  ) as unknown as { players: { id: string; name: string } | null }[];
  const playerNames: Record<string, string> = {};
  for (const s of squads) if (s.players) playerNames[s.players.id] = s.players.name;

  return { ...summary, playerNames };
}
