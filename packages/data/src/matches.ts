import { T20_RULES, type MatchRules } from "@score-masterz/scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

import { check } from "./auth";

export interface LiveMatch {
  matchId: string;
  inningsId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  rules: MatchRules;
}

interface InningsRow {
  id: string;
  match_id: string;
  batting_team_id: string;
  bowling_team_id: string;
  matches: { rules: MatchRules; status: string; owner_id: string } | null;
}

/** The signed-in user's most recent live match, if any. */
export async function findLiveMatch(client: SupabaseClient, userId: string): Promise<LiveMatch | null> {
  const rows = check(
    await client
      .from("innings")
      .select("id, match_id, batting_team_id, bowling_team_id, matches!inner(rules, status, owner_id)")
      .eq("matches.owner_id", userId)
      .eq("matches.status", "live")
      .order("created_at", { ascending: false })
      .limit(1),
    "Loading live match",
  ) as unknown as InningsRow[]; // many-to-one embed: an object at runtime
  const row = rows[0];
  if (!row?.matches) return null;
  return {
    matchId: row.match_id,
    inningsId: row.id,
    battingTeamId: row.batting_team_id,
    bowlingTeamId: row.bowling_team_id,
    rules: { ...T20_RULES, ...row.matches.rules },
  };
}

/** Creates a live match and its first innings. */
export async function startMatch(
  client: SupabaseClient,
  input: { battingTeamId: string; bowlingTeamId: string; rules?: MatchRules; venue?: string },
): Promise<LiveMatch> {
  if (input.battingTeamId === input.bowlingTeamId) throw new Error("Pick two different teams.");
  const rules = input.rules ?? T20_RULES;
  const match = check(
    await client
      .from("matches")
      .insert({
        team_a_id: input.battingTeamId,
        team_b_id: input.bowlingTeamId,
        status: "live",
        rules,
        venue: input.venue ?? null,
        scheduled_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
    "Creating match",
  ) as { id: string };
  const innings = check(
    await client
      .from("innings")
      .insert({
        match_id: match.id,
        number: 1,
        batting_team_id: input.battingTeamId,
        bowling_team_id: input.bowlingTeamId,
      })
      .select("id")
      .single(),
    "Starting innings",
  ) as { id: string };
  return { matchId: match.id, inningsId: innings.id, ...input, rules };
}

export async function endMatch(client: SupabaseClient, matchId: string): Promise<void> {
  check(await client.from("matches").update({ status: "completed" }).eq("id", matchId), "Ending match");
}
