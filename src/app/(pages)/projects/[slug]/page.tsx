import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectVisual } from "@/components/project-gallery";
import { ProjectCTA } from "@/components/page-intro";

const concepts = {
  orbit: { name: "Orbit", subtitle: "Less noise. More momentum.", category: "Dashboard / Web application", goal: "How might a small team see the state of its work without getting lost in menus, metrics, and notifications?", approach: "Give the most useful information the most space. A clear overview, a restrained palette, and a consistent hierarchy help the interface feel calm even when the work is busy.", details: ["A single overview brings projects and team activity together.", "Mint accents guide attention to the information that matters.", "Modular cards leave room for a larger product to grow."], next: "The next step would be interviewing potential users, testing navigation with a clickable prototype, and connecting real project data." },
  forma: { name: "Forma", subtitle: "Space for the extraordinary.", category: "Storefront / Brand experience", goal: "How might an independent design brand give its products an expressive digital home without overwhelming the objects themselves?", approach: "Borrow from editorial design: generous margins, warm neutrals, sculptural forms, and typography with personality. Let the composition tell a story before asking visitors to browse.", details: ["An oversized editorial headline creates a confident first impression.", "Warm tones make a quiet contrast to conventional storefront layouts.", "Product forms become the focal point, supported by minimal navigation."], next: "The next step would be developing product pages, testing the shopping journey, and integrating a commerce platform and checkout." },
};
export function generateStaticParams() { return Object.keys(concepts).map(slug => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const concept = Object.prototype.hasOwnProperty.call(concepts, slug) ? concepts[slug as keyof typeof concepts] : undefined;
  return { title: concept ? `${concept.name} — Design Concept | Ninja Aetherion` : "Project not found | Ninja Aetherion" };
}
export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!Object.prototype.hasOwnProperty.call(concepts, slug)) notFound();
  const key = slug as keyof typeof concepts;
  const concept = concepts[key];
  return <><section className="wrap page-intro"><Link className="text-link" href="/projects">← All projects</Link><p className="eyebrow case-label">SELF-DIRECTED DESIGN CONCEPT</p><h1>{concept.name}<span className="cyan">✦</span></h1><p>{concept.subtitle}</p><div className="case-meta"><span>{concept.category}</span><span>Role: concept & interface design</span><span>Status: visual exploration</span></div></section><div className="wrap case-showcase"><ProjectVisual kind={key} /></div><section className="wrap case-story"><div><p className="eyebrow">01 / THE QUESTION</p><h2>{concept.goal}</h2></div><div><p className="eyebrow">02 / THE DIRECTION</p><p>{concept.approach}</p><ul>{concept.details.map(detail => <li key={detail}>{detail}</li>)}</ul></div><div><p className="eyebrow">03 / WHAT COMES NEXT</p><p>{concept.next}</p><p className="honest-note">This is a concept study. No client outcomes, performance gains, or production results are claimed.</p></div></section><ProjectCTA /></>;
}
