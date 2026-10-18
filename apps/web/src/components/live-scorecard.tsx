"use client";

import { getMatch, subscribeToMatch, type MatchDetail } from "@score-masterz/data";
import {
  chaseState,
  describeResult,
  formatOvers,
  isLegalDelivery,
  matchResult,
  summariseInnings,
  type BallEvent,
  type InningsSummary,
  type MatchRules,
} from "@score-masterz/scoring";
import { useEffect, useMemo, useState } from "react";

import { LiveTag, TeamBadge } from "@/components/team-badge";
import { useLiveBalls, type Connection } from "@/hooks/use-live-balls";
import { getSupabase } from "@/lib/supabase";

function ballLabel(b: BallEvent) {
  if (b.wicket) return "W";
  if (b.extra?.type === "wide") return b.extra.runs > 1 ? `${b.extra.runs}wd` : "Wd";
  if (b.extra?.type === "noball") return b.runs ? `${b.runs}+Nb` : "Nb";
  if (b.extra?.type === "bye" || b.extra?.type === "legbye") return `${b.extra.runs}${b.extra.type === "bye" ? "b" : "lb"}`;
  return b.runs === 0 ? "•" : String(b.runs);
}

function ballClass(b: BallEvent) {
  if (b.wicket) return "bg-wicket text-white";
  if (b.runs === 4) return "bg-gold text-scoreboard";
  if (b.runs === 6) return "bg-pitch text-white";
  if (b.extra?.type === "wide" || b.extra?.type === "noball") return "border-2 border-gold text-gold-ink";
  return "bg-[#E7ECE8] text-ink";
}

/** "16.3"-style label for each delivery: extras keep the number of the next legal ball. */
function deliveryLabels(balls: BallEvent[], ballsPerOver: number): string[] {
  let legal = 0;
  return balls.map((b) => {
    const label = `${Math.floor(legal / ballsPerOver)}.${(legal % ballsPerOver) + 1}`;
    if (isLegalDelivery(b)) legal += 1;
    return label;
  });
}

function describeBall(b: BallEvent, name: (id: string) => string): string {
  const who = `${name(b.bowlerId)} to ${name(b.strikerId)}`;
  if (b.wicket) {
    const out = name(b.wicket.playerOutId);
    const how: Record<string, string> = {
      bowled: "bowled",
      caught: b.wicket.fielderId ? `caught by ${name(b.wicket.fielderId)}` : "caught",
      lbw: "LBW",
      runout: b.wicket.fielderId ? `run out by ${name(b.wicket.fielderId)}` : "run out",
      stumped: "stumped",
      hitwicket: "hit wicket",
      retired: "retired",
    };
    return `${who}, OUT! ${out} ${how[b.wicket.kind]}.`;
  }
  if (b.extra?.type === "wide") return `${who}, wide${b.extra.runs > 1 ? ` (${b.extra.runs} runs)` : ""}.`;
  if (b.extra?.type === "noball") return `${who}, no ball${b.runs ? `, ${b.runs} off the bat` : ""}.`;
  if (b.extra?.type === "bye" || b.extra?.type === "legbye") return `${who}, ${b.extra.runs} ${b.extra.type === "bye" ? "bye" : "leg bye"}.`;
  if (b.runs === 4) return `${who}, FOUR.`;
  if (b.runs === 6) return `${who}, SIX.`;
  return `${who}, ${b.runs === 0 ? "no run" : `${b.runs} run${b.runs === 1 ? "" : "s"}`}.`;
}

function ConnectionBadge({ connection }: { connection: Connection }) {
  const text = connection === "live" ? "Updating live" : connection === "connecting" ? "Connecting…" : "Reconnecting…";
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-on-board-soft">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${connection === "live" ? "bg-[#4ADE80]" : connection === "connecting" ? "bg-gold" : "bg-live"}`}
      />
      {text}
    </span>
  );
}

