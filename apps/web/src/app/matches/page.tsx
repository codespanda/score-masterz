import type { Metadata } from "next";

import { LiveMatches } from "@/components/live-matches";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Live matches · Score Masterz" };

export default function MatchesPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/matches" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <h1 className="font-display text-[44px] font-bold uppercase leading-none">Live matches</h1>
        <LiveMatches />
      </main>
    </div>
  );
}
