/** Point the bot at this deployment: `npx tsx --env-file=.env scripts/telegram-webhook.ts [set|info|delete]`. Reads the token from the env; prints none of it. */
const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const cmd = process.argv[2] ?? "set";
(async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (cmd === "set") {
    const base = process.env.OWED_BASE_URL;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!base || !secret) throw new Error("OWED_BASE_URL and TELEGRAM_WEBHOOK_SECRET are both required");
    const res = await fetch(`${API}/setWebhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: `${base}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"] }) });
    console.log("setWebhook →", JSON.stringify(await res.json()));
  } else if (cmd === "delete") {
    const res = await fetch(`${API}/deleteWebhook`, { method: "POST" });
    console.log("deleteWebhook →", JSON.stringify(await res.json()));
  }
  const info = await fetch(`${API}/getWebhookInfo`).then((r) => r.json()) as { result?: Record<string, unknown> };
  console.log("webhook:", JSON.stringify(info.result ?? info));
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
