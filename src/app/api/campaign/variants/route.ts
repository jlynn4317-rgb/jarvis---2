import { NextRequest, NextResponse } from "next/server";
import { generateCampaignCopy } from "@/lib/copy-providers";
import { buildAffiliateUrl } from "@/lib/networks";
import { getSupabaseServiceClient, enqueueTask } from "@/lib/supabase";

const TONES = ["Urgent / scarcity-driven", "Playful / relatable", "Trustworthy / educational"];

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServiceClient();
    if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });

    const body = await req.json();
    const campaignId = String(body?.campaignId || "");
    const title = String(body?.title || "Product");
    const asin = String(body?.asin || "");
    const affiliateTag = body?.affiliateTag ? String(body.affiliateTag) : undefined;
    const network = String(body?.network || "amazon");
    const destination = body?.destination ? String(body.destination) : undefined;
    const niche = String(body?.niche || "general");

    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required." }, { status: 400 });
    }

    const affiliateUrl = buildAffiliateUrl({ network, asin, destination, affiliateTag });
    if (!affiliateUrl) {
      return NextResponse.json({ ok: false, error: "Could not build an affiliate URL." }, { status: 400 });
    }

    const variants = await Promise.all(
      TONES.map(async (tone) => {
        const { campaign, generatedBy } = await generateCampaignCopy(title, asin, { niche, tone });

        const { data: variant, error: variantError } = await client
          .from("copy_variants")
          .insert({ campaign_id: campaignId, tone, headline: campaign.pinTitle, body: campaign.pinDescription })
          .select()
          .single();

        if (variantError || !variant) return { tone, ok: false, error: variantError?.message };

        const slug = `${campaignId.slice(0, 8)}-${variant.id.slice(0, 6)}`;
        const { data: link, error: linkError } = await client
          .from("tracking_links")
          .insert({ slug, campaign_id: campaignId, destination: affiliateUrl, copy_variant_id: variant.id })
          .select()
          .single();

        return {
          tone,
          ok: !linkError,
          generatedBy,
          variant,
          trackingSlug: link?.slug,
          landingUrl: link ? `/go/${link.slug}` : null,
          error: linkError?.message,
        };
      })
    );

    await enqueueTask({
      type: "check_variant_winner",
      payload: { campaignId },
      runAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, campaignId, variants });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
