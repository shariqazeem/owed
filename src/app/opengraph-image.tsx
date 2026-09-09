import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Owed — the agent that gets you paid";

/** The card the site shows when its link is shared. */
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0d1424", color: "#f4f6fb", padding: "72px 80px", justifyContent: "space-between", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 800 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#5b8cff" }} />
          Owed
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>The agent that gets you paid.</div>
          <div style={{ fontSize: 32, color: "#9aa4b8", lineHeight: 1.35, maxWidth: 1000 }}>Drop a bill split, a chat or an invoice on it. It asks each person in its own words, answers them, verifies every payment on chain, and pays you out.</div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 24, color: "#9aa4b8" }}>
          <div>an email is enough</div><div>·</div><div>USDC on Arc</div><div>·</div><div>Strands Agents</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
