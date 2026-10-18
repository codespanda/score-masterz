import type { InningsSummary, MatchRules } from "./types";

export interface ChaseState {
  target: number;
  runsNeeded: number;
  ballsLeft: number;
  requiredRate: number;
}

/** Target = first-innings total + 1. */
export function chaseState(firstInningsRuns: number, second: InningsSummary, rules: MatchRules): ChaseState {
  const target = firstInningsRuns + 1;
  const ballsLeft = Math.max(0, rules.oversPerInnings * rules.ballsPerOver - second.legalBalls);
  const runsNeeded = Math.max(0, target - second.runs);
  return {
    target,
    runsNeeded,
    ballsLeft,
    requiredRate: ballsLeft ? (runsNeeded * rules.ballsPerOver) / ballsLeft : 0,
  };
}

export type MatchResult =
  | { status: "in_progress" }
  | { status: "tie" }
  | { status: "won"; winner: "first" | "second"; margin: { runs: number } | { wickets: number; ballsLeft: number } };

export function matchResult(first: InningsSummary, second: InningsSummary, rules: MatchRules): MatchResult {
  const chase = chaseState(first.runs, second, rules);
  if (second.runs >= chase.target) {
    return {
      status: "won",
      winner: "second",
      margin: { wickets: rules.wicketsPerInnings - second.wickets, ballsLeft: chase.ballsLeft },
    };
  }
  if (!second.complete) return { status: "in_progress" };
  if (second.runs === first.runs) return { status: "tie" };
  return { status: "won", winner: "first", margin: { runs: first.runs - second.runs } };
}

/** "Riverside XI won by 6 wickets (11 balls left)" style text. */
export function describeResult(result: MatchResult, firstTeam: string, secondTeam: string): string {
  if (result.status === "in_progress") return "Match in progress";
  if (result.status === "tie") return "Match tied";
  const team = result.winner === "first" ? firstTeam : secondTeam;
  if ("runs" in result.margin) {
    const r = result.margin.runs;
    return `${team} won by ${r} run${r === 1 ? "" : "s"}`;
  }
  const { wickets, ballsLeft } = result.margin;
  const balls = ballsLeft ? ` (${ballsLeft} ball${ballsLeft === 1 ? "" : "s"} left)` : "";
  return `${team} won by ${wickets} wicket${wickets === 1 ? "" : "s"}${balls}`;
}
