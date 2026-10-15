import { NextRequest, NextResponse } from "next/server";
import { buildAffiliateUrl } from "@/lib/networks";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { createVariants } from "@/lib/variants";

export const maxDuration = 60;

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

    const variants = await createVariants(client, { campaignId, title, asin, affiliateUrl, niche });
    return NextResponse.json({ ok: true, campaignId, variants });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
