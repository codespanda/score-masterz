import type { Metadata } from "next";
import { Suspense } from "react";

import { MatchFromQuery } from "@/components/match-from-query";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Live scorecard · Score Masterz" };

// The site is a static export (GitHub Pages), so the match id travels in ?id= rather than the path.
export default function MatchPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/matches" />
      <Suspense fallback={<p className="mx-auto mt-8 max-w-7xl px-6 text-muted">Loading scorecard…</p>}>
        <MatchFromQuery />
      </Suspense>
    </div>
  );
}
