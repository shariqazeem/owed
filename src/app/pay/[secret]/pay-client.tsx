"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, erc20Abi, type Address } from "viem";
import { arcTestnet, ARC_USDC } from "@/lib/chain/arc";

/**
 * The payer's side. One tap: a wallet Privy makes for them from an email, one USDC transfer on Arc,
 * and the Settler reads the chain before anything is called paid. Nothing here is trusted by the
 * server — it verifies the hash itself. Any other Arc wallet can pay too and paste the hash.
 */
type State = { kind: "idle" } | { kind: "busy"; note: string } | { kind: "ok"; tx: string } | { kind: "err"; msg: string };
type Setter = Dispatch<SetStateAction<State>>;

async function verifyOnServer(secret: string, hash: string): Promise<{ ok: boolean; msg?: string }> {
  for (let i = 0; i < 16; i++) {
    const res = await fetch(`/api/pay/${secret}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash }) });
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (j.ok) return { ok: true };
    if (res.status !== 409) return { ok: false, msg: j.error ?? "Could not verify." };
    await new Promise((r) => setTimeout(r, 2500));
  }
  return { ok: false, msg: "Arc has not confirmed it yet. Give it a moment and paste the hash below." };
}

export function PayClient({ secret, to, usdc, usdcBase, privy }: { secret: string; to: Address; usdc: number; usdcBase: string; privy: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const onPaid = (tx: string) => {
    setState({ kind: "ok", tx });
    setTimeout(() => location.reload(), 800);
  };
  return (
    <div className="py-box">
      {privy ? <WalletPay secret={secret} to={to} usdc={usdc} usdcBase={usdcBase} state={state} setState={setState} onPaid={onPaid} /> : null}
      <PasteHash secret={secret} to={to} usdc={usdc} state={state} setState={setState} onPaid={onPaid} compact={privy} />
      {state.kind === "err" ? <p className="py-err">{state.msg}</p> : null}
      {state.kind === "ok" ? <p className="py-okline">Paid, and verified on Arc.</p> : null}
    </div>
  );
}

function WalletPay({ secret, to, usdc, usdcBase, state, setState, onPaid }: { secret: string; to: Address; usdc: number; usdcBase: string; state: State; setState: Setter; onPaid: (tx: string) => void }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const address = wallet?.address as Address | undefined;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) return;
    let live = true;
    const read = async () => {
      try {
        const j = (await (await fetch(`/api/wallet/${address}`)).json()) as { usdc?: number };
        if (live && typeof j.usdc === "number") setBalance(j.usdc);
      } catch {
        /* the next tick reads again */
      }
    };
    void read();
    const t = setInterval(read, 6000);
    return () => { live = false; clearInterval(t); };
  }, [address]);

  const enough = balance !== null && balance + 1e-9 >= usdc;
  const pay = async () => {
    if (!wallet || !address) return;
    setState({ kind: "busy", note: "Confirm in your wallet…" });
    try {
      await wallet.switchChain(arcTestnet.id);
      const provider = await wallet.getEthereumProvider();
      const client = createWalletClient({ account: address, chain: arcTestnet, transport: custom(provider) });
      const hash = await client.writeContract({ address: ARC_USDC, abi: erc20Abi, functionName: "transfer", args: [to, BigInt(usdcBase)] });
      setState({ kind: "busy", note: "Sent. The agent is reading the chain…" });
      const v = await verifyOnServer(secret, hash);
      if (v.ok) onPaid(hash);
      else setState({ kind: "err", msg: v.msg ?? "Could not verify." });
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0].slice(0, 160) : "The wallet did not send it.";
      setState({ kind: "err", msg });
    }
  };

  if (!ready) return <p className="py-muted">Loading…</p>;
  if (!authenticated) {
    return (
      <>
        <div className="py-step"><span>1</span> Pay from a wallet Owed makes for you. An email is enough.</div>
        <button className="py-go" onClick={() => login()}>Pay {usdc.toFixed(2)} USDC</button>
      </>
    );
  }
  if (!wallet || !address) return <p className="py-muted">Making your wallet…</p>;
  return (
    <>
      <div className="py-step"><span>1</span> Your wallet{balance === null ? "" : `, holding ${balance.toFixed(2)} USDC`}</div>
      <code className="py-addr">{address}</code>
      {enough ? (
        <button className="py-go" onClick={pay} disabled={state.kind === "busy" || state.kind === "ok"}>
          {state.kind === "busy" ? state.note : `Pay ${usdc.toFixed(2)} USDC now`}
        </button>
      ) : (
        <p className="py-muted">
          It needs {usdc.toFixed(2)} USDC on Arc Testnet. Get some at <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">faucet.circle.com</a> — pick Arc Testnet and paste the address above. This page notices by itself.
        </p>
      )}
      <button className="py-quiet" onClick={() => void logout()}>not you? sign out</button>
    </>
  );
}

function PasteHash({ secret, to, usdc, state, setState, onPaid, compact }: { secret: string; to: Address; usdc: number; state: State; setState: Setter; onPaid: (tx: string) => void; compact: boolean }) {
  const [hash, setHash] = useState("");
  const confirm = async () => {
    setState({ kind: "busy", note: "Checking the chain…" });
    const v = await verifyOnServer(secret, hash.trim());
    if (v.ok) onPaid(hash.trim());
    else setState({ kind: "err", msg: v.msg ?? "Could not verify." });
  };
  const body = (
    <>
      <div className="py-step"><span>{compact ? "a" : "1"}</span> Send <b>{usdc.toFixed(2)} USDC</b> on Arc Testnet to</div>
      <code className="py-addr">{to}</code>
      <div className="py-step"><span>{compact ? "b" : "2"}</span> Paste the transaction hash</div>
      <input className="py-input" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="0x…" spellCheck={false} />
      <button className="py-go py-go-alt" onClick={confirm} disabled={state.kind === "busy" || !/^0x[0-9a-fA-F]{64}$/.test(hash.trim())}>
        {state.kind === "busy" ? state.note : "I paid — verify it"}
      </button>
    </>
  );
  return compact ? <details className="py-alt"><summary>Paying from another wallet?</summary><div className="py-alt-body">{body}</div></details> : body;
}
