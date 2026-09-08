import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner answers a decision the agent handed them. This is the one place a human changes the
 * state of an obligation, and it is recorded as such: the answer, when, and what it did.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = db.select().from(schema.decisions).where(eq(schema.decisions.id, id)).get();
  if (!d) return NextResponse.json({ error: "No such decision." }, { status: 404 });
  if (d.answer) return NextResponse.json({ ok: true, already: d.answer });
  const form = await req.formData();
  const answer = String(form.get("answer") ?? "").trim();
  const options = JSON.parse(d.options) as string[];
  if (!options.includes(answer)) return NextResponse.json({ error: "Pick one of the options." }, { status: 400 });
  const t = Math.floor(Date.now() / 1000);
  db.update(schema.decisions).set({ answer, answeredAt: t }).where(eq(schema.decisions.id, id)).run();
  if (d.context) {
    const status = /write.?off/i.test(answer) ? "written_off" : /dispute/i.test(answer) ? "disputed" : null;
    if (status) db.update(schema.obligations).set({ status }).where(eq(schema.obligations.id, d.context)).run();
  }
  db.insert(schema.events).values({ ledgerId: d.ledgerId, kind: `decision:${d.kind}`, actor: "owner", detail: answer, createdAt: t }).run();
  return NextResponse.redirect(new URL(`/l/${d.ledgerId}`, req.url), 303);
}
