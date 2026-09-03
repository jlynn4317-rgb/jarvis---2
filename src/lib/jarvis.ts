export type EngineState = "LIVE" | "READY" | "PENDING";

export type JarvisEngine = {
  name: string;
  detail: string;
  status: EngineState;
  latency: string;
};

export type JarvisRuntimeState = {
  gemini: boolean;
  supabase: boolean;
  openai: boolean;
  resend: boolean;
  tiktok: boolean;
};

export const engineCatalog: JarvisEngine[] = [
  { name: "Attraction Engine", detail: "Hooks, pins, reels, market framing", status: "LIVE", latency: "89ms" },
  { name: "Affiliate Engine", detail: "ASIN normalization, tracking links, offer tagging", status: "LIVE", latency: "63ms" },
  { name: "Email Engine", detail: "Welcome flows, conversion sequences", status: "READY", latency: "142ms" },
  { name: "Research Engine", detail: "Product validation and offer checks", status: "READY", latency: "191ms" },
  { name: "Telemetry Core", detail: "Metrics, logs, orchestration state", status: "LIVE", latency: "41ms" },
];

const placeholderValue = (value?: string) => !value || value.includes("your_") || value.includes("your-project") || value === "";

export const getRuntimeStatus = (): JarvisRuntimeState => ({
  gemini: Boolean(process.env.GEMINI_API_KEY) && !placeholderValue(process.env.GEMINI_API_KEY),
  supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY) && !placeholderValue(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
  openai: Boolean(process.env.OPENAI_API_KEY) && !placeholderValue(process.env.OPENAI_API_KEY),
  resend: Boolean(process.env.RESEND_API_KEY) && !placeholderValue(process.env.RESEND_API_KEY),
  tiktok: Boolean(process.env.TIKTOK_ADS_LINK) && !placeholderValue(process.env.TIKTOK_ADS_LINK),
});

export const buildJarvisStatus = () => {
  const runtime = getRuntimeStatus();
  const readyCount = Object.values(runtime).filter(Boolean).length;
  const totalCount = Object.keys(runtime).length;

  return {
    mode: "autonomous",
    status: readyCount >= 2 ? "SYSTEMS NOMINAL" : "CONFIGURATION REQUIRED",
    readiness: `${readyCount}/${totalCount}`,
    runtime,
    engines: engineCatalog,
    lastSync: new Date().toISOString(),
  };
};

export const createCampaignBrief = ({ title, asin, affiliateTag }: { title?: string; asin?: string; affiliateTag?: string }) => {
  const cleanAsin = (asin || "").trim();
  const tag = affiliateTag || "gblabs20-20";

  return {
    briefId: `jarvis-${Date.now()}`,
    title: title || "Untitled campaign",
    asin: cleanAsin,
    affiliateTag: tag,
    objective: "Launch a conversion-focused affiliate campaign",
    strategy: [
      "Validate offer strength and intent fit",
      "Generate hooks for reels, pins, and email",
      "Tag affiliate links for clean attribution",
      "Queue outbound funnel and reporting",
    ],
    generatedAt: new Date().toISOString(),
  };
};
