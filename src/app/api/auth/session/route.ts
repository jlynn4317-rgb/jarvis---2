import { NextRequest, NextResponse } from "next/server";
import { upsertProfile } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({
    ok: true,
    session: {
      user: {
        id: "demo-user",
        email: "operator@jarvis.local",
        full_name: "Operator",
        role: "operator",
      },
      mode: "demo",
      message: "Demo session active. Connect Supabase to persist identity.",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim();
    const fullName = String(body?.fullName || "").trim();
    const role = String(body?.role || "operator").trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }

    const result = await upsertProfile({ email, fullName: fullName || undefined, role });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        session: {
          user: result.profile,
          mode: result.mode,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      session: {
        user: {
          id: "demo-user",
          email,
          full_name: fullName || null,
          role,
        },
        mode: "demo",
        message: result.message,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
