import { NextRequest, NextResponse } from "next/server";
import { generateCampaignCopy } from "@/lib/copy-providers";
import { buildAffiliateUrl } from "@/lib/networks";
import { getSupabaseServiceClient, storeCampaign } from "@/lib/supabase";
import { createVariants } from "@/lib/variants";

export const maxDuration = 60;

const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*-\d{2}$/i;
const affiliateTag = () => {
  const configured = (process.env.AMAZON_ASSOCIATE_TAG || "").trim();
  return TAG_PATTERN.test(configured) ? configured : "gblabs20-20";
};

// Adds one product (a product code or search words) with its written copy, three versions
// and tracking links. The page calls this once per product so each request stays short.
export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServiceClient();
    if (!client) return NextResponse.json({ ok: false, error: "Temporarily unavailable." }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim().slice(0, 120);
    const asin = String(body?.asin || "").trim().toUpperCase();
    const keywords = String(body?.keywords || "").trim().slice(0, 80);
    const niche = String(body?.niche || "").trim().slice(0, 60) || "general";

    if (title.length < 2 || (!/^[A-Z0-9]{10}$/.test(asin) && keywords.length < 2)) {
      return NextResponse.json({ ok: false, error: "Needs a name plus a product code or search words." }, { status: 400 });
    }

    const hasCode = /^[A-Z0-9]{10}$/.test(asin);
    const tag = affiliateTag();
    const affiliateUrl = buildAffiliateUrl({ network: hasCode ? "amazon" : "amazon_search", asin: hasCode ? asin : undefined, destination: keywords, affiliateTag: tag });
    if (!affiliateUrl) return NextResponse.json({ ok: false, error: "Couldn't build the link." }, { status: 400 });

    // Don't add the same product twice.
    const existing = hasCode
      ? await client.from("campaigns").select("id").eq("asin", asin).neq("status", "paused").limit(1)
      : await client.from("campaigns").select("id").ilike("title", title).neq("status", "paused").limit(1);
    if (existing.data && existing.data.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true, message: "Already on your board." });
    }

    const { campaign: brief } = await generateCampaignCopy(title, hasCode ? asin : "", { niche });
    const stored = await storeCampaign({ title, asin: hasCode ? asin : undefined, affiliateTag: tag, status: "generated", brief: brief as unknown as Record<string, unknown>, niche });
    if (!stored.ok || !stored.campaign) return NextResponse.json({ ok: false, error: "Couldn't save the product." }, { status: 500 });

    const variants = await createVariants(client, { campaignId: stored.campaign.id, title, asin: hasCode ? asin : "", affiliateUrl, niche });
    const made = variants.filter((variant) => variant.ok).length;

    return NextResponse.json({ ok: true, campaignId: stored.campaign.id, versions: made, firstLink: variants.find((variant) => variant.landingUrl)?.landingUrl ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
