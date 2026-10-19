import Link from "next/link";
import { getPackData } from "@/lib/supabase";
import PackCard from "./pack-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "This week's pack" };

export default async function PackPage() {
  const pack = await getPackData(5);

  return (
    <main className="board-shell">
      <p className="board-back"><Link href="/board">&larr; Link board</Link></p>
      <h1>This week&apos;s pack</h1>
      <p className="board-sub">
        The next products to post, with the words ready for each platform. Copy, post, then click where you posted it. The next products rotate in automatically.
      </p>

      {pack === null ? (
        <p className="board-empty">Couldn&apos;t load the pack just now. Try refreshing in a moment.</p>
      ) : pack.length === 0 ? (
        <p className="board-empty">Nothing to post yet. Add products first from the Link board.</p>
      ) : (
        <div className="pack-list">
          {pack.map((item) => (
            <PackCard key={item.campaignId} item={item} />
          ))}
        </div>
      )}

      <p className="board-empty">Every post here includes the disclosure. Never add prices, ratings or &quot;limited stock&quot; claims when you edit.</p>
    </main>
  );
}
