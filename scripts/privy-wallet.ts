import { appendFileSync } from "node:fs";
import { ensureAgentPrivyWallet } from "../src/lib/privy/agent-wallet";
import { usdcBalance } from "../src/lib/chain/usdc";
(async () => {
  const w = await ensureAgentPrivyWallet();
  if (w.created) { appendFileSync(".env", `PRIVY_AGENT_WALLET_ID=${w.id}\nPRIVY_AGENT_WALLET_ADDRESS=${w.address}\n`); console.log("created a Privy server wallet and saved its id"); }
  console.log("privy agent wallet:", w.address, "| id:", w.id.slice(0, 8) + "…");
  console.log("USDC on Arc:", (Number(await usdcBalance(w.address)) / 1e6).toFixed(6));
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
