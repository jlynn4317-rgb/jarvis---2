import { NextRequest, NextResponse } from "next/server";
import { generateCampaignCopy } from "@/lib/copy-providers";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { TONES } from "@/lib/variants";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rewrites the words for an existing product (its versions and its brief) with the current
// honesty rules. Tracking links, clicks and signups are untouched. Owner login only.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

    const client = getSupabaseServiceClient();
    if (!client) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 503 });

    const { data: campaign } = await client.from("campaigns").select("id, title, asin, niche").eq("id", id).maybeSingle();
    if (!campaign) return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });

    const { data: variants } = await client.from("copy_variants").select("id").eq("campaign_id", id).order("created_at", { ascending: true });
    const title = campaign.title || "this product";
    const niche = campaign.niche || "general";
    const asin = campaign.asin || "";

    await Promise.all(
      (variants ?? []).slice(0, TONES.length).map(async (variant, index) => {
        const { campaign: copy } = await generateCampaignCopy(title, asin, { niche, tone: TONES[index] });
        await client.from("copy_variants").update({ tone: TONES[index], headline: copy.pinTitle, body: copy.pinDescription }).eq("id", variant.id);
      })
    );

    const { campaign: brief } = await generateCampaignCopy(title, asin, { niche });
    await client.from("campaigns").update({ brief, updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ ok: true, versions: Math.min(variants?.length ?? 0, TONES.length) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
