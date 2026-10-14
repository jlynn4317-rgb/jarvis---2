import Link from "next/link";
import { getBoardData } from "@/lib/supabase";
import CopyButton from "./copy-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Link board" };

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "Never");

export default async function BoardPage() {
  const board = await getBoardData();
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  if (!board) {
    return (
      <main className="board-shell">
        <p className="board-back"><Link href="/">&larr; Dashboard</Link></p>
        <h1>Link board</h1>
        <p className="board-empty">Couldn&apos;t load your products just now. Try refreshing in a moment.</p>
      </main>
    );
  }

  const { rows, nextId } = board;
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);
  const next = rows.find((row) => row.id === nextId);

  return (
    <main className="board-shell">
      <p className="board-back"><Link href="/">&larr; Dashboard</Link></p>
      <h1>Link board</h1>
      <p className="board-sub">Every product you&apos;re promoting, and how each one is doing.</p>

      <section className="board-stats" aria-label="Totals">
        <div><span>Products</span><strong>{rows.length}</strong></div>
        <div><span>Clicks</span><strong>{totalClicks}</strong></div>
        <div><span>Signups</span><strong>{totalLeads}</strong></div>
      </section>

      {next && (
        <p className="board-next">
          <b>Post this next:</b> {next.title} <span>({next.lastPostedAt ? `last posted ${formatDate(next.lastPostedAt)}` : "never posted yet"})</span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="board-empty">No products yet. Run a campaign from the dashboard and it will show up here.</p>
      ) : (
        <div className="board-table-wrap">
          <table className="board-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Code</th>
                <th>Clicks</th>
                <th>Signups</th>
                <th>Versions</th>
                <th>Last posted</th>
                <th>Needs approval</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.id === nextId ? "board-row-next" : undefined}>
                  <td className="board-title">{row.title}{row.id === nextId && <em>next</em>}</td>
                  <td>{row.asin ?? "—"}</td>
                  <td>{row.clicks}</td>
                  <td>{row.leads}</td>
                  <td>{row.versions}</td>
                  <td>{formatDate(row.lastPostedAt)}</td>
                  <td>{row.waitingApproval > 0 ? row.waitingApproval : "—"}</td>
                  <td>
                    {row.bestSlug ? (
                      <span className="board-link-cell">
                        <a href={`/go/${row.bestSlug}`} target="_blank" rel="noreferrer">Open</a>
                        <CopyButton text={`${origin}/go/${row.bestSlug}`} />
                      </span>
                    ) : (
                      "No link yet"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
