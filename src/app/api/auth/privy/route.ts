import { NextResponse } from "next/server";
import { resolvePrivyLogin } from "@/lib/auth/privy-login";
import { currentOwner, ownerCookie, OWNER_COOKIE, type Owner } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The browser hands over Privy's token; the server verifies it and sets the owner cookie. Ledgers made anonymously in this browser become theirs. */
export async function POST(req: Request) {
  let body: { token?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected JSON." }, { status: 400 }); }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "No token." }, { status: 400 });
  const r = await resolvePrivyLogin(token);
  if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 401 });
  const before = await currentOwner();
  const owner: Owner = { key: r.userId, kind: "privy", email: r.email ?? undefined, wallet: r.wallet ?? undefined, name: r.email ? r.email.split("@")[0] : undefined };
  if (before?.kind === "anon") {
    db.update(schema.ledgers).set({ ownerKey: owner.key }).where(eq(schema.ledgers.ownerKey, before.key)).run();
  }
  const res = NextResponse.json({ ok: true, owner: { email: owner.email ?? null, wallet: owner.wallet ?? null } });
  res.cookies.set(ownerCookie(owner));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: OWNER_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}

export async function GET() {
  const o = await currentOwner();
  return NextResponse.json({ owner: o ? { kind: o.kind, email: o.email ?? null, wallet: o.wallet ?? null, name: o.name ?? null } : null }, { headers: { "cache-control": "no-store" } });
}
