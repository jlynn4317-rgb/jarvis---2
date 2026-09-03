import { NextRequest, NextResponse } from "next/server";
import { createCampaignBrief } from "@/lib/jarvis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief = createCampaignBrief({
      title: body?.title,
      asin: body?.asin,
      affiliateTag: body?.affiliateTag,
    });

    return NextResponse.json({ ok: true, brief });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
