import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ownerDisplay } from "@/lib/db/ledgers";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "An Owed receipt";

const INK = "#0d1424";
const PAPER = "#f4f6fb";
const MUTED = "#9aa4b8";
const COBALT = "#5b8cff";
const GREEN = "#34c46a";

/** The card a receipt link shows in a chat: who paid whom, how much, verified on Arc. No secrets. */
export default async function OG({ params }: { params: Promise<{ tx: string }> }) {
  const { tx } = await params;
  const pay = /^0x[0-9a-fA-F]{64}$/.test(tx) ? db.select().from(schema.payments).where(eq(schema.payments.txHash, tx)).get() : undefined;
  const ledger = pay ? db.select().from(schema.ledgers).where(eq(schema.ledgers.id, pay.ledgerId)).get() : undefined;
  const obligation = pay?.obligationId ? db.select().from(schema.obligations).where(eq(schema.obligations.id, pay.obligationId)).get() : undefined;
  const person = obligation ? db.select().from(schema.people).where(eq(schema.people.id, obligation.personId)).get() : undefined;
  const title = pay && ledger ? (pay.direction === "in" ? `${person?.name ?? "Someone"} paid ${ownerDisplay(ledger)}` : `${ownerDisplay(ledger)} was paid out`) : "A receipt";
  const amount = pay ? `${(pay.amountBase / 1e6).toFixed(2)} USDC` : "";
  const forWhat = ledger ? `${ledger.title}${obligation?.note ? ` · ${obligation.note}` : ""}` : "";
  const short = `${tx.slice(0, 10)}…${tx.slice(-8)}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: INK, color: PAPER, padding: "64px 72px", justifyContent: "space-between", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 800 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: COBALT }} />
            Owed
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, color: GREEN, fontWeight: 700 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: GREEN }} />
            verified on Arc
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 30, color: MUTED }}>receipt</div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 54, fontWeight: 700, color: GREEN, fontFamily: "monospace" }}>{amount}</div>
          <div style={{ fontSize: 28, color: MUTED }}>{forWhat}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: MUTED, fontFamily: "monospace" }}>
          <div>{short}</div>
          <div>nobody marked this paid by hand</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
