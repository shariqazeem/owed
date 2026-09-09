import { getLedger } from "@/lib/db/ledgers";
import { canView, currentOwner } from "@/lib/auth/session";
import { runCollectorStream, type CollectorEvent } from "@/agent/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const running = new Set<string>();

/**
 * The agent, live. One run of the Collector streamed to the board as server-sent events: each thing
 * it does appears the moment it does it. One run per ledger at a time.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = getLedger(id);
  if (!data) return new Response("Not found", { status: 404 });
  const owner = await currentOwner();
  if (!canView(data.ledger.ownerKey, owner)) return new Response("Not found", { status: 404 });
  const mode = new URL(req.url).searchParams.get("mode") === "nudge" ? "nudge" : "ask";
  if (data.ledger.status !== "collecting") return new Response("Not collecting", { status: 409 });
  const enc = new TextEncoder();
  const linkBase = process.env.OWED_BASE_URL ?? new URL(req.url).origin;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: CollectorEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      if (running.has(id)) { send({ kind: "error", message: "The agent is already working on this ledger." }); controller.close(); return; }
      running.add(id);
      try {
        await runCollectorStream(id, { linkBase, mode }, send);
      } catch (e) {
        send({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        running.delete(id);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
