import type { Metadata } from "next";
import { PageIntro, ProjectCTA } from "@/components/page-intro";
import { Playground } from "@/components/interactive-sections";
export const metadata: Metadata = { title: "Playground | Ninja Aetherion", description: "Try interactive experiments in light, motion, and React." };
export default function PlaygroundPage() { return <><PageIntro label="THE EXPERIMENT LAB" title="A little curiosity." accent="A lot of possibility." description="A space to play with the small details that make digital experiences interesting. Go ahead — touch the controls." /><Playground /><ProjectCTA /></>; }
