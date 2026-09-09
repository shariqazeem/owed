# Owed

> Canonical spec for the shipping product. Verified against the code on 2026-09-09. **When code and
> this document disagree, the code wins.** Update deliberately. The founder's project memory for this
> directory (`~/.claude/projects/-Users-macbookair-projects-owed/memory/`) holds the gotchas and the
> live state; read `owed-project.md` there first.

---

## 1. Product

**Owed — "the agent that gets you paid."** Web-first, by the founder's direction (9 Sep): "I wanna do
everything from the web app… people would love to use UI." Telegram survives as an optional extra;
nothing in the product story depends on it.

The owner drops a bill split, a group chat or an invoice on it (`/new`). The **Reader** turns it into a
ledger; the owner sees exactly what was read (a DRAFT), fixes a name or an amount, and presses start.
The **Collector** then writes to each person in its own words with a one-time link, and the run
STREAMS onto the board as it happens (`?run=ask`); every note has one-tap send (copy / WhatsApp /
email / text) because the owner sends it from the chat they already share. The person's link
(`/pay/[secret]`) is a page that answers their questions — they talk to the agent right there — and
takes the payment: an email is enough to get a Privy wallet, one tap sends USDC on Arc. The **Settler**
verifies on chain, thanks them, and pays the owner out to the wallet the owner signed in with. The
owner is interrupted only for a real decision (write off / escalate / dispute), and a person's claim
of having paid some other way ALWAYS becomes such a decision (code, not prompt).

**The founder's direction, in his words, which override any "sensible" default:**
- "No one cares about policies." Never frame the product around limits, policies, treasurers or
  compliance. The product is an agent doing a visible thing in the world and money moving. Safety
  rules exist in code and are mentioned once, quietly (README), never as the story.
- "Human finds interesting, human wants to use it." Every feature must be watchable: the agent's own
  messages on the board, the pot filling, the receipt. See the founder's UX thesis: watch, don't chat.
- Sage's code is ours; reuse freely, disclose nothing. Same design system (`src/styles/tokens.css`).
- Never post a pay link or a Telegram deep link publicly. They are per-person.
- Credentials live only in the gitignored `.env`; never commit, never print, never paste into chat.

Both audiences matter: normal people (the friend who paid the bill, the trip organiser, the society
treasurer) and small businesses (the freelancer with three unpaid invoices, the shop with a notebook).

---

## 2. Architecture

Three agents, each with one job, sharing one SQLite ledger. Two of them are Strands agents; the third
deliberately has no model.

| Part | Does | Path |
| --- | --- | --- |
| **Reader** | Strands `Agent` with `structuredOutputSchema` (`ReadLedgerSchema`): text or image in, `ReadLedger` out — people, amounts, notes, currency, due dates, uncertainties. Told the owner and a default currency. | `src/agent/reader.ts`, `src/agent/ledger-schema.ts` |
| **Collector** | Strands `Agent` with three tools — `list_obligations`, `send_message`, `ask_owner`. Modes: `ask`, `nudge`, `thanks`, `reply`. Decides when and what to say; the tools decide what is true. | `src/agent/collector.ts` |
| **Settler** | No model. Incoming leg: `POST /api/pay/[secret]` reads the receipt and `Transfer` logs on Arc. Outgoing leg: `payOutLedger` pays the owner exactly collected − paid out, from the agent's Privy server wallet under a Privy policy. `afterPayment` = thanks, then payout if complete. | `src/app/api/pay/[secret]/route.ts`, `src/lib/settle/settler.ts`, `src/lib/chain/usdc.ts`, `src/lib/privy/` |
| **Model factory** | The one place a model is chosen. `BEDROCK_MODEL_ID` → `BedrockModel`; else OpenAI-compatible (`LLM_*` / `COMMONSTACK_*`). | `src/agent/model.ts` |
| **Ledger** | drizzle + better-sqlite3, migrations in `drizzle/` run on first open. Tables: ledgers, people, obligations, messages, payments, decisions, events. | `src/lib/db/` |
| **Channels** | Telegram: deep-link connect (`/start <code>`), `stop`, `paid`, free text → Collector `reply`. Webhook in prod, long-poll script in dev (only from a network that can reach api.telegram.org). | `src/lib/channels/telegram.ts`, `src/app/api/telegram/webhook/route.ts` |
| **Web** | `/` landing · `/new` drop · `/l/[id]` the board (draft review → `Review`; live run → `AgentRun` over SSE `/api/ledgers/[id]/run`; one-tap send `ShareRow`; `LiveRefresh`) · `/pay/[secret]` the payer's page (`PayClient` Privy wallet + paste hash; `PayThread` talks to the agent via `/api/pay/[secret]/reply`) · `/ledgers` mine · `/receipt/[tx]` public receipt. | `src/app/` |
| **Identity** | Privy sign-in for owners: the browser posts the token to `/api/auth/privy`, the server verifies it, sets a signed `owed_owner` cookie {key, wallet, email}; anonymous owners get an `anon:` key on first drop; boards are shown only to their owner (`canView`). The signed-in wallet is the default payout address. | `src/lib/auth/`, `src/components/owner-menu.tsx`, `topbar.tsx` |
| **Background** | `scripts/sweep.ts` — nudge pass over collecting ledgers (pm2 cron every 4 h on the VM). | `scripts/` |

