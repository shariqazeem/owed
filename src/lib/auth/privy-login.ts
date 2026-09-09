import { PrivyClient, type User } from "@privy-io/server-auth";

/**
 * A person signs in with Privy in the browser (email is enough); the server verifies the token it
 * hands back and reads the wallet Privy holds for them — the embedded wallet first. That wallet is
 * where the agent pays them out. Nothing else about them is stored.
 */
function client(): PrivyClient | null {
  const id = process.env.PRIVY_APP_ID?.trim();
  const secret = process.env.PRIVY_APP_SECRET?.trim();
  return id && secret ? new PrivyClient(id, secret) : null;
}

export function walletOf(user: User): string | null {
  const w = user.wallet;
  if (w && (w.chainType === "ethereum" || !w.chainType) && /^0x[0-9a-fA-F]{40}$/.test(w.address)) return w.address;
  for (const acct of user.linkedAccounts ?? []) {
    const a = acct as { type?: string; chainType?: string; address?: string };
    if (a.type === "wallet" && (a.chainType === "ethereum" || !a.chainType) && a.address && /^0x[0-9a-fA-F]{40}$/.test(a.address)) return a.address;
  }
  return null;
}

export function emailOf(user: User): string | null {
  const e = user.email?.address ?? (user.google as { email?: string } | undefined)?.email;
  return e ?? null;
}

export type PrivyLogin = { ok: true; userId: string; wallet: string | null; email: string | null } | { ok: false; reason: string };

export async function resolvePrivyLogin(token: string): Promise<PrivyLogin> {
  const c = client();
  if (!c) return { ok: false, reason: "Privy is not configured" };
  let userId: string;
  try {
    userId = (await c.verifyAuthToken(token)).userId;
  } catch (e) {
    return { ok: false, reason: `invalid token: ${e instanceof Error ? e.message : String(e)}` };
  }
  try {
    let user = await c.getUserById(userId);
    let wallet = walletOf(user);
    if (!wallet) {
      // the browser normally makes the embedded wallet at login; if it has not yet, make it here
      try {
        await c.createWallets({ userId, createEthereumWallet: true });
        user = await c.getUserById(userId);
        wallet = walletOf(user);
      } catch (e) {
        console.warn("[privy-login] createWallets:", e instanceof Error ? e.message : e);
      }
    }
    return { ok: true, userId, wallet, email: emailOf(user) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
