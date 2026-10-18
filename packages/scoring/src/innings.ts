import type {
  BallEvent,
  BatterFigures,
  BowlerFigures,
  FallOfWicket,
  InningsSummary,
  MatchRules,
  PlayerId,
} from "./types";

/** A wide or no ball does not count towards the over. */
export function isLegalDelivery(ball: BallEvent): boolean {
  return ball.extra?.type !== "wide" && ball.extra?.type !== "noball";
}

/** Formats a count of legal balls as overs, e.g. 99 → "16.3". */
export function formatOvers(legalBalls: number, ballsPerOver = 6): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}

/** Overs as a decimal for rate maths, e.g. 99 balls → 16.5. */
export function oversAsDecimal(legalBalls: number, ballsPerOver = 6): number {
  return legalBalls / ballsPerOver;
}

export function totalRuns(ball: BallEvent): number {
  return ball.runs + (ball.extra?.runs ?? 0);
}

/** Runs the batters physically ran (or the ball crossed for) — drives strike rotation. */
function runsCompleted(ball: BallEvent, rules: MatchRules): number {
  const extra = ball.extra;
  if (!extra) return ball.runs;
  if (extra.type === "penalty") return ball.runs;
  if (extra.type === "wide" || extra.type === "noball") {
    return ball.runs + Math.max(0, extra.runs - rules.wideNoBallPenalty);
  }
  return ball.runs + extra.runs; // byes and leg byes
}

function concededByBowler(ball: BallEvent): number {
  const t = ball.extra?.type;
  if (t === "bye" || t === "legbye" || t === "penalty") return ball.runs;
  return totalRuns(ball);
}

const NOT_BOWLER_WICKETS = new Set(["runout", "retired"]);

export function summariseInnings(balls: readonly BallEvent[], rules: MatchRules): InningsSummary {
  const batters = new Map<PlayerId, BatterFigures>();
  const bowlers = new Map<PlayerId, BowlerFigures>();
  const fallOfWickets: FallOfWicket[] = [];
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0, total: 0 };

  const batter = (id: PlayerId): BatterFigures => {
    let b = batters.get(id);
    if (!b) {
      b = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      batters.set(id, b);
    }
    return b;
  };
  const bowler = (id: PlayerId): BowlerFigures => {
    let b = bowlers.get(id);
    if (!b) {
      b = { playerId: id, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
      bowlers.set(id, b);
    }
    return b;
  };

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let striker: PlayerId | undefined;
  let nonStriker: PlayerId | undefined;
  let currentOver: BallEvent[] = [];
  let overConceded = 0;
  let partnership = { runs: 0, balls: 0 };
  let nextIsFreeHit = false;
  let overJustEnded = false;

  for (const ball of balls) {
    if (overJustEnded) {
      currentOver = [];
      overJustEnded = false;
    }

    striker = ball.strikerId;
    nonStriker = ball.nonStrikerId;
    batter(striker);
    batter(nonStriker);

    const legal = isLegalDelivery(ball);
    const bowl = bowler(ball.bowlerId);
    const bat = batter(striker);
    const ballRuns = totalRuns(ball);

    runs += ballRuns;
    partnership.runs += ballRuns;
    bat.runs += ball.runs;
    if (ball.runs === 4) bat.fours += 1;
    if (ball.runs === 6) bat.sixes += 1;
    if (ball.extra?.type !== "wide") {
      bat.balls += 1;
      partnership.balls += 1;
    }

    const conceded = concededByBowler(ball);
    bowl.runs += conceded;
    overConceded += conceded;

    switch (ball.extra?.type) {
      case "wide":
        extras.wides += ball.extra.runs;
        bowl.wides += 1;
        break;
      case "noball":
        extras.noBalls += ball.extra.runs;
        bowl.noBalls += 1;
        break;
      case "bye":
        extras.byes += ball.extra.runs;
        break;
      case "legbye":
        extras.legByes += ball.extra.runs;
        break;
      case "penalty":
        extras.penalties += ball.extra.runs;
        break;
    }
    extras.total += ball.extra?.runs ?? 0;

    if (legal) {
      legalBalls += 1;
      bowl.legalBalls += 1;
    }
    currentOver.push(ball);

    // Strike rotates on odd runs completed…
    if (runsCompleted(ball, rules) % 2 === 1) [striker, nonStriker] = [nonStriker, striker];

    if (ball.wicket) {
      wickets += 1;
      const outId = ball.wicket.playerOutId;
      const outFig = batter(outId);
      outFig.out = true;
      outFig.dismissal = { kind: ball.wicket.kind, bowlerId: ball.bowlerId, fielderId: ball.wicket.fielderId };
      if (!NOT_BOWLER_WICKETS.has(ball.wicket.kind)) bowl.wickets += 1;
      fallOfWickets.push({ wicket: wickets, runs, playerOutId: outId, legalBalls });
      partnership = { runs: 0, balls: 0 };
      const replacement = ball.newBatterId;
      if (striker === outId) striker = replacement;
      else if (nonStriker === outId) nonStriker = replacement;
      if (replacement) batter(replacement);
    }

    // …and at the end of every over.
    const overDone = legal && legalBalls % rules.ballsPerOver === 0;
    if (overDone) {
      if (overConceded === 0 && currentOver.every((b) => b.bowlerId === ball.bowlerId)) bowl.maidens += 1;
      overConceded = 0;
      overJustEnded = true;
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (rules.freeHitOnNoBall) {
      if (ball.extra?.type === "noball") nextIsFreeHit = true;
      else if (legal) nextIsFreeHit = false;
    }
  }

  // A finished over shows as an empty "this over".
  if (overJustEnded) currentOver = [];

  const complete =
    wickets >= rules.wicketsPerInnings || legalBalls >= rules.oversPerInnings * rules.ballsPerOver;

  return {
    runs,
    wickets,
    legalBalls,
    overs: formatOvers(legalBalls, rules.ballsPerOver),
    extras,
    batters: [...batters.values()],
    bowlers: [...bowlers.values()],
    fallOfWickets,
    currentOver,
    strikerId: striker,
    nonStrikerId: nonStriker,
    partnership,
    nextIsFreeHit,
    runRate: legalBalls ? (runs * rules.ballsPerOver) / legalBalls : 0,
    complete,
  };
}
