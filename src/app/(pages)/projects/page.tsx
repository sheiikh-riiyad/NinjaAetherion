import type { Metadata } from "next";
import { PageIntro, ProjectCTA } from "@/components/page-intro";
import ProjectGallery from "@/components/project-gallery";
export const metadata: Metadata = { title: "Projects | Ninja Aetherion", description: "Explore interface and website concepts by Ninja Aetherion." };
export default function Projects() {
  return <><PageIntro label="SELECTED EXPLORATIONS" title="Ideas made visible." accent="Details made deliberate." description="A growing collection of digital directions. Explore the thinking, the interfaces, and the possibilities behind each concept." /><ProjectGallery /><ProjectCTA /></>;
}
