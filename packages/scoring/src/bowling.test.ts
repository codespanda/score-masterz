import { describe, expect, it } from "vitest";

import { T20_RULES, bowlerOptions, bowlingState, type BallEvent } from "./index";

let n = 0;
const ball = (bowlerId: string, extra?: BallEvent["extra"]): BallEvent => ({
  id: String(n++),
  strikerId: "a",
  nonStrikerId: "b",
  bowlerId,
  runs: 0,
  extra,
});
const over = (bowlerId: string) => Array.from({ length: 6 }, () => ball(bowlerId));

describe("bowlingState", () => {
  it("needs a bowler before the first ball", () => {
    expect(bowlingState([], T20_RULES)).toMatchObject({ needsBowler: true, currentBowlerId: undefined });
  });

  it("keeps the same bowler mid-over, including after a wide", () => {
    const s = bowlingState([ball("x"), ball("x", { type: "wide", runs: 1 })], T20_RULES);
    expect(s).toMatchObject({ needsBowler: false, currentBowlerId: "x" });
    expect(s.legalBallsByBowler).toEqual({ x: 1 });
  });

  it("asks for a new bowler once six legal balls are bowled", () => {
    const s = bowlingState([...over("x"), ball("x", { type: "noball", runs: 1 })].slice(0, 6), T20_RULES);
    expect(s).toMatchObject({ needsBowler: true, previousOverBowlerId: "x" });
  });

  it("does not end the over on an extra that is the sixth delivery", () => {
    const balls = [...over("x").slice(0, 5), ball("x", { type: "wide", runs: 1 })];
    expect(bowlingState(balls, T20_RULES).needsBowler).toBe(false);
  });
});

describe("bowlerOptions", () => {
  it("blocks the previous over's bowler and anyone who has used their quota", () => {
    const rules = { ...T20_RULES, maxOversPerBowler: 1 };
    const s = bowlingState([...over("x"), ...over("y")], rules);
    const opts = bowlerOptions(["x", "y", "z"], s, rules);
    expect(opts).toEqual([
      { playerId: "x", oversBowled: "1.0", blockedReason: "quota_used" },
      { playerId: "y", oversBowled: "1.0", blockedReason: "bowled_last_over" },
      { playerId: "z", oversBowled: "0.0", blockedReason: undefined },
    ]);
  });
});
