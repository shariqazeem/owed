/** Development only: long-poll Telegram so the bot works without a public webhook. */
import { handleUpdate } from "../src/lib/channels/telegram";
const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
let offset = 0;
console.log("polling @" + process.env.TELEGRAM_BOT_USERNAME);
(async () => {
  for (;;) {
    const res = await fetch(`${API}/getUpdates?timeout=25&offset=${offset}`).catch(() => null);
    const j = res ? ((await res.json()) as { ok: boolean; result: Array<{ update_id: number; message?: { chat: { id: number }; text?: string } }> }) : null;
    for (const u of j?.result ?? []) {
      offset = u.update_id + 1;
      try { console.log(new Date().toISOString(), await handleUpdate(u)); } catch (e) { console.error("update failed:", e instanceof Error ? e.message : e); }
    }
  }
})();
