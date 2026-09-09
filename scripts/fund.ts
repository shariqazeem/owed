/** Testnet only: top up a wallet from the dev key's wallet. `npx tsx --env-file=.env scripts/fund.ts <to> <usdc>` */
import { isAddress, type Address } from "viem";
import { payOut, publicClient, usdcBalance, agentAccount } from "../src/lib/chain/usdc";
import { txUrl } from "../src/lib/chain/arc";
const [to, usdc] = process.argv.slice(2);
if (!to || !isAddress(to) || !usdc || !(Number(usdc) > 0)) { console.error("usage: fund.ts <0xaddress> <usdc>"); process.exit(2); }
(async () => {
  const have = Number(await usdcBalance(agentAccount().address)) / 1e6;
  console.log(`dev wallet ${agentAccount().address} holds ${have.toFixed(2)} USDC`);
  const hash = await payOut(to as Address, BigInt(Math.round(Number(usdc) * 1_000_000)));
  const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  console.log(`sent ${usdc} USDC to ${to}: ${r.status} ${txUrl(hash)}`);
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
