import { NextRequest, NextResponse } from "next/server";
import { storeCampaign } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await storeCampaign({
      userId: body?.userId ? String(body.userId) : undefined,
      title: String(body?.title || "Untitled campaign"),
      asin: body?.asin ? String(body.asin) : undefined,
      affiliateTag: body?.affiliateTag ? String(body.affiliateTag) : undefined,
      status: body?.status ? String(body.status) : "draft",
      brief: body?.brief && typeof body.brief === "object" ? body.brief : {},
    });

    return NextResponse.json({
      ok: result.ok,
      mode: result.mode,
      message: result.ok ? "Campaign persisted." : result.message,
      campaign: result.campaign ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
