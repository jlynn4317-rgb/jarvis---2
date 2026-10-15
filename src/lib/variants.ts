import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCampaignCopy } from "@/lib/copy-providers";
import { enqueueTask } from "@/lib/supabase";

export const TONES = ["Urgent / scarcity-driven", "Playful / relatable", "Trustworthy / educational"];

// Writes the three tone variants for a campaign, gives each its own tracking link to
// the same affiliate destination, and schedules the 24h winner check.
export const createVariants = async (
  client: SupabaseClient,
  { campaignId, title, asin, affiliateUrl, niche }: { campaignId: string; title: string; asin: string; affiliateUrl: string; niche: string }
) => {
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

  return variants;
};
