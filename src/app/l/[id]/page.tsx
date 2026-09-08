import { notFound } from "next/navigation";
import { getLedger, ledgerMoney } from "@/lib/db/ledgers";
import { agentAddress } from "@/lib/chain/usdc";
import { txUrl } from "@/lib/chain/arc";
import "./board.css";

const fmt = (base: number, cur: string) => `${cur} ${(base / 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })}`;
const usdcFmt = (base: number) => `${(base / 1_000_000).toFixed(2)} USDC`;

export const dynamic = "force-dynamic";

/** The log in words a person reads, not the JSON the agents wrote for each other. */
function describeEvent(e: { kind: string; detail: string | null }, nameOf: Map<string, string>): { text: string; tx?: string } {
  const d = e.detail ?? "";
  const json = (): Record<string, unknown> | null => { try { return JSON.parse(d) as Record<string, unknown>; } catch { return null; } };
  if (e.kind === "read") {
    const j = json();
    const unsure = Array.isArray(j?.uncertainties) ? j.uncertainties.length : 0;
    return { text: j ? `read ${String(j.people)} people from the source${unsure ? `, ${unsure} thing${unsure > 1 ? "s" : ""} unsure` : ""}` : "read the source" };
  }
  if (e.kind === "paid") {
    const j = json();
    const who = typeof j?.obligationId === "string" ? nameOf.get(j.obligationId) : undefined;
    return { text: `verified on Arc: ${who ?? "someone"} paid ${usdcFmt(Number(j?.amountBase ?? 0))}`, tx: typeof j?.txHash === "string" ? j.txHash : undefined };
  }
  if (e.kind === "paid_out") {
    const j = json();
    return { text: `sent ${usdcFmt(Number(j?.amountBase ?? 0))} to ${String(j?.to ?? "").slice(0, 8)}…`, tx: typeof j?.txHash === "string" ? j.txHash : undefined };
  }
  if (e.kind === "payout_address") return { text: `payout address set: ${d.slice(0, 8)}…` };
  if (e.kind === "payout_failed") return { text: `payout failed: ${d}` };
  if (e.kind === "decision:asked") return { text: `asked you: ${d}` };
  if (e.kind.startsWith("decision:")) return { text: `you answered: ${d}` };
  if (e.kind.startsWith("message:")) return { text: `${e.kind.slice(8)} → ${d}` };
  if (e.kind.startsWith("collector:")) return { text: `${e.kind.slice(10)} pass · ${d.slice(0, 160)}` };
  return { text: d ? `${e.kind} · ${d.slice(0, 120)}` : e.kind };
}

export default async function Board({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const data = getLedger(id);
  if (!data) notFound();
  const money = ledgerMoney(id);
  const { ledger, people, obligations, events, messages, decisions } = data;
  const byPerson = new Map(people.map((p) => [p.id, p]));
  const total = obligations.reduce((s, o) => s + o.amountBase, 0);
  const paid = obligations.filter((o) => o.status === "paid").reduce((s, o) => s + o.amountBase, 0);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const read = events.find((e) => e.kind === "read");
  const askedFor = new Set(messages.filter((m) => m.direction === "out" && m.intent === "ask").map((m) => m.personId));
  const lastAsk = (personId: string) => messages.filter((m) => m.personId === personId && m.direction === "out").at(-1);
  const waHref = (personId: string) => { const m = lastAsk(personId); return m ? `https://wa.me/?text=${encodeURIComponent(m.body)}` : null; };
  const uncertainties: string[] = read?.detail ? (JSON.parse(read.detail).uncertainties ?? []) : [];
  const nameOf = new Map(obligations.map((o) => [o.id, byPerson.get(o.personId)?.name ?? "?"]));

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
                {o.status !== "paid" ? (
                  <span className="bd-links">
                    <a className="bd-link" href={`/pay/${o.linkSecret}`}>their link →</a>
                    {waHref(o.personId) ? <a className="bd-link" href={waHref(o.personId)!} target="_blank" rel="noreferrer">forward on WhatsApp →</a> : null}
                  </span>
                ) : null}
              </div>
              <div className="bd-person-side">
                <span className="bd-amt">{fmt(o.amountBase, ledger.currency)}</span>
                <span className={`bd-pill is-${o.status}`}>{o.status === "owed" ? (o.nudges ? `nudged ×${o.nudges}` : askedFor.has(o.personId) ? "asked" : "not asked yet") : o.status.replace("_", " ")}</span>
              </div>
            </div>
          );
        })}
      </section>

      {decisions.filter((d) => !d.answer).length ? (
        <section className="bd-dec">
          <h2>Needs you</h2>
          {decisions.filter((d) => !d.answer).map((d) => (
            <form className="bd-dec-item" key={d.id} action={`/api/decisions/${d.id}`} method="post">
              <b>{d.question}</b>
              <span className="bd-dec-opts">{(JSON.parse(d.options) as string[]).map((opt) => <button key={opt} name="answer" value={opt} type="submit">{opt}</button>)}</span>
            </form>
          ))}
        </section>
      ) : null}

      <section className="bd-money" aria-label="The money">
        <h2>The money</h2>
        <div className="bd-money-row">
          <div><span>collected</span><b>{usdcFmt(money.collected)}</b></div>
          <div><span>paid to you</span><b>{usdcFmt(money.paidOut)}</b></div>
          <div><span>held by the agent</span><b>{usdcFmt(money.held)}</b></div>
        </div>
        <p className="bd-money-line">Payments land in the agent&apos;s wallet <code>{agentAddress()}</code>, verified on Arc before anyone is marked paid.</p>
        {ledger.payoutTo ? (
          <p className="bd-money-line">Goes to <code>{ledger.payoutTo}</code>{ledger.status === "settled" ? " · settled" : money.held > 0 ? " · the agent sends it the moment everyone has paid" : ""}</p>
        ) : (
          <form className="bd-money-form" action={`/api/ledgers/${ledger.id}/payout`} method="post">
            <input name="to" placeholder="0x… your Arc wallet" required pattern="0x[0-9a-fA-F]{40}" title="An Arc address" spellCheck={false} />
            <button type="submit" name="action" value="save">Send it here when everyone has paid</button>
          </form>
        )}
        {ledger.payoutTo && money.held > 0 ? (
          <form action={`/api/ledgers/${ledger.id}/payout`} method="post">
            <button className="bd-money-send" type="submit" name="action" value="send">Send me the {usdcFmt(money.held)} held now</button>
          </form>
        ) : null}
        {money.payouts.map((p) => (
          <p className="bd-money-line" key={p.id}>paid out {usdcFmt(p.amountBase)} · <a className="bd-link" href={txUrl(p.txHash)} target="_blank" rel="noreferrer">receipt →</a></p>
        ))}
        {err ? <p className="bd-err">{err}</p> : null}
      </section>

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
        <ol>
          {events.map((e) => {
            const { text, tx } = describeEvent(e, nameOf);
            return (
              <li key={e.id}>
                <span className="bd-actor">{e.actor}</span> {text}
                {tx ? <> · <a className="bd-link" href={txUrl(tx)} target="_blank" rel="noreferrer">receipt →</a></> : null}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
