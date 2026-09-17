import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const isPlaceholder = (value?: string) => !value || value.includes("your_") || value.includes("your-project") || value.includes("example") || value === "";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceKey: supabaseServiceKey,
  ready: Boolean(supabaseUrl && supabaseAnonKey) && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey),
});

export const supabase: SupabaseClient | null =
  getSupabaseConfig().ready
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const getSupabaseClient = () => supabase;

export const getSupabaseServiceClient = () => {
  if (!getSupabaseConfig().ready || !supabaseServiceKey || isPlaceholder(supabaseServiceKey)) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const upsertProfile = async ({ email, fullName, role = "operator" }: { email: string; fullName?: string; role?: string }) => {
  const client = getSupabaseClient();
  if (!client || !email) {
    return { ok: false, mode: "demo" as const, message: "Supabase not configured." };
  }

  const { data, error } = await client.from("profiles").upsert({
    email,
    full_name: fullName ?? null,
    role,
  }, { onConflict: "email" }).select("id, email, full_name, role").single();

  if (error) {
    return { ok: false, mode: "demo" as const, message: error.message };
  }

  return { ok: true, mode: "live" as const, profile: data };
};

export const storeCampaign = async ({
  userId,
  title,
  asin,
  affiliateTag,
  status,
  brief,
}: {
  userId?: string;
  title: string;
  asin?: string;
  affiliateTag?: string;
  status?: string;
  brief?: Record<string, unknown>;
}) => {
  const client = getSupabaseServiceClient();
  if (!client || !title) {
    return { ok: false, mode: "demo" as const, message: "Supabase not configured." };
  }

  const { data, error } = await client.from("campaigns").insert({
    user_id: userId ?? null,
    title,
    asin: asin ?? null,
    affiliate_tag: affiliateTag ?? "gblabs20-20",
    status: status ?? "draft",
    brief: brief ?? {},
  }).select("id, title, status").single();

  if (error) {
    return { ok: false, mode: "demo" as const, message: error.message };
  }

  return { ok: true, mode: "live" as const, campaign: data };
};

export const logTelemetry = async ({
  userId,
  source,
  eventName,
  payload,
}: {
  userId?: string;
  source: string;
  eventName: string;
  payload?: Record<string, unknown>;
}) => {
  const client = getSupabaseServiceClient();
  if (!client || !source || !eventName) {
    return { ok: false, mode: "demo" as const, message: "Supabase not configured." };
  }

  const { data, error } = await client.from("telemetry").insert({
    user_id: userId ?? null,
    source,
    event_name: eventName,
    payload: payload ?? {},
  }).select("id, event_name").single();

  if (error) {
    return { ok: false, mode: "demo" as const, message: error.message };
  }

  return { ok: true, mode: "live" as const, record: data };
};

export const getDashboardData = async () => {
  const client = getSupabaseServiceClient();
  if (!client) return { ok: false as const, mode: "demo" as const, campaigns: [], telemetry: [], offers: [], leads: [], socialPosts: [] };

  const [campaigns, telemetry, offers, leads, socialPosts] = await Promise.all([
    client.from("campaigns").select("id, title, asin, affiliate_tag, status, niche, brief, created_at, updated_at").order("created_at", { ascending: false }).limit(50),
    client.from("telemetry").select("id, source, event_name, payload, created_at").order("created_at", { ascending: false }).limit(50),
    client.from("offers").select("id, name, advertiser, category, network, payout, status, created_at").order("created_at", { ascending: false }).limit(50),
    client.from("leads").select("id, email, campaign_id, source, created_at").order("created_at", { ascending: false }).limit(50),
    client.from("social_posts").select("id, campaign_id, channel, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const error = campaigns.error || telemetry.error || offers.error || leads.error || socialPosts.error;
  if (error) return { ok: false as const, mode: "demo" as const, message: error.message, campaigns: [], telemetry: [], offers: [], leads: [], socialPosts: [] };
  return {
    ok: true as const,
    mode: "live" as const,
    campaigns: campaigns.data ?? [],
    telemetry: telemetry.data ?? [],
    offers: offers.data ?? [],
    leads: leads.data ?? [],
    socialPosts: socialPosts.data ?? [],
  };
};

export const captureLead = async ({
  email,
  campaignId,
  trackingLinkId,
  source,
}: {
  email: string;
  campaignId?: string;
  trackingLinkId?: string;
  source?: string;
}) => {
  const client = getSupabaseServiceClient();
  if (!client || !email) return { ok: false, mode: "demo" as const, message: "Supabase not configured." };

  const { data, error } = await client
    .from("leads")
    .upsert(
      { email, campaign_id: campaignId ?? null, tracking_link_id: trackingLinkId ?? null, source: source ?? "landing_page" },
      { onConflict: "email,campaign_id" }
    )
    .select("id, email")
    .single();

  if (error) return { ok: false, mode: "demo" as const, message: error.message };
  return { ok: true, mode: "live" as const, lead: data };
};

export const enqueueTask = async ({ type, payload, runAt }: { type: string; payload?: Record<string, unknown>; runAt?: string }) => {
  const client = getSupabaseServiceClient();
  if (!client) return { ok: false, mode: "demo" as const, message: "Supabase not configured." };

  const { data, error } = await client
    .from("tasks")
    .insert({ type, payload: payload ?? {}, run_at: runAt ?? new Date().toISOString() })
    .select("id, type, status")
    .single();

  if (error) return { ok: false, mode: "demo" as const, message: error.message };
  return { ok: true, mode: "live" as const, task: data };
};

export const claimQueuedTasks = async (limit = 10) => {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const { data } = await client
    .from("tasks")
    .select("*")
    .eq("status", "queued")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(limit);

  return data ?? [];
};

export const finishTask = async (id: string, status: "done" | "failed", attempts: number) => {
  const client = getSupabaseServiceClient();
  if (!client) return;
  await client.from("tasks").update({ status, attempts }).eq("id", id);
};

export const getTrackingLinkBySlug = async (slug: string) => {
  const client = getSupabaseServiceClient();
  if (!client) return null;

  const { data: link } = await client.from("tracking_links").select("*").eq("slug", slug).maybeSingle();
  if (!link) return null;

  const [{ data: campaign }, { data: variant }] = await Promise.all([
    link.campaign_id ? client.from("campaigns").select("*").eq("id", link.campaign_id).maybeSingle() : Promise.resolve({ data: null }),
    link.copy_variant_id ? client.from("copy_variants").select("*").eq("id", link.copy_variant_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return { link, campaign, variant };
};

export const incrementTrackingLinkClicks = async (id: string) => {
  const client = getSupabaseServiceClient();
  if (!client) return;
  const { data } = await client.from("tracking_links").select("clicks").eq("id", id).maybeSingle();
  await client.from("tracking_links").update({ clicks: (data?.clicks ?? 0) + 1 }).eq("id", id);
};
