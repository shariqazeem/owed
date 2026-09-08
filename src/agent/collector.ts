import { Agent, tool } from "@strands-agents/sdk";
import { z } from "zod";
import { makeModel } from "./model";
import { db, schema } from "@/lib/db";
import { getLedger } from "@/lib/db/ledgers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const now = () => Math.floor(Date.now() / 1000);
const fmt = (base: number, cur: string) => `${cur} ${(base / 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })}`;

export const COLLECTOR_SYSTEM_PROMPT = `You are the Collector inside Owed. Your owner is owed money by the people on a ledger, and your whole job is to get each of them to pay, without the owner having to ask.

How you talk: like a considerate friend who is also organised. Short. Warm. Specific. Name the thing ("the hotel from the Murree trip"), the exact amount, and give the link. Never guilt, never threats, never "as per my last message". A first ask is friendly and assumes goodwill. A nudge is lighter and shorter than the ask, and admits it is a nudge. Match the language and register of the source; if the people wrote in Urdu-flavoured English, write like that.

Every person can be reached. A person with a handle gets the message on that channel (telegram, email). A person whose channel is "board" gets the message on the owner's board, and the owner forwards it in the chat they already share — so write it so the owner can paste it as-is, addressed to the person by name, with the link. Never invent a handle. If a person has said stop, do not message them, ever. Never change an amount. After three nudges with no payment, stop nudging and hand the owner a decision instead. When someone says they paid, do not argue: say you will check, and record it so the Settler verifies on chain.

Use your tools. Look at the ledger first. Send exactly one message per person who has not been asked yet. Then stop and report what you did in one short paragraph.`;

/** Everything the Collector may do, as tools. It decides WHEN and WHAT to say; the code decides what is true. */
export function collectorTools(ledgerId: string, linkBase: string) {
  const listObligations = tool({
    name: "list_obligations",
    description: "The ledger: every person, what they owe, how to reach them, whether they were asked, nudged, paid, or asked us to stop.",
    inputSchema: z.object({}),
    callback: () => {
      const data = getLedger(ledgerId);
      if (!data) return "No such ledger.";
      const by = new Map(data.people.map((p) => [p.id, p]));
      return JSON.stringify({
        title: data.ledger.title, currency: data.ledger.currency, owner: data.ledger.ownerKey,
        people: data.obligations.map((o) => {
          const p = by.get(o.personId);
          return { obligationId: o.id, name: p?.name, channel: p?.channel ?? "board", handle: p?.handle ?? null, stopped: p?.stopped ?? false,
            owes: fmt(o.amountBase, data.ledger.currency), note: o.note, status: o.status, nudges: o.nudges, link: `${linkBase}/pay/${o.linkSecret}` };
        }),
      });
    },
  });

  const sendMessage = tool({
    name: "send_message",
    description: "Send one message to one person on the ledger. Include their link. Returns what happened.",
    inputSchema: z.object({
      obligationId: z.string(),
      intent: z.enum(["ask", "nudge", "thanks", "verify"]).describe("ask = first message; nudge = a later reminder; thanks = they paid; verify = they said they paid"),
      body: z.string().min(12).max(700).describe("The message, in your own words, with the link in it"),
    }),
    callback: (input) => {
      const o = db.select().from(schema.obligations).where(eq(schema.obligations.id, input.obligationId)).get();
      if (!o || o.ledgerId !== ledgerId) return "No such obligation on this ledger.";
      const p = db.select().from(schema.people).where(eq(schema.people.id, o.personId)).get();
      if (!p) return "No such person.";
      if (p.stopped) return `${p.name} asked us to stop. Not sent.`;
      if (o.status === "paid" && input.intent !== "thanks") return `${p.name} already paid. Not sent.`;
      const channel = p.channel ?? "board";
      const t = now();
      db.insert(schema.messages).values({ id: `msg_${nanoid(10)}`, ledgerId, personId: p.id, direction: "out", channel, body: input.body, intent: input.intent, createdAt: t }).run();
      if (input.intent === "nudge" || input.intent === "ask") {
        db.update(schema.obligations).set({ nudges: input.intent === "nudge" ? o.nudges + 1 : o.nudges, lastNudgedAt: t }).where(eq(schema.obligations.id, o.id)).run();
      }
      db.insert(schema.events).values({ ledgerId, kind: `message:${input.intent}`, actor: "collector", detail: `${p.name} via ${channel}`, createdAt: t }).run();
      // Delivery: a real channel adapter goes here (Telegram, email). Until one is configured the
      // message lives on the board and the link is what the owner forwards. Recorded either way.
      return `Sent to ${p.name} via ${channel}.`;
    },
  });

  const askOwner = tool({
    name: "ask_owner",
    description: "Hand the owner a real decision you cannot take: write off, escalate, or resolve a dispute. Use it only after three nudges or a dispute.",
    inputSchema: z.object({
      obligationId: z.string(),
      kind: z.enum(["write_off", "escalate", "dispute"]),
      question: z.string().max(240),
      options: z.array(z.string().max(60)).min(2).max(4),
    }),
    callback: (input) => {
      db.insert(schema.decisions).values({ id: `dec_${nanoid(10)}`, ledgerId, kind: input.kind, question: input.question, context: input.obligationId, options: JSON.stringify(input.options), createdAt: now() }).run();
      db.insert(schema.events).values({ ledgerId, kind: "decision:asked", actor: "collector", detail: input.question, createdAt: now() }).run();
      return "The owner will see it.";
    },
  });

  return [listObligations, sendMessage, askOwner];
}

/** One Collector run over one ledger: read it, message whoever is due a message, report. */
export async function runCollector(ledgerId: string, opts: { linkBase: string; mode: "ask" | "nudge" }): Promise<string> {
  const model = makeModel();
  const agent = new Agent({ model: model.instance, systemPrompt: COLLECTOR_SYSTEM_PROMPT, tools: collectorTools(ledgerId, opts.linkBase), printer: false });
  const instruction = opts.mode === "ask"
    ? "Look at the ledger. Send a first ask to every person who has not been asked yet and has not paid. Then report."
    : "Look at the ledger. For each person who was asked but has not paid and has fewer than three nudges, send a nudge. For anyone at three nudges and still unpaid, ask the owner what to do. Then report.";
  const result = await agent.invoke(instruction);
  const text = typeof result === "string" ? result : String(result);
  db.insert(schema.events).values({ ledgerId, kind: `collector:${opts.mode}`, actor: "collector", detail: text.slice(0, 400), createdAt: now() }).run();
  return text;
}
