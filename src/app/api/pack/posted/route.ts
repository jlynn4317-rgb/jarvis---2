import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHANNELS = ["pinterest", "facebook", "instagram", "tiktok", "youtube"];

// Records that you posted a product on a channel by hand, so the board's "last posted" moves
// and the next products come up in the pack. Owner login only, enforced by the proxy.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const campaignId = String(body?.campaignId || "");
  const variantId = body?.variantId ? String(body.variantId) : null;
  const channel = String(body?.channel || "");

  if (!UUID.test(campaignId) || (variantId && !UUID.test(variantId)) || !CHANNELS.includes(channel)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 503 });

  const { error } = await client.from("social_posts").insert({
    campaign_id: campaignId,
    copy_variant_id: variantId,
    channel,
    content: { source: "weekly_pack" },
    status: "posted",
    posted_at: new Date().toISOString(),
  });

  if (error) {
    const needsUpdate = /social_posts_channel_check|violates check constraint/i.test(error.message);
    return NextResponse.json({ ok: false, error: needsUpdate ? "Run the database update for more channels first." : "Couldn't record that." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
