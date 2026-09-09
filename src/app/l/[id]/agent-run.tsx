"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Ev = { kind: "step"; label: string; body?: string; to?: string; intent?: string } | { kind: "result"; label: string } | { kind: "done"; report: string } | { kind: "error"; message: string };

/**
 * The agent at work, on the board, as it happens: reading the ledger, writing to each person (the
 * message appears as it is written), asking you something. When it is done the board refreshes and
 * the messages are there with their send buttons.
 */
export function AgentRun({ ledgerId, mode }: { ledgerId: string; mode: "ask" | "nudge" }) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource(`/api/ledgers/${ledgerId}/run?mode=${mode}`);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as Ev;
      setEvents((xs) => [...xs, e]);
      if (e.kind === "done" || e.kind === "error") {
        es.close();
        setState(e.kind === "done" ? "done" : "error");
        router.replace(`/l/${ledgerId}`);
        router.refresh();
      }
    };
    es.onerror = () => { es.close(); setState("done"); router.replace(`/l/${ledgerId}`); router.refresh(); };
    return () => es.close();
  }, [ledgerId, mode, router]);
  return (
    <section className="ar" aria-live="polite">
      <p className="ar-head">
        <span className={`ar-dot is-${state}`} />
        {state === "working" ? (mode === "ask" ? "The agent is writing to everyone" : "The agent is nudging") : state === "done" ? "Done" : "Something went wrong"}
      </p>
      <ol className="ar-steps">
        {events.map((e, i) => {
          if (e.kind === "step") return (
            <li key={i} className="ar-step">
              <b>{e.label}</b>
              {e.body ? <p className="ar-body">{e.body}</p> : null}
            </li>
          );
          if (e.kind === "result") return <li key={i} className="ar-result">{e.label}</li>;
          if (e.kind === "done") return <li key={i} className="ar-done">{e.report}</li>;
          return <li key={i} className="ar-err">{e.message}</li>;
        })}
        {state === "working" && events.length === 0 ? <li className="ar-result">Starting…</li> : null}
      </ol>
    </section>
  );
}
