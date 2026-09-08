import { notFound } from "next/navigation";
import { getLedger } from "@/lib/db/ledgers";
import "./board.css";

const fmt = (base: number, cur: string) => `${cur} ${(base / 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })}`;

export const dynamic = "force-dynamic";

export default async function Board({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getLedger(id);
  if (!data) notFound();
  const { ledger, people, obligations, events, messages, decisions } = data;
  const byPerson = new Map(people.map((p) => [p.id, p]));
  const total = obligations.reduce((s, o) => s + o.amountBase, 0);
  const paid = obligations.filter((o) => o.status === "paid").reduce((s, o) => s + o.amountBase, 0);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const read = events.find((e) => e.kind === "read");
  const uncertainties: string[] = read?.detail ? (JSON.parse(read.detail).uncertainties ?? []) : [];

  return (
    <main className="bd">
      <p className="bd-kicker">Owed · {ledger.status}</p>
      <h1>{ledger.title}</h1>
      <p className="bd-read">{ledger.sourceSummary}</p>
      {ledger.currency !== "USD" ? (
        <p className="bd-rate">Collected in USDC at 1 {ledger.currency} = {ledger.rateUsdcPerUnit} USDC · {ledger.rateSource}</p>
      ) : null}

      <section className="bd-pot" aria-label="Progress">
        <div className="bd-pot-bar"><div className="bd-pot-fill" style={{ width: `${pct}%` }} /></div>
        <div className="bd-pot-row"><b>{fmt(paid, ledger.currency)}</b> of {fmt(total, ledger.currency)} · {pct}%</div>
      </section>

      <section className="bd-people" aria-label="Who owes what">
        {obligations.map((o) => {
          const p = byPerson.get(o.personId);
          return (
            <div className={`bd-person is-${o.status}`} key={o.id}>
              <div className="bd-person-main">
                <b>{p?.name ?? "?"}</b>
                <span className="bd-note">{o.note ?? ""}</span>
                {o.status !== "paid" ? <a className="bd-link" href={`/pay/${o.linkSecret}`}>their link →</a> : null}
              </div>
              <div className="bd-person-side">
                <span className="bd-amt">{fmt(o.amountBase, ledger.currency)}</span>
                <span className={`bd-pill is-${o.status}`}>{o.status === "owed" ? (o.nudges ? `nudged ×${o.nudges}` : "not asked yet") : o.status.replace("_", " ")}</span>
              </div>
            </div>
          );
        })}
      </section>

      {decisions.filter((d) => !d.answer).length ? (
        <section className="bd-dec">
          <h2>Needs you</h2>
          {decisions.filter((d) => !d.answer).map((d) => (
            <div className="bd-dec-item" key={d.id}><b>{d.question}</b><span>{(JSON.parse(d.options) as string[]).join(" · ")}</span></div>
          ))}
        </section>
      ) : null}

      {messages.length ? (
        <section className="bd-msgs" aria-label="What the agent said">
          <h2>What the agent said</h2>
          {messages.map((m) => (
            <div className={`bd-msg is-${m.direction}`} key={m.id}>
              <span className="bd-msg-meta">{m.direction === "out" ? "→" : "←"} {byPerson.get(m.personId ?? "")?.name ?? "owner"} · {m.channel} · {m.intent ?? ""}</span>
              <p>{m.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      {uncertainties.length ? (
        <section className="bd-unc">
          <h2>What the agent was not sure about</h2>
          <ul>{uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </section>
      ) : null}

      <section className="bd-log" aria-label="What the agent did">
        <h2>What the agent did</h2>
        <ol>{events.map((e) => <li key={e.id}><span className="bd-actor">{e.actor}</span> {e.kind}{e.detail ? <span className="bd-detail"> · {e.detail.slice(0, 120)}</span> : null}</li>)}</ol>
      </section>
    </main>
  );
}
