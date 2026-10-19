import type { Metadata } from "next";

import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Sign up · Score Masterz" };

// Full-screen split layout from the design; the brand panel links home, so no site header here.
export default function Page() {
  return <SignupForm />;
}
