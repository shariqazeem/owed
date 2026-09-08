import { notFound } from "next/navigation";
import { getObligationBySecret } from "@/lib/db/ledgers";
import { agentAddress } from "@/lib/chain/usdc";
import { toUsdcBase } from "@/lib/money/rates";
import { txUrl } from "@/lib/chain/arc";
import { OwedPrivy } from "@/components/privy";
import { PayClient } from "./pay-client";
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
  const owner = ledger.ownerKey;
  return (
    <main className="py">
      <p className="py-kicker">Owed · a payment for {owner}</p>
      <h1>{person.name}, you owe {owner} {ledger.currency} {amountLocal.toLocaleString("en", { maximumFractionDigits: 2 })}</h1>
      {obligation.note ? <p className="py-note">{obligation.note}</p> : null}
      <p className="py-lede">{ledger.title}. {ledger.currency !== "USD" ? `That is ${usdc.toFixed(2)} USDC at the rate stamped when the ledger was made (1 ${ledger.currency} = ${ledger.rateUsdcPerUnit} USDC, ${ledger.rateSource}).` : `That is ${usdc.toFixed(2)} USDC.`}</p>
      {obligation.status === "paid" ? (
        <div className="py-done">Paid. Thank you. <a href={txUrl(obligation.paidTx ?? "")} target="_blank" rel="noreferrer">receipt →</a></div>
      ) : (
        <OwedPrivy>
          <PayClient secret={secret} to={agentAddress()} usdc={usdc} usdcBase={due.toString()} privy={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)} />
        </OwedPrivy>
      )}
      <p className="py-fine">This link is only for you and only for this amount. The agent reads the chain itself; nobody marks anything paid by hand. Reply &quot;stop&quot; to any message from Owed and it will not message you again.</p>
    </main>
  );
}
