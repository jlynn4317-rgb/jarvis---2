import { after, NextRequest, NextResponse } from "next/server";
import { captureLead, enqueueTask, getLeadSignals, logTelemetry } from "@/lib/supabase";
import { checkSignupLimits, getClientIp, hashIp, isValidEmail, signupLimits } from "@/lib/abuse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Hidden trap field (hp): real visitors never see or fill it, bots usually do.
    // Answer as if it worked so the bot learns nothing, and store nothing.
    if (body?.hp) return NextResponse.json({ ok: true, mode: "live", message: "Lead captured." });

    const email = String(body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
    }

    const campaignId = body?.campaignId ? String(body.campaignId) : undefined;
    const trackingLinkId = body?.trackingLinkId ? String(body.trackingLinkId) : undefined;
    const source = body?.source ? String(body.source) : "landing_page";

    const ipHash = hashIp(getClientIp(req.headers));
    const signals = await getLeadSignals(email, ipHash);
    if (!signals) {
      return NextResponse.json({ ok: false, error: "Signups are temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    if (checkSignupLimits(signals, signupLimits()) === "limited") {
      return NextResponse.json({ ok: false, error: "Too many signups right now. Please try again later." }, { status: 429 });
    }

    const result = await captureLead({ email, campaignId, trackingLinkId, source, ipHash });

    if (result.ok) {
      await logTelemetry({ source: "leads", eventName: "lead_captured", payload: { campaignId, source } });

      // One welcome email per address, ever. A repeat signup still records the lead.
      if (!signals.alreadyKnown) {
        await enqueueTask({ type: "send_welcome_email", payload: { email, campaignId, trackingLinkId } });

        // Send it now instead of waiting for the next timer tick; the timer stays as a safety net.
        after(async () => {
          const secret = process.env.CRON_SECRET;
          const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
          if (!secret || !base) return;
          await fetch(`${base}/api/worker/run`, { headers: { Authorization: `Bearer ${secret}` } }).catch(() => {});
        });
      }
    }

    return NextResponse.json({ ok: result.ok, mode: result.mode, message: result.ok ? "Lead captured." : result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
