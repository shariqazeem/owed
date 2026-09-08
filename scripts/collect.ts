import { runCollector } from "../src/agent/collector";
import { getLedger } from "../src/lib/db/ledgers";
const id = process.argv[2]; const mode = (process.argv[3] as "ask" | "nudge") ?? "ask";
if (!id) { console.error("usage: tsx scripts/collect.ts <ledgerId> [ask|nudge]"); process.exit(2); }
runCollector(id, { linkBase: process.env.OWED_BASE_URL ?? "http://localhost:3100", mode }).then((report) => {
  console.log("\nCollector:", report);
  const data = getLedger(id)!;
  console.log(`\nmessages on the board: ${data.events.filter((e) => e.kind.startsWith("message:")).length}`);
}).catch((e) => { console.error("COLLECTOR FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
