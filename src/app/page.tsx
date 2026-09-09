import Link from "next/link";
import { TopBar } from "@/components/topbar";
import "./home.css";

/**
 * The front door. One sentence about what the agent does, the three things it is, a board as the
 * agent leaves one, and the way in. The messages shown are the Collector's own words from a real run.
 */
const ROWS = [
  { name: "Ali", note: "hotel, Murree trip", amount: "PKR 8,000", pill: "paid", cls: "is-paid" },
  { name: "Maryam", note: "hotel, Murree trip", amount: "PKR 8,000", pill: "asked", cls: "" },
  { name: "Bilal", note: "hotel, Murree trip", amount: "PKR 8,000", pill: "nudged ×1", cls: "" },
  { name: "Zain", note: "hotel + jeep, Murree trip", amount: "PKR 9,500", pill: "asked", cls: "" },
];

export default function Home() {
  return (
    <>
      <TopBar />
      <main className="hm">
        <section className="hm-hero">
          <p className="hm-kicker">An agent, not a form</p>
          <h1>The agent that gets you paid.</h1>
          <p className="hm-lede">
            Drop a bill split, a group chat or an invoice on it. Owed reads who owes you what, writes to each of them in its own words,
            answers their questions, watches the money arrive on chain, and pays you out. You hear from it only when there is a decision to make.
          </p>
          <div className="hm-cta">
            <Link className="hm-go" href="/new">Drop something on it →</Link>
            <span className="hm-cta-note">A screenshot is enough. No app for anyone; they pay from a link.</span>
          </div>
        </section>

        <section className="hm-rail" aria-label="What it is">
          <div className="hm-step">
            <span className="hm-n">1</span>
            <h2>It reads</h2>
            <p>Turns whatever you dropped into a ledger: who, how much, for what, in the currency the source used. You check it before anyone hears a word.</p>
            <p className="hm-never">Never invents a person or an amount. Tells you what it was unsure about.</p>
          </div>
          <div className="hm-step">
            <span className="hm-n">2</span>
            <h2>It asks</h2>
            <p>Writes to each person itself, with a one-time link, in the tone the situation calls for. You send each note with one tap from the chat you already share. It nudges up to three times, then asks you what to do.</p>
            <p className="hm-never">Never guilts, never argues, stops the moment someone says stop.</p>
          </div>
          <div className="hm-step">
            <span className="hm-n">3</span>
            <h2>It settles</h2>
            <p>Their link opens a page that answers their questions and takes the payment: an email is enough to get a wallet, one tap sends USDC on Arc. It reads the chain before anything is called paid, thanks them, and sends you the lot.</p>
            <p className="hm-never">Nobody marks anything paid by hand. Not even you.</p>
          </div>
        </section>

        <section className="hm-sample" aria-label="A board">
          <h2>A board, as the agent leaves it</h2>
          <div className="hm-board">
            <p className="hm-board-title">Trip group hotel and jeep split <span>· PKR · collecting</span></p>
            {ROWS.map((r) => (
              <div className={`hm-row ${r.cls}`} key={r.name}>
                <b>{r.name}</b>
                <span className="hm-row-note">{r.note}</span>
                <em>{r.amount}</em>
                <i className={`hm-pill ${r.cls}`}>{r.pill}</i>
              </div>
            ))}
            <div className="hm-msg">
              <span className="hm-msg-meta">to Maryam · ask</span>
              <p>Hi Maryam — your share for the hotel and jeep from the Murree trip is PKR 9,500. You can pay here: owed…/pay/0x7f2f…</p>
            </div>
            <div className="hm-msg">
              <span className="hm-msg-meta">to Acme Retail Ltd · ask</span>
              <p>Hi Acme Retail Ltd — hope you’re well. This is a quick first note about Invoice #1042 for the landing page redesign and checkout flow: USD 2,000. You can settle it here: owed…/pay/0xd90b…</p>
            </div>
            <div className="hm-msg is-in">
              <span className="hm-msg-meta">Hina wrote back, on her page</span>
              <p>actually I gave Maryam cash for this yesterday, mark it paid</p>
            </div>
            <div className="hm-msg">
              <span className="hm-msg-meta">to Hina · reply</span>
              <p>I’ve passed this to Maryam to check. It’s the Murree hotel split, PKR 8,000; your link stays valid either way.</p>
            </div>
            <p className="hm-board-fine">The agent’s own words from real runs. It reads the room: a friend gets a friend’s note, a client gets an invoice note, and a claim of having paid becomes a question for you, not an argument with them.</p>
          </div>
        </section>

        <section className="hm-pay" aria-label="How they pay">
          <div>
            <h2>How they pay</h2>
            <p>Their link says exactly what is owed, to whom, and what that is in USDC at the rate stamped when the ledger was made. They can ask the agent anything right there. An email is enough to get a wallet; one tap sends it on Arc. Any other wallet can pay and paste the hash.</p>
          </div>
          <div>
            <h2>How you get it</h2>
            <p>Sign in with an email and the wallet that comes with it is where the money goes. Payments land in the agent’s own wallet, verified against the chain, never against anyone’s word. When everyone has paid, the agent sends you the lot. Or ask for what is held so far, any time.</p>
          </div>
        </section>

        <section className="hm-who">
          <h2>Who it is for</h2>
          <p>
            The friend who always pays the bill first. The freelancer with three unpaid invoices. The society treasurer, the trip organiser,
            the shop with a notebook of names. Anyone who is owed money and hates asking for it.
          </p>
          <Link className="hm-go hm-go-2" href="/new">Start collecting →</Link>
        </section>

        <footer className="hm-foot">
          <p>Built on Strands Agents. Wallets by Privy. USDC on Arc. Open source, MIT · <a href="https://github.com/shariqazeem/owed" rel="noreferrer">source</a></p>
        </footer>
      </main>
    </>
  );
}
