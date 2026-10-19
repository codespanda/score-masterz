"use client";

import { ensureSession, listTeams, type Team } from "@score-masterz/data";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LiveMatches } from "@/components/live-matches";
import { TeamBadge } from "@/components/team-badge";
import { useAccount } from "@/hooks/use-account";
import { getSupabase } from "@/lib/supabase";

const noop = () => () => {};
const scorerHref = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app${path}`;

/** Home page: what's live now, your teams, and the next thing to do. All real data. */
export function Dashboard() {
  const supabase = getSupabase();
  const { account } = useAccount();
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    ensureSession(supabase)
      .then(() => listTeams(supabase))
      .then((t) => !cancelled && setTeams(t))
      .catch(() => !cancelled && setTeams([]));
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // The page is pre-rendered at build time, so the date is filled in on the client only.
  const today = useSyncExternalStore(
    noop,
    () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    () => "",
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-7 px-4 pb-16 pt-8 sm:px-6">
      <div>
        <p className="mb-1 min-h-6 font-medium text-muted">{today}</p>
        <h1 className="font-display text-[40px] font-bold uppercase leading-none sm:text-[44px]">Match day</h1>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="live-h" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="live-h" className="font-display text-2xl font-bold uppercase">Live now</h2>
            <Link href="/matches/" className="inline-flex min-h-11 items-center font-bold text-pitch">All live matches →</Link>
          </div>
          <LiveMatches />
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <section aria-labelledby="actions-h" className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5">
            <h2 id="actions-h" className="font-display text-[22px] font-bold uppercase">Quick start</h2>
            <a href={scorerHref("/score")} className="flex min-h-14 items-center gap-3 rounded-xl bg-gold-tint px-4 font-bold text-ink hover:bg-gold/30">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-scoreboard">▶</span>
              Score a match
            </a>
            <Link href="/teams/" className="flex min-h-14 items-center gap-3 rounded-xl bg-pitch-tint px-4 font-bold text-ink hover:bg-pitch/15">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-pitch text-lg text-white">+</span>
              Add a team
            </Link>
            {account?.isGuest && (
              <p className="rounded-xl bg-ground px-4 py-3 text-sm leading-snug text-ink-soft">
                You&apos;re a guest on this device.{" "}
                <Link href="/signup/" className="font-bold text-pitch underline">Sign up</Link> to keep your teams and matches.
              </p>
            )}
          </section>

          <section aria-labelledby="teams-h" className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 id="teams-h" className="font-display text-[22px] font-bold uppercase">Teams</h2>
              {teams && teams.length > 0 && <span className="text-sm text-muted">{teams.length}</span>}
            </div>
            {teams === null ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted">No teams yet. Add one to start scoring.</p>
            ) : (
              <ul className="flex flex-col">
                {teams.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link href="/teams/" className="flex min-h-12 items-center gap-3 rounded-lg px-1 hover:bg-ground">
                      <TeamBadge code={t.shortCode} color={t.color} logoUrl={t.logoUrl} size={32} />
                      <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
                      <span className="text-[13px] text-muted">{t.playerCount} players</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
