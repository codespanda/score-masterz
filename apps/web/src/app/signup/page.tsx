import type { Metadata } from "next";

import { SignupForm } from "@/components/signup-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Sign up · Score Masterz" };

export default function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/account" />
      <SignupForm />
    </div>
  );
}
