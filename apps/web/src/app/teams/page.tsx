import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { TeamsManager } from "@/components/teams-manager";

export const metadata: Metadata = { title: "Teams · Score Masterz" };

export default function TeamsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/teams" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
        <h1 className="font-display text-[44px] font-bold uppercase leading-none">Teams</h1>
        <TeamsManager />
      </main>
    </div>
  );
}
