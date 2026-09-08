/**
 * Bound the agent's Privy server wallet: the only thing Privy's enclave will ever sign for it is a
 * USDC `transfer` on Arc, at most OWED_PAYOUT_CAP_USDC (default 1,000) per transaction. Nothing the
 * model says can widen that — the rule lives in Privy, not in a prompt.
 *
 *   npx tsx --env-file=.env scripts/privy-policy.ts          create the policy and attach it
 *   npx tsx --env-file=.env scripts/privy-policy.ts check    prove it: a non-USDC signature must be refused
 */
import { privyGet, privyPatch, privyPost, signTransaction } from "../src/lib/privy/client";
import { agentPrivyWallet } from "../src/lib/privy/agent-wallet";
import { ARC_USDC, arcTestnet } from "../src/lib/chain/arc";

const TRANSFER_ABI = [
  { type: "function", name: "transfer", stateMutability: "nonpayable", outputs: [{ type: "bool" }], inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }] },
];
const capUsdc = Number(process.env.OWED_PAYOUT_CAP_USDC ?? 1000);
const capHex = `0x${BigInt(Math.round(capUsdc * 1_000_000)).toString(16)}`;

const policy = {
  version: "1.0",
  name: "owed agent wallet: USDC transfers on Arc only",
  chain_type: "ethereum",
  rules: [
    {
      name: `transfer USDC, at most ${capUsdc} per transaction`,
      method: "eth_signTransaction",
      action: "ALLOW",
      conditions: [
        { field_source: "ethereum_transaction", field: "to", operator: "eq", value: ARC_USDC },
        { field_source: "ethereum_calldata", field: "transfer.amount", abi: TRANSFER_ABI, operator: "lte", value: capHex },
      ],
    },
  ],
};

(async () => {
  const w = agentPrivyWallet();
  if (!w) throw new Error("No agent wallet in the env (PRIVY_AGENT_WALLET_ID / _ADDRESS)");
  const mode = process.argv[2] ?? "create";
  if (mode === "check") {
    // a plain value transfer to a random address is outside the policy: Privy must refuse to sign it
    try {
      await signTransaction(w.id, { to: "0x000000000000000000000000000000000000dEaD", value: "0x1", nonce: "0x0", chain_id: arcTestnet.id, gas_limit: "0x5208", max_fee_per_gas: "0x3b9aca00", max_priority_fee_per_gas: "0x3b9aca00", type: 2 });
      console.log("REFUSAL EXPECTED, BUT PRIVY SIGNED IT — the policy is not attached");
      process.exit(1);
    } catch (e) {
      console.log("refused, as it should be:", (e instanceof Error ? e.message : String(e)).slice(0, 200));
    }
    const wallet = await privyGet<{ policy_ids?: string[] }>(`/wallets/${w.id}`);
    console.log("wallet policies:", JSON.stringify(wallet.policy_ids ?? []));
    return;
  }
  const created = await privyPost<{ id: string }>("/policies", policy);
  console.log("policy created:", created.id);
  await privyPatch(`/wallets/${w.id}`, { policy_ids: [created.id] });
  console.log(`attached to ${w.address}. Now run: scripts/privy-policy.ts check`);
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
