/** A payout from the agent's Privy wallet by hand: `npx tsx --env-file=.env scripts/privy-payout.ts <to> <usdc>`. Privy signs (inside its policy), we broadcast on Arc, and wait for the receipt. */
import { isAddress, type Address } from "viem";
import { payOutFromPrivy } from "../src/lib/privy/agent-wallet";
import { publicClient } from "../src/lib/chain/usdc";
import { txUrl } from "../src/lib/chain/arc";
const [to, usdc] = process.argv.slice(2);
if (!to || !isAddress(to) || !usdc || !(Number(usdc) > 0)) { console.error("usage: privy-payout.ts <0xaddress> <usdc>"); process.exit(2); }
(async () => {
  const amount = BigInt(Math.round(Number(usdc) * 1_000_000));
  const hash = await payOutFromPrivy(to as Address, amount);
  console.log("signed by Privy, broadcast:", hash);
  const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  console.log("status:", r.status, "block:", r.blockNumber.toString(), txUrl(hash));
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
