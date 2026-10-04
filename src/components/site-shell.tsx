"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const socials = [
  { name: "GitHub", href: "https://github.com/sheiikh-riiyad" },
  { name: "Facebook", href: "https://www.facebook.com/SHEIIKH.RIIYAD" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/sheikh-riyad-5a525a441/" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="header wrap">
    <Link className="brand" href="/" aria-label="Ninja Aetherion home"><span className="brand-mark">✦</span><span>NINJA<span className="brand-sub">AETHERION<span className="cyan">.dev</span></span></span></Link>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="site-navigation">{open ? "Close ×" : "Menu ☰"}</button>
    <nav id="site-navigation" className={`navigation site-navigation${open ? " open" : ""}`} aria-label="Main navigation">
      {[["Work", "/projects"], ["Services", "/services"], ["About", "/about"], ["Playground", "/playground"]].map(([name, href]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} onClick={() => setOpen(false)}>{name}</Link>)}
    </nav>
    <Link className="nav-cta" href="/contact" onClick={() => setOpen(false)}>Let’s talk <span>↗</span></Link>
  </header>;
}

export function SocialLinks() {
  return <nav className="social-links" aria-label="Social media">{socials.map(({ name, href }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`}>{name} <span aria-hidden="true">↗</span></a>)}</nav>;
}

export function SiteFooter() {
  return <footer className="wrap footer"><Link href="/" className="footer-brand">✦ NINJA AETHERION<span>.dev</span></Link><p>© {new Date().getFullYear()} Ninja Aetherion. Crafted with intent.</p><SocialLinks /><a href="#main">Back to top ↑</a></footer>;
}
