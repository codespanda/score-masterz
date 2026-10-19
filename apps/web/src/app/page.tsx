import { Dashboard } from "@/components/dashboard";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/" />
      <Dashboard />
    </div>
  );
}
