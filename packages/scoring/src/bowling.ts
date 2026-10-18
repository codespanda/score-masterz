import { isLegalDelivery } from "./innings";
import type { BallEvent, MatchRules, PlayerId } from "./types";

export interface BowlingState {
  /** Bowler of the over in progress; undefined when a new over is due (or before the first ball). */
  currentBowlerId?: PlayerId;
  /** True when the scorer must pick a bowler before the next delivery. */
  needsBowler: boolean;
  /** Who bowled the last completed over — they may not bowl the next one. */
  previousOverBowlerId?: PlayerId;
  /** Legal balls bowled by each bowler so far. */
  legalBallsByBowler: Record<PlayerId, number>;
}

/** Works out whose over it is and who has bowled how much, from the deliveries so far. */
export function bowlingState(balls: readonly BallEvent[], rules: MatchRules): BowlingState {
  const legalBallsByBowler: Record<PlayerId, number> = {};
  let legal = 0;
  let currentBowlerId: PlayerId | undefined;
  let previousOverBowlerId: PlayerId | undefined;

  for (const ball of balls) {
    currentBowlerId = ball.bowlerId;
    if (!isLegalDelivery(ball)) continue;
    legal += 1;
    legalBallsByBowler[ball.bowlerId] = (legalBallsByBowler[ball.bowlerId] ?? 0) + 1;
    if (legal % rules.ballsPerOver === 0) {
      previousOverBowlerId = ball.bowlerId;
      currentBowlerId = undefined; // over finished: a new bowler is due
    }
  }

  return { currentBowlerId, needsBowler: currentBowlerId === undefined, previousOverBowlerId, legalBallsByBowler };
}

export interface BowlerOption {
  playerId: PlayerId;
  oversBowled: string;
  /** Why this bowler can't bowl the next over, if they can't. */
  blockedReason?: "bowled_last_over" | "quota_used";
}

/** Each player in the fielding side, marked with whether they may bowl the next over. */
export function bowlerOptions(
  squad: readonly PlayerId[],
  state: BowlingState,
  rules: MatchRules,
): BowlerOption[] {
  const quota = rules.maxOversPerBowler ? rules.maxOversPerBowler * rules.ballsPerOver : Infinity;
  return squad.map((playerId) => {
    const bowled = state.legalBallsByBowler[playerId] ?? 0;
    const oversBowled = `${Math.floor(bowled / rules.ballsPerOver)}.${bowled % rules.ballsPerOver}`;
    let blockedReason: BowlerOption["blockedReason"];
    if (playerId === state.previousOverBowlerId) blockedReason = "bowled_last_over";
    else if (bowled >= quota) blockedReason = "quota_used";
    return { playerId, oversBowled, blockedReason };
  });
}
