import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { ownerDisplay } from "@/lib/db/ledgers";

/**
 * Telegram, the honest way. A bot cannot message a person who never opened it, so every ask carries a
 * deep link; the moment the person taps it the bot learns their chat and can talk to them directly.
 * Until then, the message lives on the board and the owner forwards it. Replies come back through
 * the same bot: "stop" is honoured immediately and forever; "paid" is recorded for the Settler to
 * check, never taken as true.
 */
const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
export const botUsername = () => process.env.TELEGRAM_BOT_USERNAME ?? "";
export const deepLink = (startCode: string) => (botUsername() ? `https://t.me/${botUsername()}?start=${startCode}` : null);
export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`${API()}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  return res.ok;
}

const now = () => Math.floor(Date.now() / 1000);

/** One inbound Telegram update. Returns what was done, for the log. */
export async function handleUpdate(update: { message?: { chat: { id: number }; text?: string; from?: { first_name?: string; username?: string } } }): Promise<string> {
  const m = update.message;
  if (!m?.text) return "ignored";
  const chatId = String(m.chat.id);
  const text = m.text.trim();

  const start = text.match(/^\/start\s+(\S+)/);
  if (start) {
    const code = start[1];
    const o = db.select().from(schema.obligations).where(eq(schema.obligations.startCode, code)).get();
    if (!o) { await sendTelegram(chatId, "That link is not for anything, sorry."); return "start: unknown code"; }
    const p = db.select().from(schema.people).where(eq(schema.people.id, o.personId)).get();
    const l = db.select().from(schema.ledgers).where(eq(schema.ledgers.id, o.ledgerId)).get();
    if (!p || !l) return "start: orphan";
    db.update(schema.people).set({ telegramChatId: chatId, channel: "telegram" }).where(eq(schema.people.id, p.id)).run();
    const base = process.env.OWED_BASE_URL ?? "http://localhost:3100";
    const amount = `${l.currency} ${(o.amountBase / 1e6).toLocaleString("en", { maximumFractionDigits: 2 })}`;
    const reply = `Hi ${p.name}. I'm Owed, collecting for ${ownerDisplay(l)}. This is about ${l.title}: ${amount}${o.note ? ` (${o.note})` : ""}. Your link: ${base}/pay/${o.linkSecret}\n\nReply "paid" once you have, and reply "stop" if you'd rather I never message you again.`;
    await sendTelegram(chatId, reply);
    db.insert(schema.messages).values({ id: `msg_${nanoid(10)}`, ledgerId: l.id, personId: p.id, direction: "out", channel: "telegram", body: reply, intent: "ask", createdAt: now() }).run();
    db.insert(schema.events).values({ ledgerId: l.id, kind: "telegram:connected", actor: "collector", detail: `${p.name} opened the bot`, createdAt: now() }).run();
    return `start: linked ${p.name}`;
  }

  const person = db.select().from(schema.people).where(eq(schema.people.telegramChatId, chatId)).all().at(-1);
  if (!person) { await sendTelegram(chatId, "I don't have anything for you yet. If someone sent you a link, tap it and I'll pick it up."); return "reply: unknown chat"; }
  db.insert(schema.messages).values({ id: `msg_${nanoid(10)}`, ledgerId: person.ledgerId, personId: person.id, direction: "in", channel: "telegram", body: text, intent: null, createdAt: now() }).run();

  if (/^\s*stop\b/i.test(text)) {
    db.update(schema.people).set({ stopped: true }).where(eq(schema.people.id, person.id)).run();
    db.insert(schema.events).values({ ledgerId: person.ledgerId, kind: "stopped", actor: "collector", detail: `${person.name} said stop`, createdAt: now() }).run();
    await sendTelegram(chatId, "Understood. I won't message you again about this.");
    return `stop: ${person.name}`;
  }
  if (/\bpaid\b/i.test(text)) {
    db.insert(schema.events).values({ ledgerId: person.ledgerId, kind: "claims_paid", actor: "collector", detail: `${person.name} says they paid`, createdAt: now() }).run();
    await sendTelegram(chatId, "Thanks. I'll check the chain and confirm here. If you have the transaction hash, paste it on your link and it confirms instantly.");
    return `paid-claim: ${person.name}`;
  }
  // Anything else is a real reply: the Collector answers it from the ledger, in its own words.
  const obligations = db.select().from(schema.obligations).where(eq(schema.obligations.personId, person.id)).all();
  const o = obligations.find((x) => x.status !== "paid") ?? obligations.at(-1);
  if (o) {
    try {
      const { runCollector } = await import("@/agent/collector");
      const report = await runCollector(person.ledgerId, { linkBase: process.env.OWED_BASE_URL ?? "http://localhost:3100", mode: "reply", obligationId: o.id, text });
      return `reply: ${person.name} → ${report.slice(0, 120)}`;
    } catch (e) {
      console.error("[telegram] collector reply failed:", e instanceof Error ? e.message : e);
    }
  }
  const led = db.select().from(schema.ledgers).where(eq(schema.ledgers.id, person.ledgerId)).get();
  const owner = led ? ownerDisplay(led) : "the owner";
  await sendTelegram(chatId, `Got it. I've passed that to ${owner}.`);
  return `reply: ${person.name}`;
}
