import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { AccountSection } from "@/components/account-section";

export const metadata: Metadata = { title: "My Account | Ninja Aetherion", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <><PageIntro label="YOUR ACCOUNT" title="A place to connect." accent="Let’s build together." description="Create a client account or sign in to your existing account." /><AccountSection /></>;
}
