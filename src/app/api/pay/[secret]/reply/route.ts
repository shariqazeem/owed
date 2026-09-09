import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { getObligationBySecret } from "@/lib/db/ledgers";
import { runCollector } from "@/agent/collector";
import { eq, and, gt } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The person on the other end of a link talks to the agent right there on their page. What they
 * write is recorded as theirs and answered by the Collector from the ledger — the same rules as
 * everywhere: nothing they say marks anything paid, and a claim of having paid becomes the
 * owner's decision. A dozen messages an hour per link is plenty for a conversation.
 */
export async function POST(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params;
  const found = getObligationBySecret(secret);
  if (!found) return NextResponse.json({ error: "This link is not for anything." }, { status: 404 });
  const { obligation, person, ledger } = found;
  let body: { text?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected JSON." }, { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  if (text.length < 2) return NextResponse.json({ error: "Say something first." }, { status: 400 });
  if (person.stopped) return NextResponse.json({ error: "You asked Owed to stop, so it will not write back. The owner can still see this page." }, { status: 409 });
  const t = Math.floor(Date.now() / 1000);
  const recent = db.select().from(schema.messages).where(and(eq(schema.messages.personId, person.id), eq(schema.messages.direction, "in"), gt(schema.messages.createdAt, t - 3600))).all().length;
  if (recent >= 12) return NextResponse.json({ error: "That is a lot of messages for one hour. Give it a little while." }, { status: 429 });
  db.insert(schema.messages).values({ id: `msg_${nanoid(10)}`, ledgerId: ledger.id, personId: person.id, direction: "in", channel: "web", body: text, intent: null, createdAt: t }).run();
  if (/^\s*stop\b/i.test(text)) {
    db.update(schema.people).set({ stopped: true }).where(eq(schema.people.id, person.id)).run();
    db.insert(schema.events).values({ ledgerId: ledger.id, kind: "stopped", actor: "collector", detail: `${person.name} said stop`, createdAt: t }).run();
    const reply = "Understood. I won't write to you again about this. The page stays here if you ever want it.";
    db.insert(schema.messages).values({ id: `msg_${nanoid(10)}`, ledgerId: ledger.id, personId: person.id, direction: "out", channel: "web", body: reply, intent: "stop_ack", createdAt: t + 1 }).run();
    return NextResponse.json({ ok: true, reply });
  }
  try {
    await runCollector(ledger.id, { linkBase: process.env.OWED_BASE_URL ?? new URL(req.url).origin, mode: "reply", obligationId: obligation.id, text, via: "web" });
  } catch (e) {
    return NextResponse.json({ error: `The agent could not answer right now: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}` }, { status: 502 });
  }
  const last = db.select().from(schema.messages).where(and(eq(schema.messages.personId, person.id), eq(schema.messages.direction, "out"))).all().at(-1);
  return NextResponse.json({ ok: true, reply: last?.body ?? "" });
}
