import { NextRequest, NextResponse } from "next/server";
import { isAutomationAuthorized } from "@/lib/automation";
import { recordPostedChannel } from "@/lib/supabase";

// n8n calls this after it publishes, so the board and rotation stay in sync.
export async function POST(req: NextRequest) {
  if (!isAutomationAuthorized(req.headers)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = await recordPostedChannel({
    campaignId: String(body?.campaignId || ""),
    variantId: body?.variantId ? String(body.variantId) : null,
    channel: String(body?.channel || ""),
    source: "n8n",
  });

  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.error }, { status: result.status });
}
