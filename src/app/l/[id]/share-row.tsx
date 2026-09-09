"use client";
import { useState } from "react";

/** One tap to send the agent's message from the chat you already share: copy, WhatsApp, email, text. */
export function ShareRow({ body, name, subject }: { body: string; name: string; subject: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* the buttons below still work */ }
  };
  const enc = encodeURIComponent(body);
  return (
    <div className="sh">
      <button className="sh-btn" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      <a className="sh-btn" href={`https://wa.me/?text=${enc}`} target="_blank" rel="noreferrer">WhatsApp</a>
      <a className="sh-btn" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${enc}`}>Email</a>
      <a className="sh-btn" href={`sms:?&body=${enc}`}>Text</a>
      <span className="sh-to">to {name}</span>
    </div>
  );
}
