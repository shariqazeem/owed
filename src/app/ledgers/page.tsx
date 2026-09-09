import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentOwner } from "@/lib/auth/session";
import { TopBar } from "@/components/topbar";
import "./ledgers.css";

export const dynamic = "force-dynamic";

/** Everything the agent is collecting for you, and how far each one has got. */
export default async function Ledgers() {
  const owner = await currentOwner();
  const rows = owner ? db.select().from(schema.ledgers).where(eq(schema.ledgers.ownerKey, owner.key)).orderBy(desc(schema.ledgers.createdAt)).all() : [];
  const cards = rows.map((l) => {
    const obs = db.select().from(schema.obligations).where(eq(schema.obligations.ledgerId, l.id)).all();
    const total = obs.reduce((s, o) => s + o.amountBase, 0);
    const paid = obs.filter((o) => o.status === "paid").reduce((s, o) => s + o.amountBase, 0);
    const open = obs.filter((o) => o.status === "owed").length;
    return { l, total, paid, open, people: obs.length, pct: total ? Math.round((paid / total) * 100) : 0 };
  });
  return (
    <>
      <TopBar />
      <main className="lg">
        <p className="lg-kicker">Owed · my ledgers</p>
        <h1>{cards.length ? "What the agent is collecting for you" : "Nothing yet"}</h1>
        {!owner ? <p className="lg-lede">Drop something on the agent and it shows up here. Sign in with an email to keep them across devices.</p> : null}
        <div className="lg-grid">
          {cards.map(({ l, total, paid, open, people, pct }) => (
            <Link className={`lg-card is-${l.status}`} href={`/l/${l.id}`} key={l.id}>
              <span className="lg-status">{l.status === "draft" ? "draft · review it" : l.status}</span>
              <b>{l.title}</b>
              <span className="lg-meta">{people} people · {open} still owed</span>
              <div className="lg-bar"><div style={{ width: `${pct}%` }} /></div>
              <span className="lg-money">{l.currency} {(paid / 1e6).toLocaleString("en", { maximumFractionDigits: 2 })} of {(total / 1e6).toLocaleString("en", { maximumFractionDigits: 2 })}</span>
            </Link>
          ))}
          <Link className="lg-card lg-new" href="/new"><b>+ Drop something new</b><span className="lg-meta">a screenshot, a chat, an invoice</span></Link>
        </div>
      </main>
    </>
  );
}
