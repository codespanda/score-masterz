import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Log in · Score Masterz" };

export default function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/account" />
      <LoginForm />
    </div>
  );
}
