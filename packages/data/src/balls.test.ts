import { describe, expect, it } from "vitest";

import type { BallEvent } from "@score-masterz/scoring";

import { fromBallRow, toBallRow } from "./balls";

describe("ball rows", () => {
  it("round-trips a plain ball, an extra and a wicket", () => {
    const balls: BallEvent[] = [
      { id: "1", strikerId: "a", nonStrikerId: "b", bowlerId: "x", runs: 4 },
      { id: "2", strikerId: "a", nonStrikerId: "b", bowlerId: "x", runs: 0, extra: { type: "wide", runs: 1 } },
      {
        id: "3",
        strikerId: "a",
        nonStrikerId: "b",
        bowlerId: "x",
        runs: 0,
        wicket: { kind: "caught", playerOutId: "a", fielderId: "f" },
        newBatterId: "c",
      },
    ];
    balls.forEach((ball, seq) => {
      const row = toBallRow(ball, "inn", seq);
      expect(row.seq).toBe(seq);
      expect(fromBallRow(row)).toEqual(ball);
    });
  });
});
