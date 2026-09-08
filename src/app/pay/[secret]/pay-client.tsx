"use client";
import { useState } from "react";

/**
 * The payer's side, kept honest and small. Step one shows exactly where to send and how much.
 * Step two takes the hash and asks the server to verify it on Arc. Nothing here is trusted; the
 * server reads the chain. (A wallet button lands here on the Privy day; today any Arc wallet works.)
 */
export function PayClient({ secret, to, usdc }: { secret: string; to: string; usdc: number }) {
  const [hash, setHash] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "busy" } | { kind: "ok"; tx: string } | { kind: "err"; msg: string }>({ kind: "idle" });
  const confirm = async () => {
    setState({ kind: "busy" });
    const res = await fetch(`/api/pay/${secret}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash.trim() }) });
    const j = (await res.json()) as { ok?: boolean; txHash?: string; error?: string };
    if (j.ok && j.txHash) { setState({ kind: "ok", tx: j.txHash }); location.reload(); }
    else setState({ kind: "err", msg: j.error ?? "Could not verify." });
  };
  return (
    <div className="py-box">
      <div className="py-step"><span>1</span> Send <b>{usdc.toFixed(2)} USDC</b> on Arc Testnet to</div>
      <code className="py-addr">{to}</code>
      <div className="py-step"><span>2</span> Paste the transaction hash</div>
      <input className="py-input" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="0x…" spellCheck={false} />
      <button className="py-go" onClick={confirm} disabled={state.kind === "busy" || !/^0x[0-9a-fA-F]{64}$/.test(hash.trim())}>
        {state.kind === "busy" ? "Checking the chain…" : "I paid — verify it"}
      </button>
      {state.kind === "err" ? <p className="py-err">{state.msg}</p> : null}
    </div>
  );
}
