export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>Owed</p>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "8px 0 16px" }}>The agent that gets you paid.</h1>
      <p style={{ fontSize: 18, color: "var(--ink-muted)", maxWidth: 560 }}>
        Drop a bill split, an invoice or a group chat on it. Owed works out who owes what, asks them, watches the money arrive, and only interrupts you for a real decision.
      </p>
    </main>
  );
}
