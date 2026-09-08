/** Run one Collector moment by hand: `npx tsx --env-file=.env scripts/say.ts <ledgerId> <mode> [obligationId] [text]` — mode is ask | nudge | thanks | reply. */
import { runCollector, type CollectorRun } from "../src/agent/collector";
const [ledgerId, mode, obligationId, ...rest] = process.argv.slice(2);
if (!ledgerId || !mode) { console.error("usage: say.ts <ledgerId> <ask|nudge|thanks|reply> [obligationId] [text]"); process.exit(2); }
const base = process.env.OWED_BASE_URL ?? "http://localhost:3100";
let run: CollectorRun;
if (mode === "ask" || mode === "nudge") run = { linkBase: base, mode };
else if (mode === "thanks" && obligationId) run = { linkBase: base, mode, obligationId };
else if (mode === "reply" && obligationId && rest.length) run = { linkBase: base, mode, obligationId, text: rest.join(" ") };
else { console.error("that mode needs an obligation id (and text for reply)"); process.exit(2); }
runCollector(ledgerId, run).then((r) => { console.log(r); process.exit(0); }).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
