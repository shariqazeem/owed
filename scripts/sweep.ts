/**
 * The background. Run this on a schedule (every few hours): every collecting ledger gets a Collector
 * pass in nudge mode, so people who were asked and did not pay hear from the agent again — up to
 * three times, after which the owner gets a decision instead. Nothing here decides; it only wakes
 * the agent that does.
 */
import { db, schema } from "../src/lib/db";
import { runCollector } from "../src/agent/collector";
import { eq } from "drizzle-orm";
(async () => {
  const base = process.env.OWED_BASE_URL ?? "http://localhost:3100";
  const minGapSec = Number(process.env.OWED_NUDGE_GAP_HOURS ?? 20) * 3600;
  const cutoff = Math.floor(Date.now() / 1000) - minGapSec;
  const ledgers = db.select().from(schema.ledgers).where(eq(schema.ledgers.status, "collecting")).all();
  for (const l of ledgers) {
    const due = db.select().from(schema.obligations).where(eq(schema.obligations.ledgerId, l.id)).all()
      .filter((o) => o.status === "owed" && (o.lastNudgedAt ?? 0) < cutoff && o.nudges < 3);
    if (!due.length) { console.log(`${l.id} · nothing due`); continue; }
    console.log(`${l.id} · ${due.length} due a nudge`);
    console.log("  ", await runCollector(l.id, { linkBase: base, mode: "nudge" }));
  }
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
