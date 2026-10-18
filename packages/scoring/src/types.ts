export type PlayerId = string;

export type ExtraType = "wide" | "noball" | "bye" | "legbye" | "penalty";

export type WicketKind =
  | "bowled"
  | "caught"
  | "lbw"
  | "runout"
  | "stumped"
  | "hitwicket"
  | "retired";

/**
 * One delivery, as recorded by the scorer. Every score, figure and table
 * is derived from a list of these; nothing else is stored.
 */
export interface BallEvent {
  id: string;
  strikerId: PlayerId;
  nonStrikerId: PlayerId;
  bowlerId: PlayerId;
  /** Runs off the bat (0–6). On a wide this is always 0. */
  runs: number;
  /**
   * Extras on this ball, in total. A plain wide or no ball is `{ runs: 1 }`;
   * a wide that runs away for four is `{ type: "wide", runs: 5 }`.
   */
  extra?: { type: ExtraType; runs: number };
  wicket?: {
    kind: WicketKind;
    playerOutId: PlayerId;
    fielderId?: PlayerId;
  };
  /** Batter who replaces the dismissed player, when there is one. */
  newBatterId?: PlayerId;
}

export interface MatchRules {
  oversPerInnings: number;
  ballsPerOver: number;
  /** Wickets that end an innings: players in the side minus one. */
  wicketsPerInnings: number;
  /** Runs awarded for a wide or no ball before anything else is run. */
  wideNoBallPenalty: number;
  freeHitOnNoBall: boolean;
  maxOversPerBowler?: number;
}

export const T20_RULES: MatchRules = {
  oversPerInnings: 20,
  ballsPerOver: 6,
  wicketsPerInnings: 10,
  wideNoBallPenalty: 1,
  freeHitOnNoBall: true,
  maxOversPerBowler: 4,
};

export interface BatterFigures {
  playerId: PlayerId;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: { kind: WicketKind; bowlerId: PlayerId; fielderId?: PlayerId };
}

export interface BowlerFigures {
  playerId: PlayerId;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wicket: number;
  runs: number;
  playerOutId: PlayerId;
  legalBalls: number;
}

export interface InningsSummary {
  runs: number;
  wickets: number;
  legalBalls: number;
  overs: string;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; penalties: number; total: number };
  batters: BatterFigures[];
  bowlers: BowlerFigures[];
  fallOfWickets: FallOfWicket[];
  /** Deliveries bowled so far in the over in progress (including extras). */
  currentOver: BallEvent[];
  strikerId?: PlayerId;
  nonStrikerId?: PlayerId;
  partnership: { runs: number; balls: number };
  /** True when the next delivery is a free hit. */
  nextIsFreeHit: boolean;
  runRate: number;
  complete: boolean;
}
