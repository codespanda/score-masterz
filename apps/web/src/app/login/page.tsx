import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Log in · Score Masterz" };

// Full-screen split layout from the design; the brand panel links home, so no site header here.
export default function Page() {
  return <LoginForm />;
}
