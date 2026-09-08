/**
 * Privy's REST API, the way Sage drives it in production: Basic auth with the app id and secret, the
 * app id repeated as a header, JSON in and out. Server wallets are created here and every signature
 * they ever produce comes back through `/wallets/{id}/rpc`. No key ever exists on our side.
 */
const API = "https://api.privy.io/v1";
const TIMEOUT_MS = 20_000;

function creds(): { id: string; secret: string } | null {
  const id = process.env.PRIVY_APP_ID?.trim();
  const secret = process.env.PRIVY_APP_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}
export const privyConfigured = () => Boolean(creds());

async function request<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const c = creds();
  if (!c) throw new Error("Privy not configured (PRIVY_APP_ID / PRIVY_APP_SECRET)");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}`, "privy-app-id": c.id, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`privy ${res.status}: ${JSON.stringify(json).slice(0, 240)}`);
  return json as T;
}
export const privyGet = <T>(path: string) => request<T>("GET", path);
export const privyPost = <T>(path: string, body: unknown) => request<T>("POST", path, body);
export const privyPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);

export interface ServerWallet { id: string; address: `0x${string}` }

export async function createServerWallet(policyIds: string[] = []): Promise<ServerWallet> {
  const w = await privyPost<{ id: string; address: string }>("/wallets", { chain_type: "ethereum", ...(policyIds.length ? { policy_ids: policyIds } : {}) });
  return { id: w.id, address: w.address as `0x${string}` };
}

export interface EvmTxRequest {
  to: `0x${string}`; value?: `0x${string}`; data?: `0x${string}`; nonce: `0x${string}`; chain_id: number;
  gas_limit: `0x${string}`; max_fee_per_gas?: `0x${string}`; max_priority_fee_per_gas?: `0x${string}`; type?: number;
}

/** Sign only. We broadcast ourselves on Arc, so the chain need not be one Privy relays for. */
export async function signTransaction(walletId: string, tx: EvmTxRequest): Promise<`0x${string}`> {
  const r = await privyPost<{ data?: { signed_transaction?: string } }>(`/wallets/${walletId}/rpc`, { method: "eth_signTransaction", params: { transaction: tx } });
  const s = r.data?.signed_transaction;
  if (!s?.startsWith("0x")) throw new Error("privy: eth_signTransaction returned nothing");
  return s as `0x${string}`;
}
