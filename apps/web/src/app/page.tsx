import { T20_RULES, pointsTable, type BallEvent } from "@score-masterz/scoring";

import { SiteHeader } from "@/components/site-header";
import { liveMatch, players, results, teams } from "@/lib/demo";

function ballLabel(b: BallEvent) {
  if (b.wicket) return "W";
  if (b.extra?.type === "wide") return "Wd";
  if (b.extra?.type === "noball") return "Nb";
  return b.runs === 0 ? "•" : String(b.runs);
}

function ballClass(b: BallEvent) {
  if (b.wicket) return "bg-wicket text-white";
  if (b.runs === 4) return "bg-gold text-scoreboard";
  if (b.runs === 6) return "bg-white text-scoreboard";
  if (b.extra) return "border-2 border-gold text-gold";
  return "bg-white/10 text-white";
}

function TeamBadge({ code, color, size = "h-9 w-9" }: { code: string; color: string; size?: string }) {
  return (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-[10px] font-display text-base font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {code}
    </span>
  );
}

export default function Dashboard() {
  const { summary: s, chase, batting, bowling, firstInnings } = liveMatch;
  const table = pointsTable(results, T20_RULES);
  const atCrease = [s.strikerId, s.nonStrikerId]
    .map((id) => s.batters.find((b) => b.playerId === id))
    .filter((b) => b !== undefined);

  return (
    <div className="min-h-screen">
      <SiteHeader active="/" />

      <main className="mx-auto flex max-w-7xl flex-col gap-7 px-6 pb-16 pt-8">
        <h1 className="font-display text-[44px] font-bold uppercase leading-none">Match day</h1>

        <div className="flex flex-wrap gap-6">
          <section aria-labelledby="live-h" className="flex min-w-0 flex-[999_1_640px] flex-col gap-6 rounded-[20px] bg-scoreboard p-7 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </span>
              <h2 id="live-h" className="text-[15px] font-medium text-on-board-soft">
                T20 · City League · Demo match
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <TeamBadge {...bowling} />
                  <span className="text-[17px] font-bold">{bowling.name}</span>
                </div>
                <div className="font-display text-[44px] font-semibold leading-none text-on-board-soft">
                  {firstInnings.runs}/{firstInnings.wickets}
                </div>
                <div className="text-sm text-on-board-muted">{firstInnings.overs} overs</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <TeamBadge {...batting} />
                  <span className="text-[17px] font-bold">{batting.name}</span>
                </div>
                <div className="font-display text-7xl font-bold leading-[0.9]">
                  {s.runs}/{s.wickets}
                </div>
                <div className="text-sm text-on-board-muted">{s.overs} overs</div>
              </div>
            </div>

            <p className="rounded-xl border border-gold/40 bg-gold/15 px-4 py-3 font-medium text-[#FCE7A1]">
              {batting.name} need {chase.runsNeeded} runs from {chase.ballsLeft} balls
              {s.nextIsFreeHit ? " · Free hit" : ""}
            </p>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["CRR", s.runRate.toFixed(2)],
                ["REQ RR", chase.requiredRate.toFixed(2)],
                ["PARTNERSHIP", `${s.partnership.runs} (${s.partnership.balls})`],
                ["EXTRAS", String(s.extras.total)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 px-3.5 py-3">
                  <dt className="text-xs tracking-wide text-on-board-muted">{label}</dt>
                  <dd className="font-display text-[26px] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-6 border-t border-white/10 pt-5">
              <div className="flex flex-[1_1_260px] flex-col gap-2">
                {atCrease.map((b, i) => (
                  <div key={b.playerId} className="flex justify-between">
                    <span className="font-medium">
                      {players[b.playerId]}
                      {i === 0 && <span className="text-gold"> *</span>}
                    </span>
                    <span className="font-display text-xl font-semibold">
                      {b.runs} <span className="text-base text-on-board-muted">({b.balls})</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-[1_1_260px] flex-col gap-2.5">
                <span className="text-xs tracking-widest text-on-board-muted">THIS OVER</span>
                <div className="flex flex-wrap gap-2">
                  {s.currentOver.map((b) => (
                    <span key={b.id} className={`grid h-10 min-w-10 place-items-center rounded-full px-1.5 text-sm font-bold ${ballClass(b)}`}>
                      {ballLabel(b)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="pt-h" className="flex min-w-0 flex-[1_1_380px] flex-col gap-3 rounded-[20px] border border-line bg-surface p-[22px]">
            <h2 id="pt-h" className="font-display text-[22px] font-bold uppercase">Points table</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="px-1.5 py-2.5 font-medium">Team</th>
                    <th className="px-1.5 py-2.5 text-right font-medium">P</th>
                    <th className="px-1.5 py-2.5 text-right font-medium">W</th>
                    <th className="px-1.5 py-2.5 text-right font-medium">NRR</th>
                    <th className="px-1.5 py-2.5 text-right font-bold text-ink">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => {
                    const t = teams[row.teamId]!;
                    return (
                      <tr key={row.teamId} className="border-t border-line-soft">
                        <td className="px-1.5 py-3">
                          <span className="flex items-center gap-2.5 font-bold">
                            <TeamBadge code={t.code} color={t.color} size="h-7 w-7 text-[13px]" />
                            {t.name}
                          </span>
                        </td>
                        <td className="px-1.5 py-3 text-right">{row.played}</td>
                        <td className="px-1.5 py-3 text-right">{row.won}</td>
                        <td className="px-1.5 py-3 text-right">
                          {row.netRunRate > 0 ? "+" : ""}
                          {row.netRunRate.toFixed(2)}
                        </td>
                        <td className="px-1.5 py-3 text-right font-bold">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