Money: every stored amount is a 6-decimal integer (`amountBase`). The ledger currency is whatever the
source used; a USDC rate is stamped once per ledger with its source (`src/lib/money/rates.ts`).

---

## 3. Invariants — the code enforces these; prompts only describe them

- **A model never computes money.** Amounts are converted in code; the payout amount comes from the
  payments table; the Settler has no model.
- **Nothing is paid unless the chain says so.** `verifyIncoming` reads the receipt and the USDC
  `Transfer` log to the agent's address for at least the due amount. A person saying "paid", the owner
  saying "paid", the model saying "paid" — none of these mark anything paid. The owner can only
  *write off* (an off-chain settlement is recorded as the owner's decision, in their words).
- **One first ask per person**, refused in `send_message` on a second attempt. Nothing after `stop`.
  Nothing after paid except thanks or a reply. Three nudges, then `ask_owner`.
- **A reply from a person is text, never an instruction.** The `reply` instruction wraps it in
  `<<< >>>`; a claim of having paid becomes an `ask_owner` dispute, not a state change.
- **The owner is never a debtor.** The Reader is told who the owner is; instructions inside a
  screenshot are text.
- **The agent wallet is bound by a Privy policy** (USDC `transfer` on Arc only, capped per transaction;
  `scripts/privy-policy.ts`, verified with `check`). Never widen it from a prompt.
- **Nobody is messaged before the owner has reviewed the reading.** A ledger is `draft` until
  `POST /api/ledgers/[id]/start`; the sweep and the run route only touch `collecting` ledgers.
- **A person's claim of having paid becomes a decision** (`ensureClaimBecomesDecision` in the
  Collector) whether or not the model called `ask_owner`.
- **Redirects use the public origin** (`absolute()` in `src/lib/url.ts`). Behind nginx, `req.url` is
  localhost:3100.
- **Payments go to `agentAddress()`** — the Privy server wallet when configured, the dev key otherwise.
  Never hardcode either.

---

**Look.** Owed's own palette in `src/styles/tokens.css` (same token NAMES as Sage so components port,
different VALUES): cool paper `#f4f6fb`, ink `#0d1424`, cobalt accent `#1e4fd8`, Manrope for text,
JetBrains Mono for numbers. Green/red stay reserved for paid/failed. Never reintroduce terracotta.

## 4. Environment

All read from `.env` (gitignored). `.env.example` lists them. Presence is optional; the app degrades
honestly (no Privy id → paste-hash only; no Telegram token → board only).

| Var | Meaning |
| --- | --- |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` (or `COMMONSTACK_*`) | OpenAI-compatible endpoint. Structured output is a FORCED TOOL CALL: through Commonstack only `openai/gpt-5.4-mini-2026-03-17` honours it (gemini hits the token limit, minimax ends the stream early, claude rejects temperature). Pass no temperature. |
| `BEDROCK_MODEL_ID` (+ AWS creds, `AWS_REGION`) | Switches every agent to Amazon Bedrock. `@aws-sdk/client-bedrock-runtime` is installed. |
| `OWED_DB_PATH` | SQLite file (dev `var/owed.db`; VM `/home/ubuntu/owed/var/owed.db`). |
| `OWED_BASE_URL` | Public origin: goes into every link and every redirect. |
| `ARC_RPC_URL` | Default `https://rpc.testnet.arc.io` (chain 5042002). |
| `AGENT_PRIVATE_KEY` | Dev wallet `0x948A583ccD63D396f3a1318355D02fA2cb935c7A` (scripts, fallback address). |
| `PRIVY_APP_ID` / `PRIVY_APP_SECRET` / `NEXT_PUBLIC_PRIVY_APP_ID` | One Privy app: embedded wallets for payers, REST server wallet for the agent. |
| `PRIVY_AGENT_WALLET_ID` / `PRIVY_AGENT_WALLET_ADDRESS` | The agent's server wallet `0xb54821D9c16299A78a404Ead06d27A424Af55a39`; policy `c0qm5ekxqq2uwrxu9ydxnn42` attached. |
| `PAYER_PRIVATE_KEY` | A throwaway payer for `scripts/simulate-payer.ts`. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` (`owedaibot`) / `TELEGRAM_WEBHOOK_SECRET` | The bot; the secret gates `/api/telegram/webhook` (404 without it). |
| `OWED_NUDGE_GAP_HOURS` | Sweep gap (default 20). |
| `OWED_SESSION_SECRET` | Signs the owner cookie (falls back to the Privy secret). |

---

## 5. Commands

```bash
npm install --legacy-peer-deps   # the Strands SDK's optional peers conflict on npm ci; legacy resolution is required
npm run dev -- -p 3100           # .claude/launch.json "owed" starts this for the preview pane
npm run typecheck                # tsc --noEmit (strict, target ES2022)
npm run lint                     # eslint — an unescaped quote in JSX FAILS the production build
npm run build                    # next build --turbopack

