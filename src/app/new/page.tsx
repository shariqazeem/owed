import { TopBar } from "@/components/topbar";
import { currentOwner } from "@/lib/auth/session";
import "./new.css";

export const dynamic = "force-dynamic";

export default async function NewLedger() {
  const owner = await currentOwner();
  return (
    <>
    <TopBar />
    <main className="nw">
      <p className="nw-kicker">Owed</p>
      <h1>Drop it on the agent.</h1>
      <p className="nw-lede">A screenshot of the split, the group chat, the invoice, or just type who owes what. Owed reads it, asks them, and comes back to you only when it needs a decision.</p>
      <form className="nw-form" action="/api/ledgers" method="post" encType="multipart/form-data">
        <label className="nw-field">
          <span>Paste it</span>
          <textarea name="text" rows={7} placeholder={"Sara: hotel was 48,000 for the 3 nights, split 6 ways = 8,000 each\nAli: cool\nMaryam: can I pay Friday?"} />
        </label>
        <label className="nw-field nw-drop">
          <span>Or drop a screenshot</span>
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp" />
        </label>
        <div className="nw-row">
          <label className="nw-field"><span>Anything to add</span><input name="caption" placeholder="I paid the whole bill" /></label>
          <label className="nw-field nw-narrow"><span>Your name, to them</span><input name="owner" placeholder="Sara" defaultValue={owner?.name ?? ""} required /></label>
          <label className="nw-field nw-narrow"><span>Currency if unclear</span><input name="currency" defaultValue="USD" maxLength={3} /></label>
        </div>
        {owner?.wallet ? null : (
          <label className="nw-field">
            <span>Where the money should go — an Arc wallet, optional (sign in and yours is used)</span>
            <input name="payoutTo" placeholder="0x…" pattern="0x[0-9a-fA-F]{40}" title="An Arc address" />
          </label>
        )}
        <button className="nw-go" type="submit">Read it and start collecting →</button>
        <p className="nw-note">Takes a few seconds. You will see exactly what the agent read before anyone is messaged.</p>
      </form>
    </main>
    </>
  );
}
