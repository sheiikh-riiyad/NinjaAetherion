"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

export function SkillExplorer() {
  const skills = [{ name: "JavaScript", code: "JS", text: "The language behind the interactions. I use JavaScript to turn static ideas into experiences people can actually use." }, { name: "React", code: "⚛", text: "Reusable components, clear state, and interfaces that respond to the person using them." }, { name: "Next.js", code: "N", text: "The framework behind this portfolio, bringing React pages, routing, and optimized assets together." }, { name: "TypeScript", code: "TS", text: "Clearer contracts for components and data, helping catch mistakes while building." }];
  const [active, setActive] = useState(0);
  return <div className="skill-explorer"><div className="filter-row" aria-label="Explore skills">{skills.map((skill, index) => <button key={skill.name} aria-pressed={index === active} onClick={() => setActive(index)}>{skill.name}</button>)}</div><div className="skill-detail" aria-live="polite"><span>{skills[active].code}</span><div><h3>{skills[active].name}</h3><p>{skills[active].text}</p></div></div></div>;
}

export function Playground() {
  const [color, setColor] = useState("#7df9d4");
  const [radius, setRadius] = useState(24);
  const [glow, setGlow] = useState(35);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);
  return <section className="wrap lab-grid"><article className="lab-panel"><div className="lab-heading"><p className="eyebrow">EXPERIMENT 01 / LIGHT & FORM</p><h2>Your own little glow.</h2><p>Change the light. Shape the corners. Make it yours.</p></div><div className="glow-stage" style={{ "--lab-color": color } as CSSProperties}><div className="glow-card" style={{ borderRadius: radius, boxShadow: `0 0 ${glow}px ${color}55`, borderColor: color }}><span>✦</span><p>BUILT TO FEEL DIFFERENT</p><strong>Hello, possibility.</strong></div></div><div className="lab-controls"><label>Accent<input aria-label="Accent color" type="color" value={color} onChange={e => setColor(e.target.value)} /></label><label>Corner radius <output>{radius}px</output><input type="range" min="0" max="60" value={radius} onChange={e => setRadius(Number(e.target.value))} /></label><label>Glow <output>{glow}px</output><input type="range" min="0" max="80" value={glow} onChange={e => setGlow(Number(e.target.value))} /></label></div><button className="lab-reset" onClick={() => { setColor("#7df9d4"); setRadius(24); setGlow(35); }}>Reset appearance ↺</button></article><article className="lab-panel"><div className="lab-heading"><p className="eyebrow">EXPERIMENT 02 / MOTION</p><h2>A world in motion.</h2><p>A small CSS solar system. Pause and take a closer look.</p></div><div className={`motion-stage${running ? "" : " paused"}`} aria-label={running ? "Animated orbital rings" : "Paused orbital rings"}><div className="lab-orbit ring-a"><i /></div><div className="lab-orbit ring-b"><i /></div><div className="lab-sun">✦</div></div><button className="button primary" onClick={() => setRunning(!running)} aria-pressed={!running}>{running ? "Pause orbit" : "Resume orbit"} <span>{running ? "Ⅱ" : "▷"}</span></button><p className="honest-note">Motion follows your device’s reduced-motion preference.</p></article><article className="lab-panel click-lab"><div className="lab-heading"><p className="eyebrow">EXPERIMENT 03 / REACT STATE</p><h2>Small action. Instant feedback.</h2><p>A tiny interaction powered by React. Every click makes a difference.</p></div><div className="counter-display" aria-live="polite">{String(count).padStart(2, "0")}</div><div className="counter-actions"><button className="button primary" onClick={() => setCount(count + 1)}>Add a spark <span>＋</span></button><button className="lab-reset" onClick={() => setCount(0)}>Reset ↺</button></div></article></section>;
}

export function ContactBrief() {
  const [kind, setKind] = useState("Website");
  const [message, setMessage] = useState("");
  function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = `NINJA AETHERION / PROJECT BRIEF\n\nName: ${data.get("name")}\nEmail: ${data.get("email")}\nProject type: ${kind}\nTimeline: ${data.get("timeline")}\n\nProject details:\n${data.get("details")}\n`;
    const url = URL.createObjectURL(new Blob([brief], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "ninja-aetherion-project-brief.txt"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Brief downloaded. Send its contents in a LinkedIn or Facebook message to start the conversation. This form has not sent your information.");
  }
  return <form className="contact-form brief-form" onSubmit={download}><p className="eyebrow">01 / WHAT DO YOU HAVE IN MIND?</p><div className="filter-row">{["Website", "Web application", "Redesign", "Something else"].map(name => <button type="button" key={name} aria-pressed={kind === name} onClick={() => setKind(name)}>{name}</button>)}</div><div className="form-row"><label>Your name<input name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={200} placeholder="alex@company.com" /></label></div><label>Your ideal timeline<select name="timeline"><option>Let’s discuss</option><option>Within a month</option><option>1–3 months</option><option>Just exploring</option></select></label><label>Tell me about your idea<textarea name="details" required maxLength={5000} rows={5} placeholder="What do you want to build, who is it for, and what would success look like?" /></label><button type="submit" className="button primary">Download my project brief <span>↗</span></button><p role="status" className="form-note">{message || "Your details stay in your browser. Download a brief, then share it with me on LinkedIn or Facebook."}</p></form>;
}
