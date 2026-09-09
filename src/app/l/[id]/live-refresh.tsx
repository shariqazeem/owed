"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a ledger is collecting, the board re-reads itself every few seconds so a payment shows up when it lands. */
export function LiveRefresh({ every = 6000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
