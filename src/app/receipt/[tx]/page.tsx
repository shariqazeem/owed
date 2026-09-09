import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ownerDisplay } from "@/lib/db/ledgers";
import { txUrl } from "@/lib/chain/arc";
import "./receipt.css";

export const dynamic = "force-dynamic";

/**
 * A receipt anyone can open: what was paid, for what, by whom, at which rate, and the transaction
 * on Arc that proves it. No secrets on it — the page is safe to forward.
 */
export default async function Receipt({ params }: { params: Promise<{ tx: string }> }) {
  const { tx } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) notFound();
  const pay = db.select().from(schema.payments).where(eq(schema.payments.txHash, tx)).get();
  if (!pay) notFound();
  const ledger = db.select().from(schema.ledgers).where(eq(schema.ledgers.id, pay.ledgerId)).get();
  if (!ledger) notFound();
  const obligation = pay.obligationId ? db.select().from(schema.obligations).where(eq(schema.obligations.id, pay.obligationId)).get() : null;
  const person = obligation ? db.select().from(schema.people).where(eq(schema.people.id, obligation.personId)).get() : null;
  const usdc = (pay.amountBase / 1e6).toFixed(2);
  const local = obligation ? `${ledger.currency} ${(obligation.amountBase / 1e6).toLocaleString("en", { maximumFractionDigits: 2 })}` : null;
  const when = new Date(pay.confirmedAt * 1000).toUTCString();
  const incoming = pay.direction === "in";
  return (
    <main className="rc">
      <p className="rc-kicker">Owed · receipt</p>
      <h1>{incoming ? `${person?.name ?? "Someone"} paid ${ownerDisplay(ledger)}` : `${ownerDisplay(ledger)} was paid out`}</h1>
      <p className="rc-amt">{usdc} USDC{local && ledger.currency !== "USD" ? <span> · {local} at 1 {ledger.currency} = {ledger.rateUsdcPerUnit} USDC</span> : null}</p>
      <dl className="rc-facts">
        <dt>For</dt><dd>{ledger.title}{obligation?.note ? ` — ${obligation.note}` : ""}</dd>
        <dt>Verified</dt><dd>{when}, by reading the transaction on Arc</dd>
        <dt>From</dt><dd><code>{pay.fromAddress}</code></dd>
        <dt>To</dt><dd><code>{pay.toAddress}</code>{incoming ? " (the agent's wallet)" : ""}</dd>
        <dt>Transaction</dt><dd><a href={txUrl(pay.txHash)} target="_blank" rel="noreferrer"><code>{pay.txHash}</code></a></dd>
      </dl>
      <p className="rc-fine">Nobody marked this paid by hand. The agent read the chain and found a USDC transfer of at least the amount owed, to its own wallet, in this transaction.</p>
    </main>
  );
}
