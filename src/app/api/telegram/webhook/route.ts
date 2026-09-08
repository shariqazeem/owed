import { NextResponse, after } from "next/server";
import { handleUpdate } from "@/lib/channels/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram calls this for every message to the bot. The secret token in the header is the only
 * thing that makes it Telegram; without it the route does not exist. The update is handled after
 * the response so a slow model never makes Telegram retry.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("Not found", { status: 404 });
  let update: Parameters<typeof handleUpdate>[0];
  try {
    update = (await req.json()) as Parameters<typeof handleUpdate>[0];
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  after(async () => {
    try {
      console.log("[telegram]", await handleUpdate(update));
    } catch (e) {
      console.error("[telegram] update failed:", e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ ok: true });
}
