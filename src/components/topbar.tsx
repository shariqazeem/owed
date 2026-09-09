import Link from "next/link";
import { currentOwner } from "@/lib/auth/session";
import { OwnerMenu } from "./owner-menu";
import "./topbar.css";

/** The one bar every owner surface shares: the mark, the two places to go, and who you are. */
export async function TopBar() {
  const owner = await currentOwner();
  return (
    <header className="tb">
      <Link href="/" className="tb-mark">Owed</Link>
      <nav className="tb-nav">
        <Link href="/ledgers">My ledgers</Link>
        <Link href="/new" className="tb-new">New</Link>
        <OwnerMenu signedIn={owner?.kind === "privy"} email={owner?.email ?? null} wallet={owner?.wallet ?? null} privy={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)} />
      </nav>
    </header>
  );
}
