import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServiceClient, claimQueuedTasks, finishTask, enqueueTask } from "@/lib/supabase";
import { publishToChannel, type Channel } from "@/lib/channels";

const isConfigured = (value: string | undefined) => Boolean(value && !value.includes("your_") && value.trim());

// Amazon's Associates Operating Agreement prohibits Special Links (tagged affiliate
// URLs) inside commercial email. This builds the email around a link to our own
// /go/... landing page instead — never a raw affiliate/merchant URL — so the click
// originates from a page we own, which also lets us keep capturing/attributing it.
const sendWelcomeEmail = async (payload: { email?: string; campaignId?: string; trackingLinkId?: string }) => {
  const client = getSupabaseServiceClient();
  if (!payload.email) return { ok: false, error: "Missing email in task payload." };

  let hook = "Thanks for joining — here's what's coming your way.";
  let ctaUrl: string | null = null;

  if (client && payload.campaignId) {
    const [{ data: campaign }, { data: link }] = await Promise.all([
      client.from("campaigns").select("title, brief").eq("id", payload.campaignId).maybeSingle(),
      payload.trackingLinkId
        ? client.from("tracking_links").select("slug").eq("id", payload.trackingLinkId).maybeSingle()
        : client.from("tracking_links").select("slug").eq("campaign_id", payload.campaignId).limit(1).maybeSingle(),
    ]);

    const brief = (campaign?.brief ?? {}) as Record<string, unknown>;
    hook = (brief.pinDescription as string) || (brief.shortVideoHook as string) || hook;
    if (link?.slug) ctaUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/go/${link.slug}`;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!isConfigured(apiKey)) {
    return { ok: true, status: "manual_pending", message: "Resend not configured; welcome email skipped in demo mode." };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: "JARVIS <onboarding@resend.dev>",
    to: [payload.email],
    subject: "You're on the list",
    html: `<p>${hook}</p>${ctaUrl ? `<p><a href="${ctaUrl}">Check it out</a></p>` : ""}`,
  });

  return { ok: true, id: result.data?.id ?? null };
};

const runPublishSocialPost = async (payload: { socialPostId?: string }) => {
  const client = getSupabaseServiceClient();
  if (!client || !payload.socialPostId) return { ok: false, error: "Missing socialPostId." };

  const { data: post } = await client.from("social_posts").select("*").eq("id", payload.socialPostId).maybeSingle();
  if (!post) return { ok: false, error: "social_posts row not found." };

  // Publishing only ever happens after a human approves via /api/social/approve,
  // which is what flips status to "queued" and enqueues this task. Anything else
  // reaching here (a stale task, a double-enqueue) is refused rather than posted.
  if (post.status !== "queued") {
    return { ok: false, error: `Refusing to publish: post status is "${post.status}", not "queued".` };
  }

  const [{ data: campaign }, { data: link }] = await Promise.all([
    client.from("campaigns").select("*").eq("id", post.campaign_id).maybeSingle(),
    post.copy_variant_id
      ? client.from("tracking_links").select("*").eq("copy_variant_id", post.copy_variant_id).maybeSingle()
      : client.from("tracking_links").select("*").eq("campaign_id", post.campaign_id).limit(1).maybeSingle(),
  ]);

  const brief = (campaign?.brief ?? {}) as Record<string, unknown>;
  const linkUrl = link ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/go/${link.slug}` : link?.destination;

  if (!linkUrl) {
    await client.from("social_posts").update({ status: "failed", error: "No tracking link available for this campaign/variant." }).eq("id", post.id);
    return { ok: false, error: "No tracking link available." };
  }

  const result = await publishToChannel(post.channel as Channel, {
    headline: (brief.pinTitle as string) || campaign?.title || "Check this out",
    body: (brief.pinDescription as string) || "",
    hook: brief.shortVideoHook as string,
    hashtags: brief.hashtags as string[],
    linkUrl,
  });

  await client
    .from("social_posts")
    .update({ status: result.status, external_id: result.externalId ?? null, error: result.error ?? null, posted_at: result.status === "posted" ? new Date().toISOString() : null })
    .eq("id", post.id);

  return result;
};

const runCheckVariantWinner = async (payload: { campaignId?: string }) => {
  const client = getSupabaseServiceClient();
  if (!client || !payload.campaignId) return { ok: false, error: "Missing campaignId." };

  const { data: links } = await client.from("tracking_links").select("id, copy_variant_id").eq("campaign_id", payload.campaignId);
  const variantLinks = (links ?? []).filter((l) => l.copy_variant_id);
  if (variantLinks.length === 0) return { ok: true, message: "No variant tracking links yet." };

  const linkIds = variantLinks.map((l) => l.id);
  const { data: conversions } = await client.from("conversions").select("tracking_link_id").in("tracking_link_id", linkIds);

  const countsByVariant = new Map<string, number>();
  for (const link of variantLinks) {
    const count = (conversions ?? []).filter((c) => c.tracking_link_id === link.id).length;
    countsByVariant.set(link.copy_variant_id, (countsByVariant.get(link.copy_variant_id) ?? 0) + count);
  }

  const totalConversions = [...countsByVariant.values()].reduce((sum, n) => sum + n, 0);
  if (totalConversions === 0) return { ok: true, message: "No conversions yet; leaving all variants active." };

  const winnerId = [...countsByVariant.entries()].sort((a, b) => b[1] - a[1])[0][0];

  await Promise.all(
    [...countsByVariant.keys()].map((variantId) =>
      client.from("copy_variants").update({ winner: variantId === winnerId, status: variantId === winnerId ? "active" : "paused" }).eq("id", variantId)
    )
  );

  return { ok: true, winnerId, countsByVariant: Object.fromEntries(countsByVariant) };
};

const refreshAnalyticsSnapshot = async () => {
  const client = getSupabaseServiceClient();
  if (!client) return;

  const periodStart = new Date(Date.now() - 86400000).toISOString();
  const periodEnd = new Date().toISOString();

  const [{ data: links }, { data: conversions }] = await Promise.all([
    client.from("tracking_links").select("clicks").gte("created_at", periodStart),
    client.from("conversions").select("value").gte("created_at", periodStart),
  ]);

  const clicks = (links ?? []).reduce((sum, l) => sum + (l.clicks ?? 0), 0);
  const conversionCount = (conversions ?? []).length;
  const revenue = (conversions ?? []).reduce((sum, c) => sum + Number(c.value ?? 0), 0);
  const cvr = clicks > 0 ? conversionCount / clicks : 0;
  const epc = clicks > 0 ? revenue / clicks : 0;

  await client.from("analytics_snapshots").insert({ period_start: periodStart, period_end: periodEnd, spend: 0, revenue, roi: revenue, epc, cvr, clicks, conversions: conversionCount });
};

const processTasks = async () => {
  const tasks = await claimQueuedTasks(10);
  const results = [];

  for (const task of tasks) {
    let outcome: { ok: boolean; error?: string; [key: string]: unknown };
    try {
      if (task.type === "send_welcome_email") outcome = await sendWelcomeEmail(task.payload ?? {});
      else if (task.type === "publish_social_post") outcome = await runPublishSocialPost(task.payload ?? {});
      else if (task.type === "check_variant_winner") outcome = await runCheckVariantWinner(task.payload ?? {});
      else outcome = { ok: false, error: `Unknown task type: ${task.type}` };
    } catch (error) {
      outcome = { ok: false, error: error instanceof Error ? error.message : "Task failed" };
    }

    await finishTask(task.id, outcome.ok ? "done" : "failed", (task.attempts ?? 0) + 1);
    results.push({ id: task.id, type: task.type, ...outcome });
  }

  await refreshAnalyticsSnapshot().catch(() => {});
  return results;
};

const isAuthorizedCron = (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
};

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const results = await processTasks();
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body?.enqueueCheckWinner && body?.campaignId) {
    await enqueueTask({ type: "check_variant_winner", payload: { campaignId: body.campaignId }, runAt: body.runAt });
    return NextResponse.json({ ok: true, message: "Winner check scheduled." });
  }

  const results = await processTasks();
  return NextResponse.json({ ok: true, processed: results.length, results });
}
