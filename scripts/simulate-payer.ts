/**
 * A real payment, end to end, with a second wallet: the agent funds a payer, the payer pays an
 * obligation on Arc, the pay API verifies the transaction on chain, the board flips to paid.
 *   npx tsx --env-file=.env scripts/simulate-payer.ts <secret>
 */
import { createWalletClient, http, erc20Abi, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { appendFileSync, readFileSync } from "node:fs";
import { arcTestnet, ARC_USDC } from "../src/lib/chain/arc";
import { publicClient, agentAccount, usdcBalance, payOut } from "../src/lib/chain/usdc";

const secret = process.argv[2];
if (!secret) { console.error("usage: simulate-payer.ts <link secret>"); process.exit(2); }
const base = process.env.OWED_BASE_URL ?? "http://localhost:3100";

(async () => {
  let pk = process.env.PAYER_PRIVATE_KEY as Hex | undefined;
  if (!pk) { pk = generatePrivateKey(); appendFileSync(".env", `PAYER_PRIVATE_KEY=${pk}\n`); console.log("made a payer wallet"); }
  const payer = privateKeyToAccount(pk);
  const agent = agentAccount();
  console.log("payer", payer.address);

  // what does this link ask for?
  const page = await fetch(`${base}/pay/${secret}`).then((r) => r.text());
  const usdc = Number((page.match(/\\"usdc\\":([0-9.]+)/) ?? page.match(/"usdc":([0-9.]+)/))?.[1] ?? "0");
  if (!usdc) throw new Error("could not read the USDC amount off the pay page");
  const dueBase = BigInt(Math.round(usdc * 1e6));
  console.log(`link asks for ${usdc} USDC`);

  // fund the payer from the agent if needed: the amount plus a little for gas (gas is USDC on Arc)
  const have = await usdcBalance(payer.address);
  const need = dueBase + 500_000n;
  if (have < need) {
    const tx = await payOut(payer.address, need - have);
    console.log("funding payer:", tx);
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }

  // the payer pays the agent exactly what the link asks
  const wallet = createWalletClient({ account: payer, chain: arcTestnet, transport: http() });
  const hash = await wallet.writeContract({ address: ARC_USDC, abi: erc20Abi, functionName: "transfer", args: [agent.address, dueBase] });
  console.log("payer paid:", hash);
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("status:", rcpt.status, "block:", rcpt.blockNumber.toString());

  // tell Owed, and let the Settler verify it on chain
  const res = await fetch(`${base}/api/pay/${secret}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash }) });
  console.log("api:", res.status, await res.text());
  console.log("explorer:", `https://testnet.arcscan.app/tx/${hash}`);
  readFileSync; // keep the import honest for future use
})().catch((e) => { console.error("SIMULATION FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
