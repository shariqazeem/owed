"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Sign in with an email; the wallet that comes with it is where the agent pays you out. The browser
 * hands Privy's token to the server once, the server sets the owner cookie, and every ledger made in
 * this browser before signing in becomes yours.
 */
export function OwnerMenu({ signedIn, email, wallet, privy }: { signedIn: boolean; email: string | null; wallet: string | null; privy: boolean }) {
  if (!privy) return null;
  return <Menu signedIn={signedIn} email={email} wallet={wallet} />;
}

function Menu({ signedIn, email, wallet }: { signedIn: boolean; email: string | null; wallet: string | null }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const exchanging = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || signedIn || exchanging.current) return;
    exchanging.current = true;
    setBusy(true);
    (async () => {
      try {
        for (let i = 0; i < 6; i++) {
          const token = await getAccessToken();
          if (!token) break;
          const res = await fetch("/api/auth/privy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
          if (res.ok) { router.refresh(); return; }
          await new Promise((r) => setTimeout(r, 1200));
        }
        await logout();
      } finally {
        exchanging.current = false;
        setBusy(false);
      }
    })();
  }, [ready, authenticated, signedIn, getAccessToken, logout, router]);

  const signOut = async () => {
    await fetch("/api/auth/privy", { method: "DELETE" });
    await logout().catch(() => undefined);
    router.refresh();
  };

  if (signedIn) {
    return (
      <div className="om">
        <div className="om-who">
          <b>{email ?? "signed in"}</b>
          {wallet ? <span title="the wallet the agent pays you out to">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span> : null}
        </div>
        <button className="om-quiet" onClick={signOut}>sign out</button>
      </div>
    );
  }
  return (
    <button className="om-btn is-primary" onClick={() => login()} disabled={!ready || busy}>
      {busy ? "Signing you in…" : "Sign in"}
    </button>
  );
}
