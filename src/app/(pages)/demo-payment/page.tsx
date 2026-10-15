import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { InstallmentPlayground } from "@/components/installment-payments";

export const metadata: Metadata = { title: "Demo Payment | Ninja Aetherion", robots: { index: false, follow: false } };
export default function DemoPaymentPage() {
  return <><PageIntro label="PAYMENT PLAYGROUND" title="Try the checkout." accent="Zero real charges." description="Test your project payments: 20% upfront, 50% at review, and the final 30% at delivery." /><div className="wrap orders-section"><InstallmentPlayground /></div></>;
}
