import type { BallEvent, ExtraType, WicketKind } from "@score-masterz/scoring";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { check } from "./auth";

export interface BallRow {
  id: string;
  innings_id: string;
  seq: number;
  striker_id: string;
  non_striker_id: string;
  bowler_id: string;
  runs: number;
  extra_type: ExtraType | null;
  extra_runs: number;
  wicket_kind: WicketKind | null;
  player_out_id: string | null;
  fielder_id: string | null;
  new_batter_id: string | null;
}

export function toBallRow(ball: BallEvent, inningsId: string, seq: number): BallRow {
  return {
    id: ball.id,
    innings_id: inningsId,
    seq,
    striker_id: ball.strikerId,
    non_striker_id: ball.nonStrikerId,
    bowler_id: ball.bowlerId,
    runs: ball.runs,
    extra_type: ball.extra?.type ?? null,
    extra_runs: ball.extra?.runs ?? 0,
    wicket_kind: ball.wicket?.kind ?? null,
    player_out_id: ball.wicket?.playerOutId ?? null,
    fielder_id: ball.wicket?.fielderId ?? null,
    new_batter_id: ball.newBatterId ?? null,
  };
}

export function fromBallRow(row: BallRow): BallEvent {
  return {
    id: row.id,
    strikerId: row.striker_id,
    nonStrikerId: row.non_striker_id,
    bowlerId: row.bowler_id,
    runs: row.runs,
    extra: row.extra_type ? { type: row.extra_type, runs: row.extra_runs } : undefined,
    wicket:
      row.wicket_kind && row.player_out_id
        ? { kind: row.wicket_kind, playerOutId: row.player_out_id, fielderId: row.fielder_id ?? undefined }
        : undefined,
    newBatterId: row.new_batter_id ?? undefined,
  };
}

/** All deliveries of an innings, in the order they were bowled. */
export async function loadBalls(client: SupabaseClient, inningsId: string): Promise<BallEvent[]> {
  const rows = check(
    await client.from("balls").select("*").eq("innings_id", inningsId).order("seq"),
    "Loading balls",
  ) as BallRow[];
  return rows.map(fromBallRow);
}

/** Saves one delivery. `seq` is its position in the innings (0-based). Safe to retry: the id is fixed. */
export async function saveBall(client: SupabaseClient, inningsId: string, seq: number, ball: BallEvent): Promise<void> {
  check(await client.from("balls").upsert(toBallRow(ball, inningsId, seq)), "Saving ball");
}

/** Undo: removes a delivery. */
export async function deleteBall(client: SupabaseClient, ballId: string): Promise<void> {
  check(await client.from("balls").delete().eq("id", ballId), "Undoing ball");
}

/** All deliveries for several innings at once, grouped by innings id. */
export async function loadBallsForInnings(
  client: SupabaseClient,
  inningsIds: string[],
): Promise<Record<string, BallEvent[]>> {
  const grouped: Record<string, BallEvent[]> = Object.fromEntries(inningsIds.map((id) => [id, []]));
  if (inningsIds.length === 0) return grouped;
  const rows = check(
    await client.from("balls").select("*").in("innings_id", inningsIds).order("seq"),
    "Loading balls",
  ) as BallRow[];
  for (const row of rows) grouped[row.innings_id]?.push(fromBallRow(row));
  return grouped;
}

/**
 * Calls `onChange` when balls in any of the innings are added, changed or removed,
 * and `onStatus` with the channel's connection state.
 * Supabase cannot filter DELETE events by column, so deletes (undo) are taken unfiltered.
 */
export function subscribeToBalls(
  client: SupabaseClient,
  inningsIds: string[],
  onChange: () => void,
  onStatus?: (status: string) => void,
): RealtimeChannel {
  const filter = `innings_id=in.(${inningsIds.join(",")})`;
  return client
    .channel(`balls:${inningsIds.join(",")}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "balls", filter }, onChange)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "balls", filter }, onChange)
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "balls" }, onChange)
    .subscribe((status) => onStatus?.(status));
}

/** Calls `onChange` when a match row changes (status, result). */
export function subscribeToMatch(client: SupabaseClient, matchId: string, onChange: () => void): RealtimeChannel {
  return client
    .channel(`match:${matchId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, onChange)
    .subscribe();
}
