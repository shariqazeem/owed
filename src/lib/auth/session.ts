import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Who is using Owed right now. Signing in with Privy gives a durable identity (the Privy user id)
 * plus the wallet that comes with it — the wallet the agent pays them out to. Someone who has not
 * signed in still gets a key, an anonymous one held in a cookie, so their ledgers are theirs and
 * nobody else's. Ledgers are keyed by this; boards are shown only to their owner.
 */
export interface Owner {
  key: string;
  kind: "privy" | "anon";
  email?: string;
  wallet?: string;
  name?: string;
}

const COOKIE = "owed_owner";
const YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.OWED_SESSION_SECRET?.trim() || process.env.PRIVY_APP_SECRET?.trim() || "owed-dev-secret";
}
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeOwner(o: Owner): string {
  const payload = b64(JSON.stringify(o));
  return `${payload}.${sign(payload)}`;
}

export function decodeOwner(raw: string | undefined): Owner | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expect = sign(payload);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const o = JSON.parse(unb64(payload)) as Owner;
    return typeof o.key === "string" && (o.kind === "privy" || o.kind === "anon") ? o : null;
  } catch {
    return null;
  }
}

/** The current owner, or null when there is no cookie yet. Safe in pages and route handlers. */
export async function currentOwner(): Promise<Owner | null> {
  const jar = await cookies();
  return decodeOwner(jar.get(COOKIE)?.value);
}

export function anonymousOwner(): Owner {
  return { key: `anon:${randomBytes(12).toString("base64url")}`, kind: "anon" };
}

/** Cookie attributes for a Set-Cookie on a Response. Route handlers use this; pages cannot set cookies. */
export function ownerCookie(o: Owner): { name: string; value: string; httpOnly: true; sameSite: "lax"; secure: boolean; path: "/"; maxAge: number } {
  return { name: COOKIE, value: encodeOwner(o), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR };
}
export const OWNER_COOKIE = COOKIE;

/** Legacy ledgers (before identities existed) carry a bare name as their key; anyone may still open those. */
export function canView(ownerKey: string, owner: Owner | null): boolean {
  if (!ownerKey.startsWith("anon:") && !ownerKey.startsWith("did:")) return true;
  return owner?.key === ownerKey;
}
