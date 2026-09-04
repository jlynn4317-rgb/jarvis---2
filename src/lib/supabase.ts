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
