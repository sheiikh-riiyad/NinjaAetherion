import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { OrdersSection } from "@/components/orders-section";

export const metadata: Metadata = { title: "Orders | Ninja Aetherion", description: "Start a project, follow its progress, and share your experience working with Ninja Aetherion." };
export default function OrdersPage() {
  return <><PageIntro label="YOUR NEXT PROJECT" title="From a little idea." accent="To something real." description="Request your next project, follow every milestone, and keep everything in one place." /><OrdersSection /></>;
}
