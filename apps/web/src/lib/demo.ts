import {
  T20_RULES,
  chaseState,
  summariseInnings,
  type BallEvent,
  type CompletedMatch,
} from "@score-masterz/scoring";

/** Sample data used until pages read from Supabase. */

export const players: Record<string, string> = {
  "rx-1": "A. Sharma",
  "rx-2": "K. Mensah",
  "rx-3": "D. Kaur",
  "nf-11": "R. Patel",
  "nf-4": "S. Ahmed",
};

export const teams: Record<string, { name: string; code: string; color: string }> = {
  hl: { name: "Hillcrest Lions", code: "HL", color: "#B4501B" },
  rx: { name: "Riverside XI", code: "RX", color: "#C79300" },
  nf: { name: "Northfield CC", code: "NF", color: "#1F6F4E" },
  es: { name: "Eastgate Strikers", code: "ES", color: "#2952A3" },
  bw: { name: "Bayview Warriors", code: "BW", color: "#6B3FA0" },
};

// A short chase: [runs, extra?, wicket?] per delivery.
type Step = [number, ("wide" | "noball" | "legbye")?, "bowled"?];
const steps: Step[] = [
  [1], [4], [0], [0], [6], [1],
  [2], [0, "wide"], [4], [1], [0], [0, undefined, "bowled"], [1],
  [4], [6], [1], [0, "noball"], [2],
];

function buildBalls(): BallEvent[] {
  const balls: BallEvent[] = [];
  const order = ["rx-1", "rx-2", "rx-3"];
  for (const [i, [runs, extra, wicket]] of steps.entries()) {
    const s = summariseInnings(balls, T20_RULES);
    const striker = s.strikerId ?? order[0]!;
    const nonStriker = s.nonStrikerId ?? order[1]!;
    const over = Math.floor(s.legalBalls / 6);
    balls.push({
      id: `demo-${i}`,
      strikerId: striker,
      nonStrikerId: nonStriker,
      bowlerId: over % 2 === 0 ? "nf-11" : "nf-4",
      runs,
      extra: extra ? { type: extra, runs: 1 } : undefined,
      wicket: wicket ? { kind: wicket, playerOutId: striker } : undefined,
      newBatterId: wicket ? "rx-3" : undefined,
    });
  }
  return balls;
}

export const liveMatch = (() => {
  const balls = buildBalls();
  const summary = summariseInnings(balls, T20_RULES);
  const firstInningsRuns = 158;
  return {
    batting: teams.rx!,
    bowling: teams.nf!,
    firstInnings: { runs: firstInningsRuns, wickets: 7, overs: "20.0" },
    summary,
    chase: chaseState(firstInningsRuns, summary, T20_RULES),
  };
})();

const line = (teamId: string, runs: number, legalBalls: number, allOut = false) => ({ teamId, runs, legalBalls, allOut });

export const results: CompletedMatch[] = [
  { first: line("hl", 176, 120), second: line("bw", 151, 120), winnerTeamId: "hl" },
  { first: line("es", 132, 120), second: line("rx", 133, 104), winnerTeamId: "rx" },
  { first: line("nf", 168, 120), second: line("es", 160, 120), winnerTeamId: "nf" },
  { first: line("rx", 145, 120), second: line("hl", 146, 112), winnerTeamId: "hl" },
  { first: line("bw", 121, 113, true), second: line("nf", 122, 95), winnerTeamId: "nf" },
];
