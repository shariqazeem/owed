import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getLedger } from "@/lib/db/ledgers";
import { canView, currentOwner } from "@/lib/auth/session";
import { setPayoutAddress } from "@/lib/settle/settler";
import { absolute } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner has looked at what the agent read, fixed what needed fixing, and says go. Edits are
 * applied here in code (a name, an amount, a note, a person dropped), the ledger starts collecting,
 * and the board opens with the agent's first run streaming onto it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = getLedger(id);
  if (!data) return NextResponse.json({ error: "No such ledger." }, { status: 404 });
  const owner = await currentOwner();
  if (!canView(data.ledger.ownerKey, owner)) return NextResponse.json({ error: "Not yours." }, { status: 404 });
  const form = await req.formData();
  const t = Math.floor(Date.now() / 1000);
  let changed = 0;
  for (const o of data.obligations) {
    if (form.get(`drop_${o.id}`)) {
      db.delete(schema.obligations).where(eq(schema.obligations.id, o.id)).run();
      db.delete(schema.people).where(eq(schema.people.id, o.personId)).run();
      changed++;
      continue;
    }
    const name = String(form.get(`name_${o.id}`) ?? "").trim();
    const amount = Number(String(form.get(`amount_${o.id}`) ?? "").replace(/[, ]/g, ""));
    const note = String(form.get(`note_${o.id}`) ?? "").trim();
    const person = data.people.find((p) => p.id === o.personId);
    if (name && person && name !== person.name) { db.update(schema.people).set({ name }).where(eq(schema.people.id, person.id)).run(); changed++; }
    if (Number.isFinite(amount) && amount > 0) {
      const base = Math.round(amount * 1_000_000);
      if (base !== o.amountBase) { db.update(schema.obligations).set({ amountBase: base }).where(eq(schema.obligations.id, o.id)).run(); changed++; }
    }
    if (note !== (o.note ?? "")) { db.update(schema.obligations).set({ note: note || null }).where(eq(schema.obligations.id, o.id)).run(); changed++; }
  }
  const payoutTo = String(form.get("payoutTo") ?? "").trim();
  if (payoutTo && payoutTo !== data.ledger.payoutTo) setPayoutAddress(id, payoutTo);
  if (changed) db.insert(schema.events).values({ ledgerId: id, kind: "reviewed", actor: "owner", detail: `${changed} change${changed > 1 ? "s" : ""} to what the agent read`, createdAt: t }).run();
  db.update(schema.ledgers).set({ status: "collecting", updatedAt: t }).where(eq(schema.ledgers.id, id)).run();
  db.insert(schema.events).values({ ledgerId: id, kind: "started", actor: "owner", detail: "start collecting", createdAt: t }).run();
  return NextResponse.redirect(absolute(`/l/${id}?run=ask`, req), 303);
}
