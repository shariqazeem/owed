import { NextResponse } from "next/server";
import { absolute } from "@/lib/url";
import { readLedger } from "@/agent/reader";
import { createLedgerFromReading } from "@/lib/db/ledgers";
import { stampRate } from "@/lib/money/rates";
import { setPayoutAddress } from "@/lib/settle/settler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Drop something on the agent. Text, or an image with an optional caption. The Reader turns it into
 * a ledger, a rate is stamped once, the ledger is persisted, and the board is where you land.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const owner = String(form.get("owner") ?? "").trim() || "me";
  const defaultCurrency = String(form.get("currency") ?? "USD").trim().toUpperCase();
  const caption = String(form.get("caption") ?? "").trim() || undefined;
  const text = String(form.get("text") ?? "").trim();
  const file = form.get("image");

  let reading;
  if (file instanceof File && file.size > 0) {
    if (file.size > 8_000_000) return NextResponse.json({ error: "Image is over 8 MB." }, { status: 413 });
    const type = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpeg";
    const bytes = new Uint8Array(await file.arrayBuffer());
    reading = await readLedger({ kind: "screenshot", bytes, format: type, caption, owner, defaultCurrency });
  } else if (text.length >= 8) {
    reading = await readLedger({ kind: "text", text, caption, owner, defaultCurrency });
  } else {
    return NextResponse.json({ error: "Paste something, or drop a screenshot." }, { status: 400 });
  }

  const rate = await stampRate(reading.ledger.currency);
  const { ledgerId } = createLedgerFromReading(owner, file instanceof File && file.size > 0 ? "screenshot" : "text", reading.ledger, rate);
  const payoutTo = String(form.get("payoutTo") ?? "").trim();
  if (payoutTo) setPayoutAddress(ledgerId, payoutTo);
  return NextResponse.redirect(absolute(`/l/${ledgerId}`, req), 303);
}
