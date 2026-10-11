import { after, NextRequest, NextResponse } from "next/server";
import { captureLead, enqueueTask, logTelemetry } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
    }

    const campaignId = body?.campaignId ? String(body.campaignId) : undefined;
    const trackingLinkId = body?.trackingLinkId ? String(body.trackingLinkId) : undefined;
    const source = body?.source ? String(body.source) : "landing_page";

    const result = await captureLead({ email, campaignId, trackingLinkId, source });

    if (result.ok) {
      await Promise.all([
        enqueueTask({ type: "send_welcome_email", payload: { email, campaignId, trackingLinkId } }),
        logTelemetry({ source: "leads", eventName: "lead_captured", payload: { campaignId, source } }),
      ]);

      // Send the welcome email now instead of waiting for the next timer tick. The timer
      // stays as a safety net for anything this call misses.
      after(async () => {
        const secret = process.env.CRON_SECRET;
        const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
        if (!secret || !base) return;
        await fetch(`${base}/api/worker/run`, { headers: { Authorization: `Bearer ${secret}` } }).catch(() => {});
      });
    }

    return NextResponse.json({ ok: result.ok, mode: result.mode, message: result.ok ? "Lead captured." : result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
