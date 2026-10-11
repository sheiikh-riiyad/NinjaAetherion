import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { AccountSection } from "@/components/account-section";

export const metadata: Metadata = { title: "Admin | Ninja Aetherion", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <><PageIntro label="ADMINISTRATION" title="Behind the scenes." accent="Your workspace." description="Sign in with your administrator account to view registered accounts." /><AccountSection adminOnly /></>;
}
