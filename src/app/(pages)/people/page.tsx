import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { ConnectedPeople } from "@/components/connected-people";

export const metadata: Metadata = { title: "Connected People | Ninja Aetherion", description: "Meet the clients connected with Ninja Aetherion, explore their work, and start a conversation." };

export default function PeoplePage() {
  return <><PageIntro label="CONNECTED PEOPLE" title="Good people." accent="Great things together." description="Meet the people I work with, discover what they are building, and connect with each other." /><ConnectedPeople /></>;
}
