import { NextRequest, NextResponse } from "next/server";
import { generateCampaignCopy } from "@/lib/copy-providers";
import { buildAffiliateUrl } from "@/lib/networks";

const getCleanAsin = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  const match = value.match(/(?:\/dp\/)?([A-Z0-9]{10})/i) ?? value.match(/([A-Z0-9]{10})/i);
  return match?.[1] ?? value.replace(/[^A-Z0-9]/gi, "").slice(0, 10);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asin, title, affiliateTag = "gblabs20-20", editorExclusions = [], niche = "general", network = "amazon", destination } = body ?? {};
    const cleanAsin = getCleanAsin(String(asin || ""));

    if (!cleanAsin && network === "amazon") {
      return NextResponse.json({ error: "Missing valid Amazon ASIN." }, { status: 400 });
    }

    const normalizedEditorExclusions = Array.isArray(editorExclusions)
      ? editorExclusions.filter((item: unknown) => typeof item === "string" && item.trim()).map((item: string) => item.trim())
      : [];

    const affiliateUrl = buildAffiliateUrl({ network, asin: cleanAsin, destination, affiliateTag });
    const productTitle = String(title || "Product");

    if (!affiliateUrl) {
      return NextResponse.json({ error: "Could not build an affiliate URL for the given network/destination." }, { status: 400 });
    }

    const { campaign, generatedBy, message } = await generateCampaignCopy(productTitle, cleanAsin, {
      editorExclusions: normalizedEditorExclusions,
      niche: String(niche || "general"),
    });

    return NextResponse.json({ affiliateUrl, title: productTitle, generatedBy, message, campaign, niche, network });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
