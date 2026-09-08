import { NextResponse } from "next/server";
import { payOutLedger, setPayoutAddress } from "@/lib/settle/settler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** The owner says where the money goes, or asks for what is held right now. Both land back on the board. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const to = String(form.get("to") ?? "").trim();
  const action = String(form.get("action") ?? "save");
  const back = (err?: string) => NextResponse.redirect(new URL(`/l/${id}${err ? `?err=${encodeURIComponent(err)}` : ""}`, req.url), 303);
  if (to) {
    const r = setPayoutAddress(id, to);
    if (!r.ok) return back(r.error);
  }
  if (action === "send") {
    const r = await payOutLedger(id, { force: true });
    if (!r.ok) return back(`Not sent: ${r.reason}.`);
  }
  return back();
}
