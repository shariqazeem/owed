import Link from "next/link";
import "./home.css";

/**
 * The front door. One sentence about what the agent does, the three things it is, a board as the
 * agent leaves one, and the way in. The messages shown are the Collector's own words from a real run.
 */
const ROWS = [
  { name: "Ali", note: "hotel + jeep, Murree trip", amount: "PKR 9,500", pill: "paid", cls: "is-paid" },
  { name: "Maryam", note: "hotel + jeep, Murree trip", amount: "PKR 9,500", pill: "asked", cls: "" },
  { name: "Bilal", note: "hotel, Murree trip", amount: "PKR 8,000", pill: "nudged ×1", cls: "" },
  { name: "Zain", note: "hotel + jeep, Murree trip", amount: "PKR 9,500", pill: "asked", cls: "" },
];

export default function Home() {
  return (
    <main className="hm">
      <header className="hm-top">
        <span className="hm-mark">Owed</span>
        <nav className="hm-nav">
          <a href="https://github.com/shariqazeem/owed" rel="noreferrer">source</a>
          <Link href="/new">Drop something on it →</Link>
        </nav>
      </header>

      <section className="hm-hero">
        <p className="hm-kicker">An agent, not a form</p>
        <h1>The agent that gets you paid.</h1>
        <p className="hm-lede">
          Drop a bill split, a group chat or an invoice on it. Owed reads who owes you what, asks each of them in its own words,
          watches the money arrive on chain, and pays you out. You hear from it only when there is a decision to make.
        </p>
        <div className="hm-cta">
          <Link className="hm-go" href="/new">Drop something on it →</Link>
          <span className="hm-cta-note">A screenshot is enough. It reads it in a few seconds.</span>
        </div>
      </section>

      <section className="hm-rail" aria-label="What it is">
        <div className="hm-step">
          <span className="hm-n">1</span>
          <h2>The Reader</h2>
          <p>Turns whatever you dropped into a ledger: who, how much, for what, in the currency the source used.</p>
          <p className="hm-never">Never invents a person or an amount. Tells you what it was unsure about.</p>
        </div>
        <div className="hm-step">
          <span className="hm-n">2</span>
          <h2>The Collector</h2>
          <p>Writes to each person itself, on Telegram or through a note you forward, with a one-time link. Nudges up to three times, then asks you what to do.</p>
          <p className="hm-never">Never guilts, never argues, stops the moment someone says stop.</p>
        </div>
        <div className="hm-step">
          <span className="hm-n">3</span>
          <h2>The Settler</h2>
          <p>Reads every payment off Arc before anything is called paid, thanks the person, and sends you what was collected.</p>
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
            <span className="hm-msg-meta">→ Maryam · board, forwarded on WhatsApp · ask</span>
            <p>Hi Maryam — your share for the hotel and jeep from the Murree trip is PKR 9,500. You can pay here: owed…/pay/0x7f2f…</p>
          </div>
          <div className="hm-msg">
            <span className="hm-msg-meta">→ Acme Retail Ltd · email · ask</span>
            <p>Hi Acme Retail Ltd — hope you’re well. This is a quick first note about Invoice #1042 for the landing page redesign and checkout flow: USD 2,000. You can settle it here: owed…/pay/0xd90b…</p>
          </div>
          <p className="hm-board-fine">The messages are the agent’s own words from a real run. It reads the room: a friend gets a friend’s note, a client gets an invoice note.</p>
        </div>
      </section>

      <section className="hm-pay" aria-label="How they pay">
        <div>
          <h2>How they pay</h2>
          <p>The link opens a page that says exactly what is owed, to whom, and what that is in USDC at the rate stamped when the ledger was made. An email is enough to get a wallet; one tap sends it on Arc. Any other wallet can pay and paste the hash.</p>
        </div>
        <div>
          <h2>How you get it</h2>
          <p>Payments land in the agent’s own wallet, verified against the chain, never against anyone’s word. When everyone has paid, the agent sends the lot to the address you gave it. Or ask for what is held so far, any time.</p>
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
        <p>Built on Strands Agents. Wallets by Privy. USDC on Arc. Open source, MIT.</p>
      </footer>
    </main>
  );
}
