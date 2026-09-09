import type { getLedger } from "@/lib/db/ledgers";

type Data = NonNullable<ReturnType<typeof getLedger>>;

/**
 * "Here is what I read." Nobody is messaged until the owner has seen the names and the amounts and
 * said go. Anything wrong is fixed here, in place; a person who should not be on it is dropped.
 */
export function Review({ data, uncertainties, defaultPayout }: { data: Data; uncertainties: string[]; defaultPayout: string | null }) {
  const { ledger, people, obligations } = data;
  const by = new Map(people.map((p) => [p.id, p]));
  const total = obligations.reduce((s, o) => s + o.amountBase, 0);
  return (
    <form className="rv" action={`/api/ledgers/${ledger.id}/start`} method="post">
      <p className="rv-head">Here is what I read. Fix anything, then start.</p>
      <div className="rv-rows">
        {obligations.map((o) => {
          const p = by.get(o.personId);
          return (
            <div className="rv-row" key={o.id}>
              <input className="rv-name" name={`name_${o.id}`} defaultValue={p?.name ?? ""} aria-label="name" />
              <input className="rv-note" name={`note_${o.id}`} defaultValue={o.note ?? ""} placeholder="for what" aria-label="note" />
              <span className="rv-cur">{ledger.currency}</span>
              <input className="rv-amt" name={`amount_${o.id}`} defaultValue={(o.amountBase / 1_000_000).toString()} inputMode="decimal" aria-label="amount" />
              <label className="rv-drop"><input type="checkbox" name={`drop_${o.id}`} /> drop</label>
            </div>
          );
        })}
      </div>
      <p className="rv-total">{obligations.length} people · {ledger.currency} {(total / 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })} in all{ledger.currency !== "USD" ? ` · collected in USDC at 1 ${ledger.currency} = ${ledger.rateUsdcPerUnit} USDC (${ledger.rateSource})` : ""}</p>
      {uncertainties.length ? (
        <div className="rv-unc">
          <b>I was not sure about</b>
          <ul>{uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      ) : null}
      <label className="rv-payout">
        <span>Where the money goes when everyone has paid</span>
        <input name="payoutTo" defaultValue={ledger.payoutTo ?? defaultPayout ?? ""} placeholder="0x… an Arc wallet" pattern="0x[0-9a-fA-F]{40}" title="An Arc address" spellCheck={false} />
        <em>{defaultPayout ? "Your Owed wallet, from signing in. Change it if you like." : "Optional now. Sign in and the wallet that comes with it is used."}</em>
      </label>
      <button className="rv-go" type="submit">Start collecting →</button>
      <p className="rv-fine">The agent writes to each person now; you send each note with one tap. Nobody is contacted before you press this.</p>
    </form>
  );
}
