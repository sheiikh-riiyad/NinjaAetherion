import type { Metadata } from "next";
import { MessagesSection } from "@/components/account-chat";

export const metadata: Metadata = { title: "Messages | Ninja Aetherion", robots: { index: false, follow: false } };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ client?: string | string[] }> }) {
  const { client } = await searchParams;
  return <MessagesSection initialClient={typeof client === "string" ? client : ""} />;
}
