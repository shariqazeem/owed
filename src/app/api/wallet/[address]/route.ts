import { NextResponse } from "next/server";
import { formatUnits, isAddress } from "viem";
import { usdcBalance } from "@/lib/chain/usdc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How much USDC an address holds on Arc — the pay page watches its own wallet with this. */
export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ error: "Not an address." }, { status: 400 });
  const bal = await usdcBalance(address);
  return NextResponse.json({ address, usdc: Number(formatUnits(bal, 6)) }, { headers: { "cache-control": "no-store" } });
}
