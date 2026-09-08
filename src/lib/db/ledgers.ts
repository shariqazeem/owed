import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { db, schema } from "./index";
import type { ReadLedger } from "@/agent/ledger-schema";
import type { StampedRate } from "@/lib/money/rates";

const now = () => Math.floor(Date.now() / 1000);
const toBase = (amount: number) => Math.round(amount * 1_000_000);

/** Persist what the Reader read. Money is converted to base units HERE, in code, never by the model. */
export function createLedgerFromReading(ownerKey: string, sourceKind: string, r: ReadLedger, rate: StampedRate) {
  const t = now();
  const ledgerId = `led_${nanoid(10)}`;
  db.insert(schema.ledgers)
    .values({
      id: ledgerId, ownerKey, title: r.title, sourceKind, sourceSummary: r.sourceSummary,
      currency: r.currency.toUpperCase(), rateUsdcPerUnit: rate.usdcPerUnit, rateSource: rate.source,
      payoutLabel: r.payoutLabel, status: "collecting", createdAt: t, updatedAt: t,
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
        linkSecret: `0x${randomBytes(32).toString("hex")}`, startCode: `o${nanoid(8)}`, createdAt: t,
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
  const messages = db.select().from(schema.messages).where(eq(schema.messages.ledgerId, id)).all();
  const decisions = db.select().from(schema.decisions).where(eq(schema.decisions.ledgerId, id)).all();
  return { ledger, people, obligations, events, messages, decisions };
}

/** The one-time link resolves to exactly one obligation, its person, and the ledger it belongs to. */
export function getObligationBySecret(secret: string) {
  const o = db.select().from(schema.obligations).where(eq(schema.obligations.linkSecret, secret)).get() ?? null;
  if (!o) return null;
  const ledger = db.select().from(schema.ledgers).where(eq(schema.ledgers.id, o.ledgerId)).get() ?? null;
  const person = db.select().from(schema.people).where(eq(schema.people.id, o.personId)).get() ?? null;
  return ledger && person ? { obligation: o, ledger, person } : null;
}

/** Record a verified incoming payment against an obligation. Idempotent on the transaction hash. */
export function markPaid(obligationId: string, ledgerId: string, tx: { txHash: string; from: string; to: string; amountBase: bigint; chainId: number }) {
  const t = now();
  const existing = db.select().from(schema.payments).where(eq(schema.payments.txHash, tx.txHash)).get();
  if (existing) return existing;
  const row = { id: `pay_${nanoid(10)}`, ledgerId, obligationId, direction: "in", amountBase: Number(tx.amountBase), chainId: tx.chainId, txHash: tx.txHash, fromAddress: tx.from, toAddress: tx.to, confirmedAt: t };
  db.insert(schema.payments).values(row).run();
  db.update(schema.obligations).set({ status: "paid", paidAt: t, paidTx: tx.txHash }).where(eq(schema.obligations.id, obligationId)).run();
  db.insert(schema.events).values({ ledgerId, kind: "paid", actor: "settler", detail: JSON.stringify({ obligationId, txHash: tx.txHash, amountBase: Number(tx.amountBase) }), createdAt: t }).run();
  db.update(schema.ledgers).set({ updatedAt: t }).where(eq(schema.ledgers.id, ledgerId)).run();
  return row;
}

/** USDC in minus USDC out for one ledger, in 6-dp base units, straight from the payments table. */
export function ledgerMoney(ledgerId: string) {
  const rows = db.select().from(schema.payments).where(eq(schema.payments.ledgerId, ledgerId)).all();
  const collected = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.amountBase, 0);
  const paidOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.amountBase, 0);
  return { collected, paidOut, held: collected - paidOut, payouts: rows.filter((r) => r.direction === "out") };
}
