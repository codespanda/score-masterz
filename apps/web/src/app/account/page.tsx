import type { Metadata } from "next";

import { AccountPanel } from "@/components/account-panel";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Account · Score Masterz" };

export default function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/account" />
      <AccountPanel />
    </div>
  );
}
