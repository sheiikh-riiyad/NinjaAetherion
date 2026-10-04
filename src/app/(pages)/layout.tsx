import { SiteHeader, SiteFooter } from "@/components/site-shell";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#main">Skip to content</a><SiteHeader /><main id="main" className="inner-main">{children}</main><SiteFooter /></>;
}
