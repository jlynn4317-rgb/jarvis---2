import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { Channel } from "@/lib/channels";

const VALID_CHANNELS: Channel[] = ["pinterest", "tiktok", "x"];

export async function GET(req: NextRequest) {
  const client = getSupabaseServiceClient();
  if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  let query = client.from("social_posts").select("*").order("created_at", { ascending: false }).limit(50);
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  return NextResponse.json({ ok: !error, posts: data ?? [], error: error?.message });
}

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServiceClient();
    if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });

    const body = await req.json();
    const campaignId = String(body?.campaignId || "");
    const channels: Channel[] = Array.isArray(body?.channels) ? body.channels.filter((c: string) => VALID_CHANNELS.includes(c as Channel)) : [];
    const copyVariantId = body?.copyVariantId ? String(body.copyVariantId) : null;
    const content = body?.content && typeof body.content === "object" ? body.content : {};

    if (!campaignId || channels.length === 0) {
      return NextResponse.json({ ok: false, error: "campaignId and at least one valid channel are required." }, { status: 400 });
    }

    // Posts land as pending_approval and are NOT queued for the worker yet — publishing
    // only happens once a human hits approve via /api/social/approve. Keeps the first
    // wave of real posts on any channel from going out unattended.
    const posts = await Promise.all(
      channels.map(async (channel) => {
        const { data: post, error } = await client
          .from("social_posts")
          .insert({ campaign_id: campaignId, copy_variant_id: copyVariantId, channel, content, status: "pending_approval" })
          .select()
          .single();

        return { channel, ok: !error, post, error: error?.message };
      })
    );

    return NextResponse.json({ ok: true, posts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
