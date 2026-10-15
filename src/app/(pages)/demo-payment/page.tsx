import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { DemoPayment } from "@/components/demo-payment";

export const metadata: Metadata = { title: "Demo Payment | Ninja Aetherion", robots: { index: false, follow: false } };
export default function DemoPaymentPage() {
  return <><PageIntro label="PAYMENT PLAYGROUND" title="Try the checkout." accent="Zero real charges." description="Explore a simulated payment from start to finish. Test successful, declined, and cancelled outcomes." /><div className="wrap orders-section"><DemoPayment /></div></>;
}
