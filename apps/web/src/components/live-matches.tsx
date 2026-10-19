"use client";

import { listLiveMatches, type MatchSummary } from "@score-masterz/data";
import { summariseInnings } from "@score-masterz/scoring";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LiveTag, TeamBadge } from "@/components/team-badge";
import { useLiveBalls } from "@/hooks/use-live-balls";
import { getSupabase } from "@/lib/supabase";

export function LiveMatches() {
  const supabase = getSupabase();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    listLiveMatches(supabase)
      .then((m) => !cancelled && setMatches(m))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const inningsIds = useMemo(() => matches?.flatMap((m) => m.innings.map((i) => i.id)) ?? [], [matches]);
  const { balls, error: ballsError } = useLiveBalls(supabase, inningsIds);

  if (!supabase) {
    return (
      <p role="alert" className="rounded-2xl border border-gold/50 bg-gold-tint p-5 text-gold-ink">
        Supabase is not configured. See <code>apps/web/.env.example</code>.
      </p>
    );
  }
  if (error || ballsError) {
    return (
      <p role="alert" className="rounded-xl border border-wicket/40 bg-[#FDECEA] px-4 py-3 font-medium text-wicket">
        {error ?? ballsError}
      </p>
    );
  }
  if (matches === null) return <p className="text-muted">Loading matches…</p>;
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-muted">
        No matches are being scored right now. Start one from the Score tab in the mobile app.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {matches.map((m) => {
        const latest = m.innings[m.innings.length - 1];
        const s = latest ? summariseInnings(balls?.[latest.id] ?? [], m.rules) : null;
        const batting = latest?.battingTeamId === m.teamB.id ? m.teamB : m.teamA;
        return (
          <li key={m.id}>
            <Link
              href={{ pathname: "/matches/view", query: { id: m.id } }}
              className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 hover:border-pitch"
            >
              <span className="flex items-center justify-between">
                <LiveTag />
                <span className="text-[13px] text-muted">{m.venue ?? `${m.rules.oversPerInnings} overs`}</span>
              </span>
              {[m.teamA, m.teamB].map((t) => (
                <span key={t.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-bold">
                    <TeamBadge code={t.shortCode} color={t.color} logoUrl={t.logoUrl} size={32} />
                    {t.name}
                  </span>
                  {s && t.id === batting.id && (
                    <span className="font-display text-2xl font-bold">
                      {s.runs}/{s.wickets} <span className="text-base font-medium text-muted">({s.overs})</span>
                    </span>
                  )}
                </span>
              ))}
              <span className="font-bold text-pitch">Open scorecard →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
