import { agentAccount, usdcBalance, publicClient } from "../src/lib/chain/usdc";
import { fromBase, arcTestnet } from "../src/lib/chain/arc";
(async () => {
  const a = agentAccount();
  const [bal, native, block] = await Promise.all([usdcBalance(a.address), publicClient.getBalance({ address: a.address }), publicClient.getBlockNumber()]);
  console.log(`${arcTestnet.name} · block ${block}`);
  console.log(`agent ${a.address}`);
  console.log(`  USDC (erc-20 face)  ${fromBase(bal).toFixed(6)}`);
  console.log(`  native gas balance  ${(Number(native) / 1e18).toFixed(6)} USDC`);
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
