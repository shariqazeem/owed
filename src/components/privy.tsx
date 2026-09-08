"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "@/lib/chain/arc";

/**
 * Privy, only where a person needs a wallet they do not have: the pay page. An email is enough to
 * get one, it lives on Arc, and it signs the one transfer this page is for. Without an app id the
 * page still works — any Arc wallet can pay and paste the hash.
 */
export function OwedPrivy({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "light", accentColor: "#c2410c", walletChainType: "ethereum-only" },
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
