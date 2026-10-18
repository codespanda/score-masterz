import type { MatchRules } from "./types";

export interface InningsLine {
  teamId: string;
  runs: number;
  legalBalls: number;
  allOut: boolean;
}

export interface CompletedMatch {
  first: InningsLine;
  second: InningsLine;
  /** null for a tie or no result. */
  winnerTeamId: string | null;
  noResult?: boolean;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
}

export interface PointsRules {
  win: number;
  tie: number;
  noResult: number;
}

export const DEFAULT_POINTS: PointsRules = { win: 2, tie: 1, noResult: 1 };

/**
 * League table with net run rate. A side bowled out is charged its full
 * quota of overs, as in standard NRR rules.
 */
export function pointsTable(
  matches: readonly CompletedMatch[],
  rules: Pick<MatchRules, "oversPerInnings" | "ballsPerOver">,
  points: PointsRules = DEFAULT_POINTS,
): TableRow[] {
  const quota = rules.oversPerInnings * rules.ballsPerOver;
  const acc = new Map<string, TableRow & { rf: number; bf: number; ra: number; bb: number }>();
  const row = (id: string) => {
    let r = acc.get(id);
    if (!r) {
      r = { teamId: id, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, netRunRate: 0, rf: 0, bf: 0, ra: 0, bb: 0 };
      acc.set(id, r);
    }
    return r;
  };

  for (const m of matches) {
    const a = row(m.first.teamId);
    const b = row(m.second.teamId);
    a.played += 1;
    b.played += 1;
    if (m.noResult) {
      a.noResult += 1;
      b.noResult += 1;
      a.points += points.noResult;
      b.points += points.noResult;
      continue;
    }
    const ballsA = m.first.allOut ? quota : m.first.legalBalls;
    const ballsB = m.second.allOut ? quota : m.second.legalBalls;
    a.rf += m.first.runs; a.bf += ballsA; a.ra += m.second.runs; a.bb += ballsB;
    b.rf += m.second.runs; b.bf += ballsB; b.ra += m.first.runs; b.bb += ballsA;

    if (m.winnerTeamId === null) {
      a.tied += 1; b.tied += 1;
      a.points += points.tie; b.points += points.tie;
    } else {
      const [w, l] = m.winnerTeamId === a.teamId ? [a, b] : [b, a];
      w.won += 1; w.points += points.win;
      l.lost += 1;
    }
  }

  const bpo = rules.ballsPerOver;
  return [...acc.values()]
    .map(({ rf, bf, ra, bb, ...r }) => ({
      ...r,
      netRunRate: Math.round(((bf ? (rf * bpo) / bf : 0) - (bb ? (ra * bpo) / bb : 0)) * 1000) / 1000,
    }))
    .sort((x, y) => y.points - x.points || y.netRunRate - x.netRunRate);
}
