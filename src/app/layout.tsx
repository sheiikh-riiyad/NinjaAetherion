import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { UnreadProvider } from "@/components/unread-provider";
import { PresenceProvider } from "@/components/presence-provider";

export const metadata: Metadata = {
  title: "Ninja Aetherion | JavaScript Engineer & Web Developer",
  description:
    "Turn your next big idea into an exceptional digital experience. Ninja Aetherion builds thoughtful websites and web applications with JavaScript, React, and Next.js.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Ninja Aetherion — Your next big idea. My next mission.",
    description: "JavaScript engineer. Creative problem solver. Your partner in building what's next.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><AuthProvider><PresenceProvider><UnreadProvider>{children}</UnreadProvider></PresenceProvider></AuthProvider></body>
    </html>
  );
}
