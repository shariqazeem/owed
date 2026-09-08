/**
 * One stamped rate per ledger: how many USDC one unit of the ledger's currency is worth at the moment
 * the ledger is created. Stamped ONCE, with its source, so every person on the ledger pays the same
 * rate and the owner can see where it came from. Fetched live; a small table is the fallback so a
 * network blip never blocks a ledger from being created.
 */
export interface StampedRate {
  /** USDC per one unit of `currency` */
  usdcPerUnit: number;
  source: string;
  at: number;
}

const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, PKR: 0.0036, INR: 0.012, JMD: 0.0063, TTD: 0.147, BBD: 0.5,
  CAD: 0.73, AUD: 0.66, NGN: 0.00065, KES: 0.0077, PHP: 0.0175, BDT: 0.0084, AED: 0.272, SAR: 0.267,
};

async function fetchJson(url: string): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(t);
  }
}

export async function stampRate(currency: string): Promise<StampedRate> {
  const c = currency.toUpperCase();
  const at = Math.floor(Date.now() / 1000);
  if (c === "USD" || c === "USDC") return { usdcPerUnit: 1, source: "USDC is a dollar", at };
  // open.er-api.com covers ~160 currencies with no key; frankfurter (ECB) is the second source.
  const sources: Array<[string, () => Promise<number | null>]> = [
    ["open.er-api.com (USD base)", async () => {
      const j = (await fetchJson(`https://open.er-api.com/v6/latest/USD`)) as { result?: string; rates?: Record<string, number> } | null;
      const r = j?.rates?.[c];
      return j?.result === "success" && r && r > 0 ? 1 / r : null;
    }],
    ["frankfurter.app (ECB reference rates)", async () => {
      const j = (await fetchJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(c)}&to=USD`)) as { rates?: { USD?: number } } | null;
      return j?.rates?.USD && j.rates.USD > 0 ? j.rates.USD : null;
    }],
  ];
  for (const [source, get] of sources) {
    try {
      const v = await get();
      if (v) return { usdcPerUnit: Number(v.toPrecision(6)), source, at };
    } catch { /* next source */ }
  }
  if (FALLBACK[c]) return { usdcPerUnit: FALLBACK[c], source: "fallback table (rate service unreachable)", at };
  throw new Error(`No rate for ${c}`);
}

/** Convert a ledger-currency base amount (6 dp) into USDC base units (6 dp) at a stamped rate. Rounds half up. */
export function toUsdcBase(amountBase: number, rate: StampedRate): bigint {
  return BigInt(Math.round(amountBase * rate.usdcPerUnit));
}