export function LiveScorecard({ matchId }: { matchId: string }) {
  const supabase = getSupabase();
  const [match, setMatch] = useState<MatchDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const load = () =>
      getMatch(supabase, matchId)
        .then((m) => !cancelled && setMatch(m))
        .catch((e: Error) => !cancelled && setError(e.message));
    void load();
    const channel = subscribeToMatch(supabase, matchId, () => void load());
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabase, matchId]);

  const inningsIds = useMemo(() => match?.innings.map((i) => i.id) ?? [], [match]);
  const { balls, connection, error: ballsError } = useLiveBalls(supabase, inningsIds);

  const summaries = useMemo(() => {
    const out: Record<string, InningsSummary> = {};
    if (!match || !balls) return out;
    for (const inn of match.innings) out[inn.id] = summariseInnings(balls[inn.id] ?? [], match.rules);
    return out;
  }, [match, balls]);

  if (!supabase) {
    return <p className="p-6 text-gold-ink">Supabase is not configured. See apps/web/.env.example.</p>;
  }
  if (error || ballsError) {
    return (
      <p role="alert" className="mx-auto mt-8 max-w-7xl rounded-xl border border-wicket/40 bg-[#FDECEA] px-4 py-3 font-medium text-wicket">
        {error ?? ballsError}
      </p>
    );
  }
  if (match === null) return <p className="mx-auto mt-8 max-w-7xl px-6 text-muted">This match could not be found.</p>;
  if (match === undefined || !balls) return <p className="mx-auto mt-8 max-w-7xl px-6 text-muted">Loading scorecard…</p>;

  const team = (id: string) => (id === match.teamA.id ? match.teamA : match.teamB);
  const name = (id: string) => match.playerNames[id] ?? "Unknown";
  const current = match.innings[match.innings.length - 1];
  const shown = match.innings.find((i) => i.id === selected) ?? current;
  const live = match.status === "live";

  // Second innings: chase line and result.
  const [first, second] = match.innings;
  let headline: string | null = null;
  if (first && second && summaries[first.id] && summaries[second.id]) {
    const a = summaries[first.id]!;
    const b = summaries[second.id]!;
    const result = matchResult(a, b, match.rules);
    if (result.status !== "in_progress") {
      headline = describeResult(result, team(first.battingTeamId).name, team(second.battingTeamId).name);
    } else {
      const c = chaseState(a.runs, b, match.rules);
      headline = `${team(second.battingTeamId).name} need ${c.runsNeeded} from ${c.ballsLeft} balls · RRR ${c.requiredRate.toFixed(2)}`;
    }
  }

  return (
    <>
      <section aria-label="Match summary" className="bg-scoreboard-raised text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {live ? <LiveTag /> : <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tracking-wider">{match.status.toUpperCase()}</span>}
              <span className="text-on-board-soft">
                {match.rules.oversPerInnings} overs{match.venue ? ` · ${match.venue}` : ""}
              </span>
            </div>
            {live && <ConnectionBadge connection={connection} />}
          </div>
          <h1 className="font-display text-[40px] font-bold uppercase leading-none">
            {match.teamA.name} <span className="font-medium text-on-board-muted">vs</span> {match.teamB.name}
          </h1>
          <div className="flex flex-wrap gap-8">
            {match.innings.map((inn) => {
              const s = summaries[inn.id]!;
              const t = team(inn.battingTeamId);
              const isCurrent = inn.id === current?.id;
              return (
                <div key={inn.id} className="flex items-center gap-3">
                  <TeamBadge code={t.shortCode} color={t.color} size={44} />
                  <div>
                    <div className={`text-[13px] font-bold ${isCurrent && live ? "text-gold" : "text-on-board-muted"}`}>
                      {t.name.toUpperCase()}
                      {isCurrent && live ? " · BATTING" : ""}
                    </div>
                    <div className={`font-display font-bold leading-none ${isCurrent ? "text-6xl" : "text-4xl text-on-board-soft"}`} aria-live={isCurrent ? "polite" : undefined}>
                      {s.runs}/{s.wickets}{" "}
                      <span className="text-xl font-medium text-on-board-muted">
                        ({s.overs}) · CRR {s.runRate.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {headline && (
            <p className="rounded-xl border border-gold/40 bg-gold/15 px-4 py-3 font-medium text-[#FCE7A1]">{headline}</p>
          )}
          {match.innings.length > 1 && (
            <div role="tablist" aria-label="Innings" className="flex gap-1">
              {match.innings.map((inn) => (
                <button
                  key={inn.id}
                  role="tab"
                  aria-selected={inn.id === shown?.id}
                  onClick={() => setSelected(inn.id)}
                  className={`min-h-11 border-b-[3px] px-4 font-bold ${inn.id === shown?.id ? "border-gold text-white" : "border-transparent text-on-board-soft"}`}
                >
                  {team(inn.battingTeamId).name} innings
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {shown ? (
        <InningsCard
          summary={summaries[shown.id]!}
          balls={balls[shown.id] ?? []}
          rules={match.rules}
          battingTeam={team(shown.battingTeamId).name}
          bowlingTeam={team(shown.bowlingTeamId).name}
          name={name}
        />
      ) : (
        <p className="mx-auto mt-8 max-w-7xl px-6 text-muted">The first ball hasn&apos;t been bowled yet.</p>
      )}
    </>
  );
}

function InningsCard({
  summary: s,
  balls,
  rules,
  battingTeam,
  bowlingTeam,
  name,
}: {
  summary: InningsSummary;
  balls: BallEvent[];
  rules: MatchRules;
  battingTeam: string;
  bowlingTeam: string;
  name: (id: string) => string;
}) {
  const labels = deliveryLabels(balls, rules.ballsPerOver);
  const recent = balls.map((b, i) => ({ b, label: labels[i]! })).slice(-12).reverse();
  const dismissal = (id: string) => {
    const d = s.batters.find((b) => b.playerId === id)?.dismissal;
    if (!d) return id === s.strikerId || id === s.nonStrikerId ? "batting" : "not out";
    const bowler = name(d.bowlerId);
    const fielder = d.fielderId ? name(d.fielderId) : null;
    switch (d.kind) {
      case "bowled":
        return `b ${bowler}`;
      case "caught":
        return fielder === bowler ? `c & b ${bowler}` : `c ${fielder ?? "?"} b ${bowler}`;
      case "stumped":
        return `st ${fielder ?? "?"} b ${bowler}`;
      case "lbw":
        return `lbw b ${bowler}`;
      case "hitwicket":
        return `hit wicket b ${bowler}`;
      case "runout":
        return fielder ? `run out (${fielder})` : "run out";
      case "retired":
        return "retired";
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-wrap items-start gap-6 px-6 pb-16 pt-7">
      <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-6">
        <section aria-labelledby="bat-h" className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[22px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="bat-h" className="font-display text-2xl font-bold uppercase">{battingTeam} · Batting</h2>
            <span className="text-sm text-muted">
              Extras {s.extras.total} (wd {s.extras.wides}, nb {s.extras.noBalls}, b {s.extras.byes}, lb {s.extras.legByes})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-right text-muted">
                  <th className="px-2 py-2.5 text-left font-medium">Batter</th>
                  <th className="px-2 py-2.5 text-left font-medium"><span className="sr-only">Dismissal</span></th>
                  <th className="px-2 py-2.5 font-bold text-ink">R</th>
                  <th className="px-2 py-2.5 font-medium">B</th>
                  <th className="px-2 py-2.5 font-medium">4s</th>
                  <th className="px-2 py-2.5 font-medium">6s</th>
                  <th className="px-2 py-2.5 font-medium">SR</th>
                </tr>
              </thead>
              <tbody className="text-right">
                {s.batters.map((b) => {
                  const atCrease = !b.out && (b.playerId === s.strikerId || b.playerId === s.nonStrikerId);
                  return (
                    <tr key={b.playerId} className={`border-t border-line-soft ${atCrease ? "bg-[#FDF6DC]" : ""}`}>
                      <td className="px-2 py-3 text-left font-bold">
                        {name(b.playerId)}
                        {b.playerId === s.strikerId && !b.out ? <span className="text-gold-ink"> *</span> : null}
                      </td>
                      <td className={`px-2 py-3 text-left ${atCrease ? "font-medium text-gold-ink" : "text-muted"}`}>{dismissal(b.playerId)}</td>
                      <td className="px-2 py-3 font-bold">{b.runs}</td>
                      <td className="px-2 py-3">{b.balls}</td>
                      <td className="px-2 py-3">{b.fours}</td>
                      <td className="px-2 py-3">{b.sixes}</td>
                      <td className="px-2 py-3">{b.balls ? ((b.runs * 100) / b.balls).toFixed(1) : "–"}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-line">
                  <td colSpan={2} className="px-2 py-3.5 text-left font-bold">
                    Total <span className="font-normal text-muted">({s.wickets} wkts, {s.overs} ov)</span>
                  </td>
                  <td className="px-2 py-3.5 font-display text-[22px] font-bold">{s.runs}</td>
                  <td colSpan={4} className="px-2 py-3.5 text-muted">CRR {s.runRate.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {s.fallOfWickets.length > 0 && (
            <p className="text-sm text-muted">
              <strong className="text-ink">Fall of wickets:</strong>{" "}
              {s.fallOfWickets
                .map((f) => `${f.wicket}–${f.runs} (${name(f.playerOutId)}, ${formatOvers(f.legalBalls, rules.ballsPerOver)})`)
                .join(", ")}
            </p>
          )}
        </section>

        <section aria-labelledby="bowl-h" className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[22px]">
          <h2 id="bowl-h" className="font-display text-2xl font-bold uppercase">{bowlingTeam} · Bowling</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="text-right text-muted">
                  <th className="px-2 py-2.5 text-left font-medium">Bowler</th>
                  <th className="px-2 py-2.5 font-medium">O</th>
                  <th className="px-2 py-2.5 font-medium">M</th>
                  <th className="px-2 py-2.5 font-medium">R</th>
                  <th className="px-2 py-2.5 font-bold text-ink">W</th>
                  <th className="px-2 py-2.5 font-medium">Econ</th>
                </tr>
              </thead>
              <tbody className="text-right">
                {s.bowlers.map((b) => (
                  <tr key={b.playerId} className="border-t border-line-soft">
                    <td className="px-2 py-3 text-left font-bold">{name(b.playerId)}</td>
                    <td className="px-2 py-3">{formatOvers(b.legalBalls, rules.ballsPerOver)}</td>
                    <td className="px-2 py-3">{b.maidens}</td>
                    <td className="px-2 py-3">{b.runs}</td>
                    <td className="px-2 py-3 font-bold">{b.wickets}</td>
                    <td className="px-2 py-3">{b.legalBalls ? ((b.runs * rules.ballsPerOver) / b.legalBalls).toFixed(2) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
        <section aria-labelledby="over-h" className="flex flex-col gap-3 rounded-[20px] bg-scoreboard p-[22px] text-white">
          <h2 id="over-h" className="text-xs tracking-widest text-on-board-muted">THIS OVER</h2>
          <div className="flex min-h-10 flex-wrap gap-2">
            {s.currentOver.length === 0 ? (
              <span className="text-sm text-on-board-muted">New over</span>
            ) : (
              s.currentOver.map((b) => (
                <span key={b.id} className={`grid h-10 min-w-10 place-items-center rounded-full px-1.5 text-sm font-bold ${ballClass(b)}`}>
                  {ballLabel(b)}
                </span>
              ))
            )}
          </div>
          <p className="text-sm text-on-board-soft">
            Partnership {s.partnership.runs} ({s.partnership.balls})
            {s.nextIsFreeHit ? <strong className="ml-2 text-gold">· Free hit next ball</strong> : null}
          </p>
        </section>

        <section aria-labelledby="bbb-h" className="flex flex-col rounded-[20px] border border-line bg-white p-[22px]">
          <h2 id="bbb-h" className="mb-2 font-display text-[22px] font-bold uppercase">Ball by ball</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Waiting for the first ball…</p>
          ) : (
            <ol aria-live="polite" className="divide-y divide-line-soft">
              {recent.map(({ b, label }) => (
                <li key={b.id} className="flex gap-3 py-3">
                  <span className="w-10 shrink-0 pt-2.5 text-[13px] text-muted">{label}</span>
                  <span className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-1 text-sm font-bold ${ballClass(b)}`}>
                    {ballLabel(b)}
                  </span>
                  <span className="pt-1.5 text-sm">{describeBall(b, name)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </main>
  );
}
