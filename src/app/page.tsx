"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/site-shell";

const services = [
  { number: "01", icon: "</>", title: "Web development", text: "Fast, responsive websites that feel as good as they look. Built around your brand and your business.", tags: "React · Next.js · JavaScript" },
  { number: "02", icon: "⌘", title: "Web applications", text: "From a first idea to a fully working product. Thoughtful interfaces for the things your customers do every day.", tags: "Dashboards · SaaS · Custom tools" },
  { number: "03", icon: "↗", title: "Make it better", text: "Give your existing website a fresh start. Cleaner experiences, smoother interactions, and room to grow.", tags: "Redesigns · Performance · Integrations" },
];

const socialLinks = [
  { name: "GitHub", href: "https://github.com/sheiikh-riiyad" },
  { name: "Facebook", href: "https://www.facebook.com/SHEIIKH.RIIYAD" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/sheikh-riyad-5a525a441/" },
];

function SocialLinks() {
  return (
    <nav className="social-links" aria-label="Social media">
      {socialLinks.map(({ name, href }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name + " (opens in a new tab)"}>
          {name} <span aria-hidden="true">&#8599;</span>
        </a>
      ))}
    </nav>
  );
}

export default function Home() {
  const [service, setService] = useState("A new website");
  const [notice, setNotice] = useState("");

  function createBrief(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = `PROJECT BRIEF — NINJA AETHERION\n\nName: ${data.get("name")}\nEmail: ${data.get("email")}\nProject: ${service}\n\n${data.get("details")}\n`;
    const url = URL.createObjectURL(new Blob([brief], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ninja-aetherion-project-brief.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Your project brief has been downloaded. Nothing has been sent yet; direct contact will be available soon.");
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow availability"><span className="status-dot" /> OPEN FOR COLLABORATION</div>
            <h1>Your next big idea.<br />My next <span className="outlined">mission.</span><span className="cyan">✦</span></h1>
            <p className="hero-description">I turn ambitious ideas into exceptional digital experiences. JavaScript engineer. Creative problem solver. Your partner in building what’s next.</p>
            <div className="hero-actions"><a className="button primary" href="#contact">Let’s build something <span>↗</span></a><Link className="text-link" href="/projects">Explore my work <span>↓</span></Link></div>
            <div className="hero-signature"><div className="avatar"><Image src="/images/developer.jpg" alt="The developer behind Ninja Aetherion" width={44} height={44} /></div><div>One developer. Endless possibilities.<span>Real conversations. Thoughtful code.</span></div></div>
          </div>
          <div className="hero-art">
            <div className="art-grid" />
            <div className="art-coordinate top-coordinate">NA / DIGITAL CRAFTSMAN</div>
            <div className="orbital orbital-one" /><div className="orbital orbital-two" />
            <Image className="ninja-art" src="/images/ninja-aetherion.png" alt="Ninja Aetherion, a neon ninja silhouetted against a connected digital globe" width={1254} height={1254} priority sizes="(max-width: 760px) 90vw, 48vw" />
            <div className="floating-code"><span className="code-dot" /><code>const ideas = <span>await</span> build();</code></div>
            <div className="art-coordinate bottom-coordinate"><span>CREATIVITY × CODE</span><span>01 — ∞</span></div>
            <span className="art-star" aria-hidden="true">✧</span>
          </div>
        </section>
        <div className="stack-strip"><div className="wrap stack-inner"><span className="stack-label">MY CREATIVE TOOLKIT</span><span><b className="js-icon">JS</b> JavaScript</span><span><b className="react-icon">⚛</b> React</span><span><b className="next-icon">N</b> Next.js</span><span><b className="ts-icon">TS</b> TypeScript</span><span><b className="web-icon">⌘</b> Web technologies</span></div></div>
        <section id="services" className="section wrap">
          <div className="section-heading"><div><p className="eyebrow">01 / WHAT I DO</p><h2>Big ideas.<br /><span className="muted">Built with precision.</span></h2></div><p>You bring the vision. I bring the code.<br />Together, we create something that works<br className="desktop-break" /> beautifully for your business.</p></div>
          <div className="services-grid">{services.map(item => <a className="service-card" href="#contact" key={item.number} onClick={() => setService(item.number === "01" ? "A new website" : item.number === "02" ? "A web application" : "An existing website")}><div className="card-top"><span className="service-icon">{item.icon}</span><span className="card-number">/{item.number}</span></div><h3>{item.title}</h3><p>{item.text}</p><div className="card-bottom"><span>{item.tags}</span><span className="card-arrow">↗</span></div></a>)}</div>
        </section>
        <section id="work" className="section wrap work-section">
          <div className="section-heading"><div><p className="eyebrow">02 / POSSIBILITIES</p><h2>A little vision.<br /><span className="muted">A lot of potential.</span></h2></div><p>A glimpse of what we could build together.<br />Concept directions, ready for your next idea.</p></div>
          <div className="projects-grid">
            <Link className="project" href="/projects/orbit"><div className="project-preview dashboard-preview"><span className="concept-label">CONCEPT / 01</span><div className="mock-dashboard"><aside><span className="mock-brand">◈ orbit</span><span className="mock-active">▦ Overview</span><span>↗ Analytics</span><span>◷ Activity</span><span>⚙ Settings</span></aside><div className="mock-content"><div className="mock-toolbar">Workspace overview <span>↗</span></div><div className="mock-stat"><span>Make sense of your business</span><strong>Everything. In orbit.</strong></div><div className="chart">{[30, 44, 35, 62, 46, 71, 55, 84, 69, 95, 80, 100].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="mock-caption">Your next move, made clearer. <span>↗</span></div></div></div></div><div className="project-description"><div><h3>Orbit — a smarter workspace</h3><p>Dashboard concept · Web application</p></div><span>↗</span></div></Link>
            <Link className="project" href="/projects/forma"><div className="project-preview studio-preview"><span className="concept-label">CONCEPT / 02</span><div className="mock-studio"><div className="studio-nav">FORMA<span>Independent by design ↗</span></div><div className="studio-body"><span>OBJECTS WITH INTENTION</span><strong>Less, but<br /><em>better.</em></strong><div className="sculpture"><div /><div /><div /></div><span className="studio-bottom">A space for extraordinary things. <b>↗</b></span></div></div></div><div className="project-description"><div><h3>Forma — a digital storefront</h3><p>Brand experience concept · Website</p></div><span>↗</span></div></Link>
          </div>
        </section>
        <section id="about" className="section wrap about-section"><div className="portrait-frame"><Image src="/images/developer.jpg" alt="Portrait of the software engineer behind Ninja Aetherion" width={832} height={829} sizes="(max-width: 760px) 90vw, 35vw" /><span className="portrait-caption">THE HUMAN BEHIND THE CODE <span>↗</span></span></div><div className="about-copy"><p className="eyebrow">03 / BEHIND THE MASK</p><h2>A ninja in code.<br /><span className="muted">A partner in your corner.</span></h2><p>Hey, I’m the developer behind Ninja Aetherion. I’m a JavaScript software engineer who loves turning a “what if” into something you can actually use.</p><p>I believe great websites start with listening. Understanding your goals, asking the right questions, and caring about the small details — that’s how I approach every build.</p><div className="about-values"><span>✦ Thoughtful by design</span><span>✦ Built together</span><span>✦ Made for the web</span></div><a href="#contact" className="text-link">Get to know your next developer <span>↗</span></a></div></section>
        <section className="section wrap process"><p className="eyebrow">04 / THE GAME PLAN</p><h2>From “what if” to <span className="muted">it’s live.</span></h2><div className="process-grid">{[["01", "We talk", "Your idea, your goals, your people. First, let’s get on the same page."], ["02", "I build", "Design meets development, with clear updates and room for your feedback."], ["03", "We launch", "The final details, a smooth handover, and your next chapter online."]].map(([n,t,d]) => <div key={n}><span className="process-number">{n} <span>⟶</span></span><h3>{t}</h3><p>{d}</p></div>)}</div></section>
        <section id="contact" className="contact-section"><div className="wrap contact-grid"><div><p className="eyebrow"><span className="status-dot" /> LET’S MAKE IT HAPPEN</p><h2>Have an idea?<br />Let’s give it<br /><span className="cyan">a life online.</span> <span className="contact-star">✦</span></h2><p>Tell me a little about what you have in mind.<br />Great things start with a simple hello.</p><SocialLinks /></div><form onSubmit={createBrief} className="contact-form"><div className="form-row"><label>Your name<input name="name" autoComplete="name" placeholder="Alex Morgan" required maxLength={100} /></label><label>Your email<input type="email" name="email" autoComplete="email" placeholder="alex@company.com" required maxLength={200} /></label></div><label>What are we building?<select value={service} onChange={e => setService(e.target.value)}><option>A new website</option><option>A web application</option><option>An existing website</option><option>Something else</option></select></label><label>A little about your idea<textarea name="details" placeholder="The idea, the goals, the big dream…" rows={3} required maxLength={5000} /></label><button className="button primary" type="submit">Prepare my project brief <span>↗</span></button><p className="form-note" role="status">{notice || "Download your brief to keep your ideas together. Direct contact is coming soon."}</p></form></div></section>
      </main>
      <footer className="wrap footer"><a href="#" className="footer-brand">✦ NINJA AETHERION<span>.dev</span></a><p>© {new Date().getFullYear()} Ninja Aetherion. Crafted with intent.</p><a href="#main">Back to top ↑</a></footer>
    </>
  );
}
