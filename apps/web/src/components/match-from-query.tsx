"use client";

import { useSearchParams } from "next/navigation";

import { LiveScorecard } from "@/components/live-scorecard";

export function MatchFromQuery() {
  const id = useSearchParams().get("id");
  if (!id) return <p className="mx-auto mt-8 max-w-7xl px-6 text-muted">No match selected.</p>;
  return <LiveScorecard matchId={id} />;
}
