import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Owed — the agent that gets you paid.
 *
 * A LEDGER is one situation someone dropped on the agent: a bill split, an invoice, a class fund.
 * Each PERSON on it owes an OBLIGATION. The Collector talks to them (MESSAGES), the chain pays
 * (PAYMENTS), every movement leaves a RECEIPT, and the only things the owner ever sees are
 * DECISIONS the agent could not take alone.
 */

export const ledgers = sqliteTable("ledgers", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull(),
  title: text("title").notNull(),
  /** what the owner dropped on it: "screenshot" | "sheet" | "text" | "invoice" */
  sourceKind: text("source_kind").notNull(),
  /** the agent's own reading of the source, verbatim, so the owner can check it */
  sourceSummary: text("source_summary").notNull(),
  currency: text("currency").notNull().default("USD"),
  /** USDC per one unit of `currency`, stamped once at creation, with where it came from */
  rateUsdcPerUnit: real("rate_usdc_per_unit").notNull().default(1),
  rateSource: text("rate_source").notNull().default("USDC is a dollar"),
  /** where the money goes when the pot is full: "owner" | a vendor address */
  payoutTo: text("payout_to"),
  payoutLabel: text("payout_label"),
  status: text("status").notNull().default("collecting"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull(),
  name: text("name").notNull(),
  /** how the agent reaches them: "telegram" | "email" | "link" */
  channel: text("channel"),
  handle: text("handle"),
  /** the person can say stop; the agent then never messages them again on this ledger */
  stopped: integer("stopped", { mode: "boolean" }).notNull().default(false),
  /** learned when they tap the bot's deep link; the agent can only message a chat that opened first */
  telegramChatId: text("telegram_chat_id"),
  createdAt: integer("created_at").notNull(),
});

export const obligations = sqliteTable("obligations", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull(),
  personId: text("person_id").notNull(),
  amountBase: integer("amount_base").notNull(),
  note: text("note"),
  dueAt: integer("due_at"),
  /** "owed" | "paid" | "written_off" | "disputed" */
  status: text("status").notNull().default("owed"),
  /** the one-time payment link's secret, shown only to the person it is for */
  linkSecret: text("link_secret").notNull(),
  /** short code in the Telegram deep link — never the bearer secret */
  startCode: text("start_code").notNull().default(""),
  paidAt: integer("paid_at"),
  paidTx: text("paid_tx"),
  nudges: integer("nudges").notNull().default(0),
  lastNudgedAt: integer("last_nudged_at"),
  createdAt: integer("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull(),
  personId: text("person_id"),
  /** "out" from the agent, "in" from the person */
  direction: text("direction").notNull(),
  channel: text("channel").notNull(),
  body: text("body").notNull(),
  /** why the agent sent it: "ask" | "nudge" | "thanks" | "verify" | "stop_ack" */
  intent: text("intent"),
  createdAt: integer("created_at").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull(),
  obligationId: text("obligation_id"),
  /** "in" a person paid, "out" the agent paid the vendor or the owner */
  direction: text("direction").notNull(),
  amountBase: integer("amount_base").notNull(),
  chainId: integer("chain_id").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  confirmedAt: integer("confirmed_at").notNull(),
});

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull(),
  /** "write_off" | "escalate" | "dispute" | "payout_over_limit" | "new_payee" */
  kind: text("kind").notNull(),
  question: text("question").notNull(),
  context: text("context"),
  options: text("options").notNull(),
  answer: text("answer"),
  answeredAt: integer("answered_at"),
  createdAt: integer("created_at").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ledgerId: text("ledger_id").notNull(),
  kind: text("kind").notNull(),
  detail: text("detail"),
  /** which agent did it: "reader" | "collector" | "settler" */
  actor: text("actor").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Ledger = typeof ledgers.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Obligation = typeof obligations.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
