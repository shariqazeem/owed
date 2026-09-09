# The demo — read this while you record

Two cuts from one recording: **ETHGlobal ≤ 3:00** (drop beat 6) and **AWS ≤ 5:00** (everything).
Say the **SAY** lines. Do the **DO** lines while you say them. Facecam for the first and last beat only.
Two browsers side by side: **A** is you (the owner), **B** is a friend (a private window, signed out).

## Before you press record

1. Live site open in A, signed out: https://owed.80.225.209.190.sslip.io
2. B: a private window at the same site, nothing open yet.
3. Clipboard: the chat below. You paste it in beat 2.
4. Your phone's email open (Privy sends a code when you sign in). Or use Google.
5. Fund the friend's wallet AFTER it appears in beat 5 — keep `scripts/privy-payout.ts` ready in a
   terminal: `npx tsx --env-file=.env scripts/privy-payout.ts <address> 30` (or faucet.circle.com).
   Do it off camera; cut.

```
Maryam: hotel in Murree was 48,000 for 6 of us, 8,000 each
Ali: cool, will send
Zain: I paid the jeep, 9,000, so 1,500 each on top
Bilal: ok
Hina: can I pay Friday?
```

## BEAT 1 · 0:00 → 0:12 · CAMERA

**SAY** › Everyone has a friend who paid the bill and never got it back. I'm Shariq. This is Owed,
the agent that gets you paid. Watch it work.

## BEAT 2 · 0:12 → 0:40 · A — sign in, drop

**SAY** › You sign in with an email. That's it, no wallet app — the wallet comes with the email, and
that's where the money will land.

**DO** › Sign in (Privy modal, code). Point at your address in the top bar.

**SAY** › Then you drop the thing. A screenshot, an invoice, or just the group chat.

**DO** › New → paste the chat → name "Maryam" → currency PKR → Read it.

## BEAT 3 · 0:40 → 1:05 · A — the review

**SAY** › It read the chat. Three people owe me 8,000. It noticed Zain paid the jeep, and that's
Zain's money, not mine, so it kept it off my ledger and told me why. Nobody has been messaged yet.
I check it, and I say go.

**DO** › Rest on the rows, then on "I was not sure about". Press **Start collecting**.

## BEAT 4 · 1:05 → 1:35 · A — the agent writes, live

**SAY** › Now watch. It reads the ledger, and it writes to each person, in its own words, with a
one-time link. Not a template. A note I'd actually send.

**DO** › Let the run play: Reading the ledger → Writing to Ali → the message appears. Then the
board: point at **WhatsApp** on Ali's note. Click **Copy**.

**SAY** › I send it from the chat we already share. One tap.

## BEAT 5 · 1:35 → 2:20 · B — Ali's page

**DO** › Paste Ali's link into B.

**SAY** › This is what Ali gets. What he owes, what it is, and what that is in USDC at the rate the
agent stamped. And he can just ask.

**DO** › Type: *which hotel is this? can I pay Friday?* → Send. Read the answer aloud, short.

**SAY** › It answers from the ledger. Now he pays. An email is enough — the wallet is made for him.

**DO** › Pay → sign in as the friend (second email) → the wallet appears with its balance. ⏸ CUT if
you need to fund it. Resume: **Pay 28.83 USDC now** → confirm → "Sent. The agent is reading the
chain…" → **Paid, and verified on Arc.** → receipt.

**SAY** › The agent read the chain itself. Nobody marked that paid. Here's the receipt, with the
transaction.

## BEAT 6 · 2:20 → 2:45 · B then A — the claim (AWS cut only, or if time)

**DO** › B, on Hina's page: type *I gave Maryam cash yesterday, mark it paid* → Send.

**SAY** › And when someone says they already paid? It doesn't argue, and it doesn't believe them.
It hands me the decision.

**DO** › A: the board shows **Needs you** → press **Still owed**.

## BEAT 7 · 2:45 → 2:58 · A — the money

**DO** › Board: pot bar moved, Ali **paid**, **The money**: collected, held, goes to your wallet.

**SAY** › When everyone has paid, it sends me the lot, to the wallet I signed in with. I never asked
anyone for anything.

## BEAT 8 · 2:58 → 3:05 · CAMERA

**SAY** › Owed. Drop it, and get paid. Link below.

---

## Numbers you say and where they are on screen

| you say | on screen |
| --- | --- |
| 8,000 each, three people | the review rows, the board |
| 28.83 USDC at the stamped rate | Ali's page (`1 PKR = 0.0036… USDC, open.er-api.com`) |
| the receipt, with the transaction | `/receipt/<tx>` → Arcscan |

## Never on screen

- A pay link's full URL for longer than it takes to paste it. Blur it in the edit if it lingers.
- Your email code.
- The dev wallet's private key or any `.env`.

## If it breaks mid-take

Keep talking, move to the next beat, cut it later. The only things that must happen live are the
agent's run (beat 4) and the payment (beat 5). If the run stalls, say "it's writing" and cut to the
board with the notes already there.
