import { getGuideData } from "@/lib/supabase";
import GuideSignup from "./guide-signup";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coffee & Tea Gift Guide",
  description: "A short, honest list of gift ideas for people who love coffee and tea.",
};

export default async function GiftsPage() {
  const items = (await getGuideData()) ?? [];

  return (
    <main className="guide-shell">
      <header className="guide-head">
        <p className="go-eyebrow">GB Labs</p>
        <h1>Coffee &amp; Tea Gift Guide</h1>
        <p className="guide-intro">A short list of gift ideas for people who love a good cup. I don&apos;t make or sell any of these. Each one links to Amazon.</p>
        <p className="guide-disclosure">As an Amazon Associate I earn from qualifying purchases, at no extra cost to you.</p>
      </header>

      {items.length === 0 ? (
        <p className="board-empty">New ideas are on the way. Check back soon.</p>
      ) : (
        <ul className="guide-grid">
          {items.map((item) => (
            <li key={item.id} className="guide-card">
              <h2>{item.title}</h2>
              <p>{item.blurb}</p>
              <a className="guide-button" href={`/out/${item.slug}`} target="_blank" rel="sponsored nofollow noopener">
                See it on Amazon
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="guide-signup">
        <h2>Get new gift ideas</h2>
        <p>An occasional email with one good idea. Unsubscribe any time.</p>
        <GuideSignup />
      </section>

      <footer className="guide-footer">
        <p>Prices and availability change, so check Amazon for the latest details.</p>
      </footer>
    </main>
  );
}
