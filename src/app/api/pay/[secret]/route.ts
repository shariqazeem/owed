import { NextResponse, after } from "next/server";
import { getObligationBySecret, markPaid } from "@/lib/db/ledgers";
import { agentAddress, verifyIncoming } from "@/lib/chain/usdc";
import { afterPayment } from "@/lib/settle/settler";
import { arcTestnet } from "@/lib/chain/arc";
import { toUsdcBase } from "@/lib/money/rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The payer says "I paid, here is the hash". The Settler does not take their word for it: it reads
 * the receipt on Arc and accepts only a USDC transfer to the agent of at least what was owed at
 * the stamped rate. Then, and only then, the obligation is paid and a receipt exists.
 */
export async function POST(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params;
  const found = getObligationBySecret(secret);
  if (!found) return NextResponse.json({ error: "This link is not for anything." }, { status: 404 });
  const { obligation, ledger } = found;
  if (obligation.status === "paid") return NextResponse.json({ ok: true, already: true, txHash: obligation.paidTx });

  let body: { txHash?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 }); }
  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return NextResponse.json({ error: "That is not a transaction hash." }, { status: 400 });

  const due = toUsdcBase(obligation.amountBase, { usdcPerUnit: ledger.rateUsdcPerUnit, source: ledger.rateSource, at: 0 });
  const agent = agentAddress();
  let verified;
  try {
    verified = await verifyIncoming(txHash as `0x${string}`, agent, due);
  } catch {
    return NextResponse.json({ error: "Could not read that transaction yet. Give it a few seconds and try again." }, { status: 409 });
  }
  if (!verified) return NextResponse.json({ error: `No USDC transfer of at least ${Number(due) / 1e6} to ${agent} in that transaction.` }, { status: 422 });

  markPaid(obligation.id, ledger.id, { txHash, from: verified.from, to: verified.to, amountBase: verified.amountBase, chainId: arcTestnet.id });
  // After the money is real: thank the person in the agent's words, and pay the owner out if the ledger is complete.
  const linkBase = process.env.OWED_BASE_URL ?? new URL(req.url).origin;
  after(() => afterPayment(ledger.id, obligation.id, linkBase));
  return NextResponse.json({ ok: true, txHash, amountUsdc: Number(verified.amountBase) / 1e6 });
}
