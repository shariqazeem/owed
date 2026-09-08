import { defineChain, type Address } from "viem";

/**
 * Arc testnet — Circle's chain. USDC is the NATIVE gas token (18 decimals at the gas layer) and is
 * also exposed through an ERC-20 interface at a fixed address that uses 6 decimals. Every amount
 * Owed stores is in 6-decimal base units, and every ERC-20 call goes to this interface, so the two
 * precisions never meet in our code.
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

/** The ERC-20 face of native USDC. 6 decimals. */
export const ARC_USDC: Address = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS = 6;

export const toBase = (usd: number): bigint => BigInt(Math.round(usd * 1_000_000));
export const fromBase = (base: bigint | number): number => Number(base) / 1_000_000;
export const txUrl = (hash: string): string => `https://testnet.arcscan.app/tx/${hash}`;
