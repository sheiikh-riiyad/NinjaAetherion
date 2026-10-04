"use client";

import Link from "next/link";
import { useState } from "react";

export function ProjectVisual({ kind }: { kind: "orbit" | "forma" }) {
  if (kind === "forma") return <div className="case-art forma-art" aria-label="Forma storefront design concept"><div className="visual-top">FORMA <span>OBJECTS WITH INTENTION</span></div><div className="forma-title">Less, but<br /><em>better.</em></div><div className="forma-object"><i /><i /><i /></div><div className="visual-bottom">A space for extraordinary things. <span>↗</span></div></div>;
  return <div className="case-art orbit-art" aria-label="Orbit dashboard design concept with illustrative data"><div className="visual-top">◈ orbit <span>YOUR WORKSPACE, CONNECTED</span></div><div className="orbit-heading"><span>Workspace overview</span><strong>Everything. In orbit.</strong></div><div className="orbit-metrics"><div>Projects<strong>12</strong></div><div>In progress<strong>04</strong></div><div>Team members<strong>08</strong></div></div><div className="orbit-chart">{[25,42,36,59,44,70,65,89,77,100,90,110].map((height, i) => <i key={i} style={{ height }} />)}</div><div className="visual-bottom">ILLUSTRATIVE DATA <span>↗</span></div></div>;
}

export default function ProjectGallery() {
  const [filter, setFilter] = useState("All concepts");
  const items = [{ slug: "orbit", name: "Orbit", category: "Web applications", description: "A calmer place to keep work moving." }, { slug: "forma", name: "Forma", category: "Websites", description: "An editorial home for considered objects." }] as const;
  const visible = items.filter(item => filter === "All concepts" || item.category === filter);
  return <section className="wrap gallery-section"><div className="filter-row" aria-label="Filter projects">{["All concepts", "Web applications", "Websites"].map(name => <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}<span aria-live="polite">{visible.length} concept{visible.length === 1 ? "" : "s"}</span></div><div className="projects-grid">{visible.map(item => <Link className="project" href={`/projects/${item.slug}`} key={item.slug}><ProjectVisual kind={item.slug} /><div className="project-description"><div><p className="eyebrow">DESIGN EXPLORATION / {item.category}</p><h3>{item.name} — {item.description}</h3><p>Explore the concept and design decisions</p></div><span>↗</span></div></Link>)}</div><p className="honest-note">These are self-directed design concepts, not client commissions or launched products.</p></section>;
}