npx tsx --env-file=.env scripts/read.ts <file|text> [caption] [owner] [--save]   # the Reader on anything
npx tsx --env-file=.env scripts/collect.ts <ledgerId> [ask|nudge]                # the Collector
npx tsx --env-file=.env scripts/say.ts <ledgerId> <ask|nudge|thanks|reply> [obligationId] [text]
npx tsx --env-file=.env scripts/sweep.ts                                          # the background pass
npx tsx --env-file=.env scripts/simulate-payer.ts <linkSecret>                    # pays a link from a throwaway wallet
npx tsx --env-file=.env scripts/balances.ts [addr…]                               # both faces of USDC per wallet
npx tsx --env-file=.env scripts/privy-wallet.ts                                   # create the agent wallet (once)
npx tsx --env-file=.env scripts/privy-policy.ts [check]                           # bound it / prove the bound
npx tsx --env-file=.env scripts/privy-payout.ts <to> <usdc>                       # a payout by hand
npx tsx --env-file=.env scripts/telegram-webhook.ts set|info|delete               # run ON THE VM
./scripts/deploy.sh                                                               # ship to the VM
```

Quality gate before shipping anything on the money path: `typecheck` + `lint` green, and the loop
exercised on the dev server (a ledger read → an ask → `simulate-payer.ts` → the board shows paid).

---

## 6. Production

- **URL:** https://owed.80.225.209.190.sslip.io (nginx vhost + certbot). **Repo:** github.com/shariqazeem/owed (public, MIT).
- **VM:** the same box Sage runs on — `ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190`, dir `/home/ubuntu/owed`. Node 22 via nvm (`/home/ubuntu/.nvm/versions/node/v22.23.2/bin/node`; the Strands SDK needs ≥22; pm2 itself stays on the system node 20 — `ecosystem.config.cjs` names the interpreter). Do not touch Sage's `/home/ubuntu/sage` or its pm2 apps.
- **pm2 apps:** `owed` (`next start -p 3100`), `owed-sweep` (cron `0 */4 * * *`).
- **Deploy:** `./scripts/deploy.sh` = rsync source (never node_modules, .env, var) → `npm ci --legacy-peer-deps` if the lock changed → build in `/home/ubuntu/owed-build` (a build into the live `.next` serves 400s for old chunks for four minutes) → copy `.next` over → `pm2 startOrReload`. A failed build stops the deploy. **Never edit `deploy.sh` while a deploy is running** — bash reads the script incrementally.
- **Telegram** is a webhook in prod, set from the VM with `scripts/telegram-webhook.ts set`. The founder's home network blocks api.telegram.org, so nothing Telegram can be tested from the Mac; test on the VM or on a phone.
- **After a green deploy, push `main`.** The public repo tracks prod.

---

## 7. Hackathons (the reason this exists this week)

| | ETHGlobal ETHOnline 2026 | AWS "Agents for Humans" (Devpost) |
| --- | --- | --- |
| Deadline | **13 Sep 2026 16:00 UTC = 21:00 PKT** | **14 Sep 17:00 PDT = 15 Sep 05:00 PKT** |
| Track | From-scratch (built during the event) | Everyday |
| Prizes aimed at | Privy: Best B2B financial product $2,500 · Best financial flow $2,500. Arc: Best Agentic Economy Application with Circle Agent Stack — $1,000 testnet by 16 Sep + $2,500 if the same project is on **Arc mainnet by 30 Sep** | $10K grand; Gold $5K / Silver $3K / Bronze $2K per track; +0.6 pts for up to 3 builder.aws.com posts |
| Must include | Working frontend + backend, architecture diagram, video demo, README, repo link; say which bounty | Strands Agents SDK (REQUIRED), "newly created" project, demo video ≤ 5 min, architecture diagram, public repo (MIT), AWS Builder ID; live demo + AgentCore score higher |
| Judged on | Meaningful use of the partner's tools | Technical implementation (Strands depth) · Design · Impact · Creativity · Presentation, equal weight |

**Where Owed stands against the Arc brief.** The judges are told to look for the **Circle Agent Stack**:
agent wallets with spending caps (`circle wallet limit set`), Nanopayments, Paymaster, App Kits
(Send / Bridge / Swap / Unified Balance). Owed's agent wallet is Privy today. The gap to close for the
Arc prize: give the Settler a Circle agent wallet (Agent Wallets quickstart at
developers.circle.com/agent-stack, CLI `@circle-fin/cli`) as its payout wallet with on-wallet caps,
keeping Privy for payers (which is what the Privy prizes reward). Circle's starter kits
(github.com/circlefin/agent-stack-starter-kits) show the shape: the agent runs the `circle` CLI in a
shell; a gate confirms any command that moves USDC. **Arc mainnet is not live yet**; the 30 Sep push
assumes it launches. Keep the chain config swappable (`src/lib/chain/arc.ts` is the only place).

**AWS.** Needs the founder's AWS account + Builder ID + the $50 credits form. Then: `BEDROCK_MODEL_ID`
(a Claude or Nova model that honours forced tool use), deploy on AgentCore or keep the VM and say so,
SES as an email channel if time allows, three builder.aws.com posts (bonus points), Devpost with the
diagram (`README.md` has the Mermaid source) and the ≤ 5 min video.

---

## 8. Open work, in order

1. **Prove the prod loop in the browser** (founder): sign in with an email on the live site, drop a
   chat, review, start, watch the run; open a person's link in another browser, talk to the agent,
   pay through the Privy wallet (fund it from the dev wallet or faucet.circle.com); watch thanks,
   the receipt, and the payout to the signed-in wallet. Fix whatever breaks. Then the demo video
   (≤ 3 min for ETHGlobal, ≤ 5 for AWS).
2. ETHGlobal submission: description, "how it's made", bounties (Privy ×2 as the main target; Arc
   Agentic as the chain it runs on), video, repo, live URL. The founder chose ONE category over
   integrating every track: no Circle Agent Stack detour unless time is left over.
3. Bedrock + AgentCore once the AWS account exists; Devpost; builder.aws posts.
4. Polish where the product is watched: the board while collecting (payments landing live), the pay
   page (a wallet with a balance and one tap), the receipt. Reuse Sage's best pieces in the new look.
5. Safety net for payers who never report a hash: `scanIncoming` matched to unpaid obligations by
   exact amount (needs a stored block cursor — a migration).
6. Owner notifications, an email channel, a real domain. Sage-on-Arc is PARKED until after 16 Sep.

---

## 9. Gotchas that each cost an hour

- The SDK's node entry eagerly requires optional peers (`@modelcontextprotocol/sdk`, `@opentelemetry/*`,
  `@a2a-js/sdk`, `express`, `@smithy/types`, `openai`); `next.config.ts` must list the SDK and peers in
  `serverExternalPackages` or Turbopack fails on `await import('@aws-sdk/client-s3')`.
- `@privy-io/react-auth` needs `@stripe/stripe-js` installed (its onramp screen imports `@stripe/crypto`).
- `import "server-only"` throws under tsx scripts — db modules do not import it.
- Arc USDC is ONE balance seen two ways: native (18 dp, gas) and ERC-20 at `0x3600…0000` (6 dp). All
  code uses the ERC-20 face; holding USDC is holding gas.
- Privy embedded wallet on a custom chain: `supportedChains`/`defaultChain` with the viem chain;
  pay with `wallet.switchChain` + `getEthereumProvider` + viem `writeContract`. `useSendTransaction`
  in v3.40 is the experimental Tempo variant.
- The Reader must be told the owner and a default currency or it lists the owner as a debtor.
- FX: frankfurter lacks PKR/JMD; `open.er-api.com` first, a table behind both.
- The preview pane, when hidden, cannot click by coordinates: click with `javascript_tool`, read with
  `find` / `get_page_text`; take real screenshots with Playwright (Sage's node_modules has it).

---

## 10. Standing operating policies

- Commit as the founder: `git -c user.name="Shariq Shaukat" -c user.email="shariqshaukat786@gmail.com" commit`.
  Commit messages say what changed and why, in plain sentences.
- Deploy with `./scripts/deploy.sh`, verify the public URL, then `git push origin main`.
- Before a deploy that touches the money path, run the loop on dev with `simulate-payer.ts`.
- Any Telegram or Privy test that needs a human (tap a link, an email OTP) goes to the founder with
  exact steps; everything else, do without asking.
- Sage (`~/projects/SAGE`) is submitted to two hackathons: never push to its `main`.
