import { NextRequest, NextResponse } from "next/server";
import { buildImageUrl, isAutomationAuthorized } from "@/lib/automation";
import { getPackData } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// The feed n8n reads: the next products to post, with ready text for every platform and signed
// picture links. Protected by AUTOMATION_SECRET (Authorization: Bearer ...), not the owner login.
export async function GET(req: NextRequest) {
  if (!isAutomationAuthorized(req.headers)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const requested = Number.parseInt(req.nextUrl.searchParams.get("count") || "1", 10);
  const count = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 5) : 1;

  const pack = await getPackData(count);
  if (!pack) return NextResponse.json({ ok: false, error: "Couldn't load the pack." }, { status: 503 });

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const items = pack.map((item) => ({
    ...item,
    images: {
      pin: buildImageUrl(origin, item.title, item.tiktok.hook, "pin"),
      feed: buildImageUrl(origin, item.title, item.tiktok.hook, "feed"),
    },
  }));

  return NextResponse.json({ ok: true, count: items.length, items });
}
