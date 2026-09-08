import { encodeFunctionData, erc20Abi, type Address, type Hash } from "viem";
import { createServerWallet, signTransaction } from "./client";
import { publicClient } from "@/lib/chain/usdc";
import { arcTestnet, ARC_USDC } from "@/lib/chain/arc";

/**
 * The agent's own wallet as a Privy server wallet: the key lives in Privy's TEE, Owed holds only the
 * wallet id, and a policy can bound what it may ever sign. This is the wallet the Settler pays out
 * from. Identity is remembered in the environment (PRIVY_AGENT_WALLET_ID / _ADDRESS) after creation.
 */
export function agentPrivyWallet(): { id: string; address: Address } | null {
  const id = process.env.PRIVY_AGENT_WALLET_ID;
  const address = process.env.PRIVY_AGENT_WALLET_ADDRESS as Address | undefined;
  return id && address ? { id, address } : null;
}

export async function ensureAgentPrivyWallet(): Promise<{ id: string; address: Address; created: boolean }> {
  const have = agentPrivyWallet();
  if (have) return { ...have, created: false };
  const w = await createServerWallet();
  return { id: w.id, address: w.address, created: true };
}

/** Pay USDC on Arc from the Privy wallet: build, let Privy sign, broadcast ourselves. */
export async function payOutFromPrivy(to: Address, amountBase: bigint): Promise<Hash> {
  const w = agentPrivyWallet();
  if (!w) throw new Error("No Privy agent wallet yet — run scripts/privy-wallet.ts");
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amountBase] });
  const [nonce, gas, fees] = await Promise.all([
    publicClient.getTransactionCount({ address: w.address, blockTag: "pending" }),
    publicClient.estimateGas({ account: w.address, to: ARC_USDC, data }),
    publicClient.estimateFeesPerGas(),
  ]);
  const hex = (n: bigint | number) => `0x${BigInt(n).toString(16)}` as `0x${string}`;
  const signed = await signTransaction(w.id, {
    to: ARC_USDC, data, value: "0x0", nonce: hex(nonce), chain_id: arcTestnet.id, type: 2,
    gas_limit: hex((gas * 12n) / 10n), max_fee_per_gas: hex(fees.maxFeePerGas ?? 20_000_000_000n), max_priority_fee_per_gas: hex(fees.maxPriorityFeePerGas ?? 1_000_000_000n),
  });
  return publicClient.sendRawTransaction({ serializedTransaction: signed });
}
