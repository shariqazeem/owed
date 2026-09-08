import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { db, schema } from "./index";
import type { ReadLedger } from "@/agent/ledger-schema";

const now = () => Math.floor(Date.now() / 1000);
const toBase = (amount: number) => Math.round(amount * 1_000_000);

/** Persist what the Reader read. Money is converted to base units HERE, in code, never by the model. */
export function createLedgerFromReading(ownerKey: string, sourceKind: string, r: ReadLedger) {
  const t = now();
  const ledgerId = `led_${nanoid(10)}`;
  db.insert(schema.ledgers)
    .values({
      id: ledgerId, ownerKey, title: r.title, sourceKind, sourceSummary: r.sourceSummary,
      currency: r.currency.toUpperCase(), payoutLabel: r.payoutLabel, status: "collecting", createdAt: t, updatedAt: t,
    })
    .run();
  const rows = r.people.map((p) => {
    const personId = `per_${nanoid(10)}`;
    db.insert(schema.people)
      .values({ id: personId, ledgerId, name: p.name, channel: p.handle ? channelOf(p.handle) : null, handle: p.handle, createdAt: t })
      .run();
    const obligationId = `obl_${nanoid(10)}`;
    db.insert(schema.obligations)
      .values({
        id: obligationId, ledgerId, personId, amountBase: toBase(p.amount), note: p.note,
        dueAt: p.dueAt ? Math.floor(Date.parse(p.dueAt) / 1000) || null : null,
        linkSecret: `0x${randomBytes(32).toString("hex")}`, createdAt: t,
      })
      .run();
    return { personId, obligationId, name: p.name, amountBase: toBase(p.amount) };
  });
  db.insert(schema.events)
    .values({ ledgerId, kind: "read", actor: "reader", detail: JSON.stringify({ people: rows.length, uncertainties: r.uncertainties }), createdAt: t })
    .run();
  return { ledgerId, people: rows };
}

function channelOf(handle: string): string {
  if (/@.+\..+/.test(handle) && !handle.startsWith("@")) return "email";
  if (handle.startsWith("@")) return "telegram";
  return "link";
}

export function getLedger(id: string) {
  const ledger = db.select().from(schema.ledgers).where(eq(schema.ledgers.id, id)).get() ?? null;
  if (!ledger) return null;
  const people = db.select().from(schema.people).where(eq(schema.people.ledgerId, id)).all();
  const obligations = db.select().from(schema.obligations).where(eq(schema.obligations.ledgerId, id)).all();
  const events = db.select().from(schema.events).where(eq(schema.events.ledgerId, id)).all();
  return { ledger, people, obligations, events };
}
