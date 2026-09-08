import { createPublicClient, createWalletClient, erc20Abi, http, parseAbiItem, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet, ARC_USDC } from "./arc";

/**
 * The agent's hands on Arc: read balances, verify that a payment really happened, and pay out.
 * Every amount here is in 6-decimal USDC base units. Nothing in this file decides WHETHER to pay;
 * it only does what the Settler already decided, and reports what the chain says.
 */
export const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

export function agentAccount() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error("AGENT_PRIVATE_KEY is not set");
  return privateKeyToAccount(pk as `0x${string}`);
}

export function walletClient() {
  return createWalletClient({ account: agentAccount(), chain: arcTestnet, transport: http() });
}

export async function usdcBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] });
}

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

export interface VerifiedTransfer {
  txHash: Hash;
  from: Address;
  to: Address;
  amountBase: bigint;
  blockNumber: bigint;
}

/**
 * A payer's wallet tells us "I paid, here is the hash". We do not believe it: we read the receipt
 * and the USDC Transfer logs inside it, and accept only a transfer TO the expected address of at
 * least the expected amount. A wrong hash, a reverted tx, or someone else's payment is not a payment.
 */
export async function verifyIncoming(txHash: Hash, expectedTo: Address, minAmountBase: bigint): Promise<VerifiedTransfer | null> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") return null;
  const logs = await publicClient.getLogs({ address: ARC_USDC, event: TRANSFER, fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber });
  for (const log of logs) {
    if (log.transactionHash !== txHash) continue;
    const { from, to, value } = log.args;
    if (!from || !to || value === undefined) continue;
    if (to.toLowerCase() === expectedTo.toLowerCase() && value >= minAmountBase) {
      return { txHash, from, to, amountBase: value, blockNumber: receipt.blockNumber };
    }
  }
  return null;
}

/** Every USDC transfer into an address since a block — the safety net for payers who never reported a hash. */
export async function scanIncoming(to: Address, fromBlock: bigint): Promise<VerifiedTransfer[]> {
  const logs = await publicClient.getLogs({ address: ARC_USDC, event: TRANSFER, args: { to }, fromBlock, toBlock: "latest" });
  return logs
    .filter((l) => l.args.from && l.args.value !== undefined)
    .map((l) => ({ txHash: l.transactionHash, from: l.args.from as Address, to, amountBase: l.args.value as bigint, blockNumber: l.blockNumber }));
}

/** Pay out. Native USDC also answers as ERC-20, so one transfer call covers a wallet or a contract. */
export async function payOut(to: Address, amountBase: bigint): Promise<Hash> {
  const client = walletClient();
  return client.writeContract({ address: ARC_USDC, abi: erc20Abi, functionName: "transfer", args: [to, amountBase] });
}
