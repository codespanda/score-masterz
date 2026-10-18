import { describe, expect, it } from "vitest";
import {
  T20_RULES,
  chaseState,
  describeResult,
  matchResult,
  pointsTable,
  summariseInnings,
  type BallEvent,
  type MatchRules,
} from "./index";

type Delivery = Omit<BallEvent, "id" | "strikerId" | "nonStrikerId" | "bowlerId"> & { bowlerId?: string };

/** Records deliveries the way the app does: batters at the crease come from the summary so far. */
function play(deliveries: Delivery[], rules: MatchRules = T20_RULES, openers: [string, string] = ["A", "B"]) {
  const balls: BallEvent[] = [];
  for (const [i, d] of deliveries.entries()) {
    const s = balls.length ? summariseInnings(balls, rules) : undefined;
    balls.push({
      id: String(i),
      strikerId: s?.strikerId ?? openers[0],
      nonStrikerId: s?.nonStrikerId ?? openers[1],
      bowlerId: d.bowlerId ?? "X",
      runs: d.runs,
      extra: d.extra,
      wicket: d.wicket,
      newBatterId: d.newBatterId,
    });
  }
  return { balls, summary: summariseInnings(balls, rules) };
}

const dots = (n: number, bowlerId = "X"): Delivery[] => Array.from({ length: n }, () => ({ runs: 0, bowlerId }));

describe("summariseInnings", () => {
  it("adds runs and counts legal balls as overs", () => {
    const { summary } = play([{ runs: 1 }, { runs: 4 }, { runs: 0 }, { runs: 6 }, { runs: 2 }, { runs: 3 }, { runs: 1 }]);
    expect(summary.runs).toBe(17);
    expect(summary.legalBalls).toBe(7);
    expect(summary.overs).toBe("1.1");
  });

  it("rotates strike on odd runs and at the end of the over", () => {
    const { summary } = play([{ runs: 1 }]);
    expect(summary.strikerId).toBe("B");
    const over = play(dots(6));
    expect(over.summary.strikerId).toBe("B");
    expect(over.summary.currentOver).toHaveLength(0);
  });

  it("does not count wides or no balls as legal deliveries", () => {
    const { summary } = play([
      { runs: 0, extra: { type: "wide", runs: 1 } },
      { runs: 4, extra: { type: "noball", runs: 1 } },
      { runs: 0 },
    ]);
    expect(summary.runs).toBe(6);
    expect(summary.legalBalls).toBe(1);
    expect(summary.extras).toMatchObject({ wides: 1, noBalls: 1, total: 2 });
    const a = summary.batters.find((b) => b.playerId === "A")!;
    expect(a).toMatchObject({ runs: 4, balls: 2, fours: 1 });
    const x = summary.bowlers.find((b) => b.playerId === "X")!;
    expect(x).toMatchObject({ runs: 6, legalBalls: 1, wides: 1, noBalls: 1 });
  });

  it("does not charge byes or leg byes to the bowler, but rotates strike on them", () => {
    const { summary } = play([{ runs: 0, extra: { type: "legbye", runs: 1 } }]);
    expect(summary.runs).toBe(1);
    expect(summary.bowlers[0]!.runs).toBe(0);
    expect(summary.strikerId).toBe("B");
  });

  it("rotates strike when batters run an odd number on a wide", () => {
    const { summary } = play([{ runs: 0, extra: { type: "wide", runs: 2 } }]);
    expect(summary.strikerId).toBe("B");
    expect(summary.legalBalls).toBe(0);
  });

  it("records wickets, fall of wickets and the new batter", () => {
    const { summary } = play([
      { runs: 4 },
      { runs: 0, wicket: { kind: "bowled", playerOutId: "A" }, newBatterId: "C" },
    ]);
    expect(summary.wickets).toBe(1);
    expect(summary.fallOfWickets[0]).toMatchObject({ wicket: 1, runs: 4, playerOutId: "A" });
    expect(summary.strikerId).toBe("C");
    expect(summary.bowlers[0]!.wickets).toBe(1);
    expect(summary.partnership).toEqual({ runs: 0, balls: 0 });
  });

  it("does not credit the bowler with a run out", () => {
    const { summary } = play([{ runs: 1, wicket: { kind: "runout", playerOutId: "B" }, newBatterId: "C" }]);
    expect(summary.bowlers[0]!.wickets).toBe(0);
    expect(summary.wickets).toBe(1);
  });

  it("counts a maiden over", () => {
    const { summary } = play(dots(6));
    expect(summary.bowlers[0]!.maidens).toBe(1);
  });

  it("flags a free hit after a no ball until the next legal delivery", () => {
    expect(play([{ runs: 0, extra: { type: "noball", runs: 1 } }]).summary.nextIsFreeHit).toBe(true);
    expect(
      play([{ runs: 0, extra: { type: "noball", runs: 1 } }, { runs: 0, extra: { type: "wide", runs: 1 } }]).summary.nextIsFreeHit,
    ).toBe(true);
    expect(play([{ runs: 0, extra: { type: "noball", runs: 1 } }, { runs: 1 }]).summary.nextIsFreeHit).toBe(false);
  });

  it("completes the innings when overs run out", () => {
    const rules = { ...T20_RULES, oversPerInnings: 1 };
    expect(play(dots(6), rules).summary.complete).toBe(true);
  });
});

describe("chase and result", () => {
  const rules = { ...T20_RULES, oversPerInnings: 2 };
  const first = play([{ runs: 6 }, { runs: 4 }, ...dots(10)], rules).summary; // 10 all-dots after

  it("works out the target and required rate", () => {
    const second = play([{ runs: 2 }, ...dots(5)], rules).summary;
    expect(chaseState(first.runs, second, rules)).toEqual({ target: 11, runsNeeded: 9, ballsLeft: 6, requiredRate: 9 });
  });

  it("reports a win by wickets when the target is reached", () => {
    const second = play([{ runs: 6 }, { runs: 6 }], rules).summary;
    const result = matchResult(first, second, rules);
    expect(describeResult(result, "Northfield", "Riverside")).toBe("Riverside won by 10 wickets (10 balls left)");
  });

  it("reports a win by runs when the chase falls short", () => {
    const second = play([{ runs: 4 }, ...dots(11)], rules).summary;
    expect(describeResult(matchResult(first, second, rules), "Northfield", "Riverside")).toBe("Northfield won by 6 runs");
  });

  it("reports a tie", () => {
    const second = play([{ runs: 6 }, { runs: 4 }, ...dots(10)], rules).summary;
    expect(matchResult(first, second, rules)).toEqual({ status: "tie" });
  });
});

describe("pointsTable", () => {
  it("awards points and ranks by net run rate", () => {
    const table = pointsTable(
      [
        { first: { teamId: "A", runs: 160, legalBalls: 120, allOut: false }, second: { teamId: "B", runs: 140, legalBalls: 120, allOut: false }, winnerTeamId: "A" },
        { first: { teamId: "C", runs: 100, legalBalls: 90, allOut: true }, second: { teamId: "B", runs: 101, legalBalls: 60, allOut: false }, winnerTeamId: "B" },
      ],
      T20_RULES,
    );
    expect(table.map((r) => [r.teamId, r.points])).toEqual([["B", 2], ["A", 2], ["C", 0]]);
    // C was bowled out in 15 overs, so is charged the full 20.
    expect(table.find((r) => r.teamId === "C")!.netRunRate).toBe(5 - 10.1);
  });
});
