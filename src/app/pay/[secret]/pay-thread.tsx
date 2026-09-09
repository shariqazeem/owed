"use client";
import { useState } from "react";

export interface ThreadMessage { id: string; direction: "in" | "out"; body: string; at: number }

/**
 * The conversation on the payer's page. Everything the agent has written to this person, whatever
 * they wrote back, and a box to write more. The agent answers here, in a few seconds.
 */
export function PayThread({ secret, initial, owner, stopped }: { secret: string; initial: ThreadMessage[]; owner: string; stopped: boolean }) {
  const [thread, setThread] = useState<ThreadMessage[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    const t = text.trim();
    if (t.length < 2 || busy) return;
    setBusy(true);
    setErr(null);
    setThread((x) => [...x, { id: `tmp_${Date.now()}`, direction: "in", body: t, at: Date.now() / 1000 }]);
    setText("");
    try {
      const res = await fetch(`/api/pay/${secret}/reply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t }) });
      const j = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
      if (j.ok && j.reply) setThread((x) => [...x, { id: `r_${Date.now()}`, direction: "out", body: j.reply!, at: Date.now() / 1000 }]);
      else setErr(j.error ?? "No answer.");
    } catch {
      setErr("Could not reach the agent.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pt" aria-label="Talk to the agent">
      <h2 className="pt-head">{thread.length ? "The conversation" : `Ask Owed anything about this`}</h2>
      <div className="pt-thread">
        {thread.map((m) => (
          <div className={`pt-msg is-${m.direction}`} key={m.id}>
            <span className="pt-who">{m.direction === "out" ? "Owed" : "you"}</span>
            <p>{m.body}</p>
          </div>
        ))}
        {busy ? <div className="pt-msg is-out is-thinking"><span className="pt-who">Owed</span><p>…</p></div> : null}
      </div>
      {stopped ? (
        <p className="pt-fine">You asked Owed to stop; it will not write to you again.</p>
      ) : (
        <div className="pt-box">
          <input className="pt-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} placeholder={`What is this for? I'll pay Friday. I already paid ${owner} in cash…`} maxLength={600} />
          <button className="pt-send" onClick={send} disabled={busy || text.trim().length < 2}>{busy ? "…" : "Send"}</button>
        </div>
      )}
      {err ? <p className="py-err">{err}</p> : null}
    </section>
  );
}
