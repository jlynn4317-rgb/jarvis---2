import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes("your_") || apiKey.includes("example") || apiKey === "") {
    return null;
  }

  return new Resend(apiKey);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const channel = String(body?.channel || "welcome");
    const audience = Number(body?.audience ?? 0);
    const to = String(body?.to || "operator@jarvis.local");
    const subject = String(body?.subject || "Welcome to JARVIS");
    const html = String(body?.html || "<p>Welcome to JARVIS.</p>");

    const resend = getResendClient();

    if (!resend) {
      return NextResponse.json({
        ok: true,
        sequence: {
          channel,
          audience,
          status: "queued",
          delivery: "demo",
          message: "Resend key not configured. Demo queue accepted.",
        },
      });
    }

    const result = await resend.emails.send({
      from: "JARVIS <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    return NextResponse.json({
      ok: true,
      sequence: {
        channel,
        audience,
        status: "queued",
        delivery: "resend-live",
        message: "Email automation sequence queued with Resend.",
        id: result.data?.id ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
