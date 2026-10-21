import { NextRequest, NextResponse } from "next/server";
import { recordPostedChannel } from "@/lib/supabase";

// Records that you posted a product on a channel by hand from the pack. Owner login only,
// enforced by the proxy.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await recordPostedChannel({
    campaignId: String(body?.campaignId || ""),
    variantId: body?.variantId ? String(body.variantId) : null,
    channel: String(body?.channel || ""),
    source: "weekly_pack",
  });

  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.error }, { status: result.status });
}
