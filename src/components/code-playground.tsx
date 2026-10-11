"use client";

import { useEffect, useRef, useState } from "react";

type Files = { html: string; css: string; js: string };
type Language = keyof Files;
const starter: Files = {
  html: `<main class="card">
  <span class="badge">YOUR NEXT EXPERIMENT</span>
  <h1>Hello, creator.</h1>
  <p>A little HTML. A little CSS. Endless possibilities.</p>
  <button id="spark">Add a spark ✦</button>
  <p id="result">Make something awesome.</p>
</main>`,
  css: `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0b1512;
  color: #effff7;
  font-family: system-ui, sans-serif;
  padding: 24px;
}
.card {
  padding: 32px;
  border: 1px solid #365c4b;
  border-radius: 24px;
  background: linear-gradient(135deg, #183b2d, #0b1512);
  max-width: 420px;
}
.badge { color: #7df9d4; font-size: 10px; letter-spacing: 2px; }
h1 { font-size: 40px; letter-spacing: -2px; }
p { color: #adc4b7; line-height: 1.7; }
button {
  background: #7df9d4;
  border: 0;
  padding: 14px 20px;
  border-radius: 8px;
  cursor: pointer;
}
button:hover { background: #c0ffe9; }
`,
  js: `let sparks = 0;
const button = document.querySelector("#spark");
const result = document.querySelector("#result");

button.addEventListener("click", () => {
  sparks += 1;
  result.textContent = sparks + " sparks of possibility ✦";
  console.log("Sparks:", sparks);
});

console.log("Your playground is ready!");`,
};
const tabs: { key: Language; file: string; label: string }[] = [
  { key: "html", file: "index.html", label: "HTML" },
  { key: "css", file: "style.css", label: "CSS" },
  { key: "js", file: "script.js", label: "JavaScript" },
];

function previewDocument(files: Files) {
  const payload = JSON.stringify(files).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src data:; base-uri 'none'; form-action 'none'"></head><body><script>
const send = (level, text) => parent.postMessage({kind:'ninja-console',level,text:String(text).slice(0,2000)}, '*');
for (const level of ['log','warn','error']) console[level] = (...args) => send(level, args.map(value => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' '));
window.addEventListener('error', event => send('error', event.message));
window.addEventListener('unhandledrejection', event => send('error', String(event.reason)));
const files = ${payload};
document.body.innerHTML = files.html;
const style = document.createElement('style'); style.textContent = files.css; document.head.append(style);
const script = document.createElement('script'); script.textContent = files.js; document.body.append(script);
</script></body></html>`;
}

export default function CodePlayground() {
  const [files, setFiles] = useState<Files>(starter);
  const [active, setActive] = useState<Language>("html");
  const [document, setDocument] = useState(() => previewDocument(starter));
  const [revision, setRevision] = useState(0);
  const [auto, setAuto] = useState(true);
  const [compact, setCompact] = useState(false);
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);
  const [status, setStatus] = useState("Starter loaded");
  const frame = useRef<HTMLIFrameElement>(null);
  const lines = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.kind !== "ninja-console" || typeof event.data.text !== "string") return;
      const level = ["log", "warn", "error"].includes(event.data.level) ? event.data.level : "log";
      setLogs(previous => [...previous.slice(-49), { level, text: event.data.text.slice(0, 2000) }]);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => {
      setLogs([]);
      setDocument(previewDocument(files));
      setStatus("Preview updated");
    }, 700);
    return () => clearTimeout(timer);
  }, [files, auto]);

  function run() {
    setLogs([]);
    setDocument(previewDocument(files));
    setRevision(value => value + 1);
    setStatus("Preview updated");
  }

  function reset() {
    if (!window.confirm("Replace your code with the starter example?")) return;
    setFiles(starter);
    setLogs([]);
    setDocument(previewDocument(starter));
    setRevision(value => value + 1);
    setStatus("Starter restored");
  }

  return <section className="wrap code-lab" aria-labelledby="code-lab-title">
    <div className="section-heading"><div><p className="eyebrow">EXPERIMENT 04 / YOUR CODE, LIVE</p><h2 id="code-lab-title">Less watching.<br /><span className="muted">More creating.</span></h2></div><p>Your own mini editor. Write HTML, CSS, and JavaScript.<br />Then watch your idea come to life.</p></div>
    <div className="editor-window">
      <div className="editor-titlebar"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>ninja-studio / playground</span><span className="editor-local">LOCAL SESSION</span></div>
      <div className="editor-toolbar"><label><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} /> Auto preview</label><div><button onClick={reset}>Reset</button><button className="editor-run" onClick={run}>▷ Run code</button></div></div>
      <div className="editor-split">
        <div className="source-panel"><div className="file-tabs" aria-label="Editor files">{tabs.map(tab => <button key={tab.key} aria-pressed={active === tab.key} onClick={() => setActive(tab.key)}><span className={`file-icon ${tab.key}`}>{tab.key === "html" ? "<>" : tab.key === "css" ? "#" : "JS"}</span>{tab.file}</button>)}</div>
          <div className="code-input"><div className="line-numbers" ref={lines} aria-hidden="true">{files[active].split("\n").map((_, index) => <div key={index}>{index + 1}</div>)}</div><textarea key={active} aria-label={`${tabs.find(tab => tab.key === active)?.label} code editor`} value={files[active]} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={50000} onScroll={event => { if (lines.current) lines.current.scrollTop = event.currentTarget.scrollTop; }} onChange={event => { setFiles({ ...files, [active]: event.target.value }); setStatus(auto ? "Updating preview…" : "Changes pending — click Run code"); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); run(); } }} /></div>
        </div>
        <div className="preview-panel"><div className="preview-toolbar"><span><i className="status-dot" /> Live preview</span><button aria-pressed={compact} onClick={() => setCompact(!compact)}>{compact ? "Expand preview" : "Narrow preview"}</button></div><div className={`preview-canvas${compact ? " compact" : ""}`}><iframe key={revision} ref={frame} title="Your code preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document} /></div></div>
      </div>
      <div className="console-heading"><span>CONSOLE <span>({logs.length})</span></span><button onClick={() => setLogs([])}>Clear</button></div><div className="editor-console" role="log" aria-label="Preview console">{logs.length ? logs.map((log, index) => <div className={`console-${log.level}`} key={index}><span>{log.level}</span><code>{log.text}</code></div>) : <p>Console output and JavaScript errors appear here.</p>}</div>
      <div className="editor-status"><span role="status">{status}</span><span>{tabs.find(tab => tab.key === active)?.label} · UTF-8 · Ctrl / ⌘ + Enter to run</span></div>
    </div>
    <p className="honest-note">Plain HTML, CSS, and JavaScript. Put scripts in the JavaScript tab. External libraries and network requests are disabled. Your code stays in this tab and resets when you leave or refresh.</p>
  </section>;
}
