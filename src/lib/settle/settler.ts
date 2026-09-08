import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isAddress, type Address, type Hash } from "viem";
import { db, schema } from "@/lib/db";
import { getLedger, ledgerMoney } from "@/lib/db/ledgers";
import { agentPrivyWallet, payOutFromPrivy } from "@/lib/privy/agent-wallet";
import { agentAddress, payOut, publicClient } from "@/lib/chain/usdc";
import { arcTestnet } from "@/lib/chain/arc";
import { runCollector } from "@/agent/collector";

/**
 * The Settler. Two legs, both on chain: money comes IN to the agent's wallet (verified by the pay
 * route, never by anyone's word), and money goes OUT to the owner from the same wallet. The amount
 * it pays out is exactly what this ledger collected and has not yet paid out, read from the payments
 * table — not from a model, not from a form.
 */
const now = () => Math.floor(Date.now() / 1000);

export function setPayoutAddress(ledgerId: string, to: string): { ok: true } | { ok: false; error: string } {
  const addr = to.trim();
  if (!isAddress(addr)) return { ok: false, error: "That is not an Arc address." };
  if (addr.toLowerCase() === agentAddress().toLowerCase()) return { ok: false, error: "That is the agent's own wallet." };
  const t = now();
  db.update(schema.ledgers).set({ payoutTo: addr, updatedAt: t }).where(eq(schema.ledgers.id, ledgerId)).run();
  db.insert(schema.events).values({ ledgerId, kind: "payout_address", actor: "owner", detail: addr, createdAt: t }).run();
  return { ok: true };
}

const inFlight = new Set<string>();

export type PayoutResult = { ok: true; txHash: Hash; amountBase: number } | { ok: false; reason: string };

/**
 * Pay the owner what is held. By default only once every obligation is paid, written off or
 * answered; `force` sends what is held right now because the owner asked for it on the board.
 */
export async function payOutLedger(ledgerId: string, opts: { force?: boolean } = {}): Promise<PayoutResult> {
  const data = getLedger(ledgerId);
  if (!data) return { ok: false, reason: "no such ledger" };
  const { ledger, obligations } = data;
  if (!ledger.payoutTo || !isAddress(ledger.payoutTo)) return { ok: false, reason: "no payout address yet" };
  const open = obligations.filter((o) => o.status === "owed" || o.status === "disputed").length;
  if (open && !opts.force) return { ok: false, reason: `${open} still open` };
  const { held } = ledgerMoney(ledgerId);
  if (held <= 0) return { ok: false, reason: "nothing held" };
  if (inFlight.has(ledgerId)) return { ok: false, reason: "a payout is already in flight" };
  inFlight.add(ledgerId);
  try {
    const to = ledger.payoutTo as Address;
    const amount = BigInt(held);
    const txHash = agentPrivyWallet() ? await payOutFromPrivy(to, amount) : await payOut(to, amount);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
    if (receipt.status !== "success") {
      db.insert(schema.events).values({ ledgerId, kind: "payout_failed", actor: "settler", detail: `reverted ${txHash}`, createdAt: now() }).run();
      return { ok: false, reason: "the transaction reverted" };
    }
    const t = now();
    db.insert(schema.payments)
      .values({ id: `pay_${nanoid(10)}`, ledgerId, obligationId: null, direction: "out", amountBase: held, chainId: arcTestnet.id, txHash, fromAddress: agentAddress(), toAddress: to, confirmedAt: t })
      .run();
    db.insert(schema.events).values({ ledgerId, kind: "paid_out", actor: "settler", detail: JSON.stringify({ txHash, amountBase: held, to }), createdAt: t }).run();
    db.update(schema.ledgers).set({ status: open ? ledger.status : "settled", updatedAt: t }).where(eq(schema.ledgers.id, ledgerId)).run();
    return { ok: true, txHash, amountBase: held };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.insert(schema.events).values({ ledgerId, kind: "payout_failed", actor: "settler", detail: msg.slice(0, 200), createdAt: now() }).run();
    return { ok: false, reason: msg };
  } finally {
    inFlight.delete(ledgerId);
  }
}

/** After a verified payment: thank the person in the agent's own words, then pay the owner out if the ledger is complete. */
export async function afterPayment(ledgerId: string, obligationId: string, linkBase: string): Promise<void> {
  try {
    await runCollector(ledgerId, { linkBase, mode: "thanks", obligationId });
  } catch (e) {
    console.error("[settler] thanks failed:", e instanceof Error ? e.message : e);
  }
  const r = await payOutLedger(ledgerId);
  if (!r.ok && !/no payout address|still open|nothing held/.test(r.reason)) console.error("[settler] payout:", r.reason);
}
