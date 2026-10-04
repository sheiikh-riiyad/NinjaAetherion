import Link from "next/link";

export function PageIntro({ label, title, accent, description }: { label: string; title: string; accent: string; description: string }) {
  return <section className="wrap page-intro"><p className="eyebrow">NINJA AETHERION / {label}</p><h1>{title}<br /><span className="outlined">{accent}</span><span className="cyan">✦</span></h1><p>{description}</p></section>;
}

export function ProjectCTA() {
  return <section className="wrap page-cta"><div><p className="eyebrow">YOUR IDEA COULD BE NEXT</p><h2>Let’s make something <span className="cyan">matter.</span></h2></div><Link className="button primary" href="/contact">Start a conversation <span>↗</span></Link></section>;
}
