/**
 * Run the Reader on a fixture and print the ledger it produced.
 *   npx tsx scripts/read.ts fixtures/group-chat.txt
 *   npx tsx scripts/read.ts fixtures/bill-split.png "dinner, I paid"
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { readLedger } from "../src/agent/reader";

const file = process.argv[2];
if (!file) { console.error("usage: tsx scripts/read.ts <file> [caption]"); process.exit(2); }
const caption = process.argv[3];
const owner = process.argv[4];
const save = process.argv.includes("--save");
const ext = extname(file).toLowerCase();
const t0 = Date.now();
const input =
  ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp"
    ? ({ kind: "screenshot", bytes: new Uint8Array(readFileSync(file)), format: ext === ".png" ? "png" : ext === ".webp" ? "webp" : "jpeg", caption, owner, defaultCurrency: process.env.OWED_DEFAULT_CURRENCY } as const)
    : ({ kind: "text", text: readFileSync(file, "utf8"), caption, owner, defaultCurrency: process.env.OWED_DEFAULT_CURRENCY } as const);

readLedger(input)
  .then(({ ledger, model }) => {
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n${ledger.title}  ·  ${ledger.currency}  ·  ${model}  ·  ${secs}s`);
    console.log(`  ${ledger.sourceSummary}`);
    if (ledger.payoutLabel) console.log(`  payout → ${ledger.payoutLabel}`);
    console.log("");
    for (const p of ledger.people) console.log(`  ${p.name.padEnd(22)} ${String(p.amount).padStart(10)}  ${p.note ?? ""}${p.handle ? `  <${p.handle}>` : ""}${p.dueAt ? `  due ${p.dueAt}` : ""}`);
    const total = ledger.people.reduce((s, p) => s + p.amount, 0);
    console.log(`  ${"total".padEnd(22)} ${String(total).padStart(10)}`);
    if (ledger.uncertainties.length) { console.log("\n  uncertain:"); for (const u of ledger.uncertainties) console.log(`   – ${u}`); }
    if (save) {
      return Promise.all([import("../src/lib/db/ledgers"), import("../src/lib/money/rates")]).then(async ([{ createLedgerFromReading, getLedger }, { stampRate }]) => {
        const rate = await stampRate(ledger.currency);
        console.log(`  rate: 1 ${ledger.currency} = ${rate.usdcPerUnit} USDC · ${rate.source}`);
        const { ledgerId } = createLedgerFromReading(owner ?? "dev", input.kind === "text" ? "text" : "screenshot", ledger, rate);
        const back = getLedger(ledgerId);
        console.log(`\n  saved ${ledgerId}: ${back?.people.length} people, ${back?.obligations.length} obligations, ${back?.events.length} event(s); first link secret ${back?.obligations[0]?.linkSecret.slice(0, 10)}…`);
      });
    }
  })
  .catch((e) => { console.error("READER FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
