import type { Metadata } from "next";
import { AccountSection } from "@/components/account-section";

export const metadata: Metadata = { title: "My Account | Ninja Aetherion", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountSection />;
}
