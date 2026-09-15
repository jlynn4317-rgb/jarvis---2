import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient, enqueueTask } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServiceClient();
    if (!client) return NextResponse.json({ ok: false, message: "Supabase not configured." }, { status: 503 });

    const body = await req.json();
    const postId = String(body?.postId || "");
    if (!postId) return NextResponse.json({ ok: false, error: "postId is required." }, { status: 400 });

    const { data: post } = await client.from("social_posts").select("id, status").eq("id", postId).maybeSingle();
    if (!post) return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    if (post.status !== "pending_approval") {
      return NextResponse.json({ ok: false, error: `Post is "${post.status}", not pending approval.` }, { status: 409 });
    }

    const { error } = await client.from("social_posts").update({ status: "queued" }).eq("id", postId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await enqueueTask({ type: "publish_social_post", payload: { socialPostId: postId } });

    return NextResponse.json({ ok: true, message: "Approved and queued for publishing." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
