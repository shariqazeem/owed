/** What each wallet the product touches holds on Arc, both faces of USDC. `npx tsx --env-file=.env scripts/balances.ts [addr…]` */
import { erc20Abi, formatUnits, type Address } from "viem";
import { publicClient } from "../src/lib/chain/usdc";
import { ARC_USDC } from "../src/lib/chain/arc";
import { agentAccount } from "../src/lib/chain/usdc";
(async () => {
  const listed = process.argv.slice(2) as Address[];
  const wallets: Array<[string, Address | undefined]> = listed.length
    ? listed.map((a) => ["given", a])
    : [["privy agent", process.env.PRIVY_AGENT_WALLET_ADDRESS as Address | undefined], ["dev agent", agentAccount().address]];
  for (const [label, a] of wallets) {
    if (!a) { console.log(label, "— not configured"); continue; }
    const nat = await publicClient.getBalance({ address: a });
    const erc = await publicClient.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "balanceOf", args: [a] });
    console.log(`${label.padEnd(12)} ${a}  native ${formatUnits(nat, 18)}  erc20 ${formatUnits(erc, 6)}`);
  }
})();
