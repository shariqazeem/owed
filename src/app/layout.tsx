import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "../styles/tokens.css";
import { OwedPrivy } from "@/components/privy";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", weight: ["400", "500", "600", "700", "800"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Owed — the agent that gets you paid",
  description:
    "Drop a bill split, an invoice or a group chat on it. Owed works out who owes what, asks them, watches the money arrive, and only interrupts you for a real decision.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable}`}>
      <body>
        <OwedPrivy>{children}</OwedPrivy>
      </body>
    </html>
  );
}
