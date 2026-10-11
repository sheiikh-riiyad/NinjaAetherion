"use client";

import { useEffect, useRef, useState } from "react";
import { getBlob, ref } from "firebase/storage";
import { getFirebase } from "@/lib/firebase";

export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
export type Attachment = { path: string; name: string; size: number; type: string };
function kind(type: string) {
  if (["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"].includes(type)) return "image";
  if (["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(type)) return "video";
  return "file";
}
function Media({ url, type, name }: { url: string; type: string; name: string }) {
  if (kind(type) === "image") {
    // Blob URLs are authenticated downloads and cannot use Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="messenger-media" src={url} alt={name} loading="lazy" />;
  }
  if (kind(type) === "video") return <video className="messenger-media" src={url} controls preload="metadata" aria-label={name} />;
  return <span className="messenger-file-icon" aria-hidden="true"><svg width="28" height="32" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 1h10l6 6v20H4zM14 1v7h6M8 13h8M8 18h8"/></svg></span>;
}
export function AttachmentPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (kind(file.type) === "file") return;
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => { reader.onload = null; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [file]);
  if (kind(file.type) === "file") return <Media url="" type={file.type} name={file.name} />;
  return url ? <Media url={url} type={file.type} name={file.name} /> : null;
}
export function ChatAttachment({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    function load() {
    getBlob(ref(getFirebase().storage, attachment.path), MAX_ATTACHMENT_SIZE).then(blob => {
      if (!alive) return;
      // Treat untrusted generic attachments as binary downloads.
      objectUrl = URL.createObjectURL(new Blob([blob], { type: kind(attachment.type) === "file" ? "application/octet-stream" : attachment.type }));
      setUrl(objectUrl);
    }).catch(() => { if (alive) setError(true); });
    }
    // Fetch only attachments near the viewport, rather than all 100 messages.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: "200px" });
    if (container.current) observer.observe(container.current);
    return () => { observer.disconnect(); alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.path, attachment.type, attempt]);
  return <div ref={container} className="messenger-attachment">
    {url && <Media url={url} type={attachment.type} name={attachment.name} />}
    <span>{attachment.name}</span>
    <small>{(attachment.size / 1024 / 1024).toFixed(2)} MB</small>
    {url ? <a href={url} download={attachment.name}>Download</a> : error ? <><p role="alert">Cannot load attachment.</p><button type="button" onClick={() =>  { setError(false); setAttempt(value => value + 1); }}>Retry</button></> : <small role="status">Loading attachment...</small>}
  </div>;
}
