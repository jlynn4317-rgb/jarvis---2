import { verifyEmailToken } from "@/lib/unsubscribe";
import UnsubscribeButton from "./unsubscribe-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e = "", t = "" } = await searchParams;
  const valid = verifyEmailToken(e, t);

  return (
    <main className="go-shell">
      <section className="go-card">
        <h1>Unsubscribe</h1>
        {valid ? (
          <>
            <p className="go-hook">Stop emails to {e}?</p>
            <UnsubscribeButton email={e} token={t} />
          </>
        ) : (
          <p className="go-hook">This unsubscribe link isn&apos;t valid. Reply to any email from us and we&apos;ll remove you by hand.</p>
        )}
      </section>
    </main>
  );
}
