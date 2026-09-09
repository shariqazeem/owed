import { notFound } from "next/navigation";
import { getObligationBySecret, ownerDisplay } from "@/lib/db/ledgers";
import { agentAddress } from "@/lib/chain/usdc";
import { toUsdcBase } from "@/lib/money/rates";
import { PayClient } from "./pay-client";
import { PayThread, type ThreadMessage } from "./pay-thread";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import "./pay.css";

export const dynamic = "force-dynamic";

export default async function Pay({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  const found = getObligationBySecret(secret);
  if (!found) notFound();
  const { obligation, ledger, person } = found;
  const amountLocal = obligation.amountBase / 1_000_000;
  const due = toUsdcBase(obligation.amountBase, { usdcPerUnit: ledger.rateUsdcPerUnit, source: ledger.rateSource, at: 0 });
  const usdc = Number(due) / 1e6;
  const owner = ownerDisplay(ledger);
  const thread: ThreadMessage[] = db.select().from(schema.messages).where(eq(schema.messages.personId, person.id)).all()
    .filter((m) => m.direction === "in" || m.channel !== "board" || m.intent !== "ask" ? true : true)
    .map((m) => ({ id: m.id, direction: m.direction as "in" | "out", body: m.body, at: m.createdAt }));
  return (
    <main className="py">
      <p className="py-kicker">Owed · a payment for {owner}</p>
      <h1>{person.name}, you owe {owner} {ledger.currency} {amountLocal.toLocaleString("en", { maximumFractionDigits: 2 })}</h1>
      {obligation.note ? <p className="py-note">{obligation.note}</p> : null}
      <p className="py-lede">{ledger.title}. {ledger.currency !== "USD" ? `That is ${usdc.toFixed(2)} USDC at the rate stamped when the ledger was made (1 ${ledger.currency} = ${ledger.rateUsdcPerUnit} USDC, ${ledger.rateSource}).` : `That is ${usdc.toFixed(2)} USDC.`}</p>
      {obligation.status === "paid" ? (
        <div className="py-done">Paid. Thank you. <a href={`/receipt/${obligation.paidTx ?? ""}`}>receipt →</a></div>
      ) : (
        <PayClient secret={secret} to={agentAddress()} usdc={usdc} usdcBase={due.toString()} privy={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)} />
      )}
      <PayThread secret={secret} initial={thread} owner={owner} stopped={person.stopped} />
      <p className="py-fine">This link is only for you and only for this amount. The agent reads the chain itself; nobody marks anything paid by hand. Reply &quot;stop&quot; to any message from Owed and it will not message you again.</p>
    </main>
  );
}
