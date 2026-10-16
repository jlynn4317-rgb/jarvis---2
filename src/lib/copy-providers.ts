import { GoogleGenAI } from "@google/genai";
import { sanitizeCampaign } from "@/lib/copy-safety";

export type GeneratedCampaign = {
  pinTitle: string;
  pinDescription: string;
  shortVideoHook: string;
  hashtags: string[];
  asin?: string;
};

const isConfiguredEnvValue = (value: string | undefined) => Boolean(value && !value.includes("your_") && !value.includes("example") && value.trim());

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (isConfiguredEnvValue(apiKey)) {
    return new GoogleGenAI({ apiKey });
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT || "empior";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  if (!project || !location) return null;

  return new GoogleGenAI({ vertexai: true, project, location });
};

export const getDemoCampaign = (title: string): GeneratedCampaign => ({
  pinTitle: `${title || "Product"} That Converts Without The Guesswork`,
  pinDescription: `This high-intent product solves a clear problem and is ready for a direct-response funnel. Affiliate link below may earn us a commission at no extra cost to you.`,
  shortVideoHook: `POV: You found the product that actually earns while you sleep`,
  hashtags: ["#affiliateMarketing", "#productHunt", "#viralMarketing"],
});

// Never hand the model the raw affiliate URL and never let it write a link into the
// copy. Amazon's Associates agreement bans Special Links in commercial email, and even
// outside email, baking a raw affiliate URL into generated text makes it impossible to
// swap tracking links per channel/variant later. The app attaches the correct /go/...
// link separately at send/publish time.
export const buildPrompt = (
  title: string,
  cleanAsin: string,
  { editorExclusions = [], niche = "general", tone }: { editorExclusions?: string[]; niche?: string; tone?: string } = {}
) => `
  You are a direct-response affiliate marketing strategist.
  Create conversion-focused social and email content for this product.

  Product: ${title || "Unknown Product"}
  ASIN: ${cleanAsin}
  Niche / audience focus: ${niche || "general"}
  Excluded editors or tools: ${editorExclusions.length > 0 ? editorExclusions.join(", ") : "None"}
  ${tone ? `Required tone for this variant: ${tone}.` : ""}

  Do not suggest workflows, templates, or copy that depend on excluded editors or tools. Keep the strategy platform-neutral and focused on conversion. Do NOT write out any URL, link, or placeholder link anywhere in the output — the application inserts the correct tracking link separately.

  Honesty rules (strict):
  - You are recommending a kind of product as an independent reviewer. You do NOT make or sell it, so never say "our", "we" or "us" about the product.
  - Never claim or imply limited stock, limited time, a sale, a discount, free shipping, a price, a rating, a ranking, an award, a guarantee, or that anything is "top-rated", "best-selling" or "#1". Do not create urgency such as "act fast" or "hurry".
  - Do not invent specific features, measurements or performance numbers. Describe only what is generally true of this kind of product and why a person might want one.
  - No health or medical claims.
  - Plain text only: no asterisks, markdown, emoji walls or ALL CAPS shouting.
  - Do not write an affiliate disclosure; the application adds it.

  Return valid JSON only:
  {
    "pinTitle": "short SEO title",
    "pinDescription": "two or three honest sentences, no links, no disclosure",
    "shortVideoHook": "viral 3 second hook",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }
`;

export const generateWithOpenAI = async (
  title: string,
  cleanAsin: string,
  options?: { editorExclusions?: string[]; niche?: string; tone?: string }
): Promise<GeneratedCampaign | null> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!isConfiguredEnvValue(apiKey)) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a direct-response affiliate marketing strategist who returns strict JSON with pinTitle, pinDescription, shortVideoHook, and hashtags. You never include URLs or links in your output." },
        { role: "user", content: buildPrompt(title, cleanAsin, options) },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
};

export const generateWithGemini = async (
  title: string,
  cleanAsin: string,
  options?: { editorExclusions?: string[]; niche?: string; tone?: string }
): Promise<GeneratedCampaign | null> => {
  const ai = getGeminiClient();
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: buildPrompt(title, cleanAsin, options),
  });

  const text = typeof response?.text === "string" ? response.text : String(response ?? "");
  return JSON.parse(text);
};

export const generateCampaignCopy = async (
  title: string,
  cleanAsin: string,
  options?: { editorExclusions?: string[]; niche?: string; tone?: string }
): Promise<{ campaign: GeneratedCampaign; generatedBy: "openai" | "gemini" | "demo"; message: string }> => {
  const providerErrors: string[] = [];

  try {
    const campaign = await generateWithOpenAI(title, cleanAsin, options);
    if (campaign) return { campaign: sanitizeCampaign(campaign, title), generatedBy: "openai", message: "Campaign generated using OpenAI." };
  } catch (error) {
    providerErrors.push(error instanceof Error ? error.message : "OpenAI request failed");
  }

  try {
    const campaign = await generateWithGemini(title, cleanAsin, options);
    if (campaign) return { campaign: sanitizeCampaign(campaign, title), generatedBy: "gemini", message: "Campaign generated using Gemini." };
  } catch (error) {
    providerErrors.push(error instanceof Error ? error.message : "Gemini request failed");
  }

  return {
    campaign: sanitizeCampaign(getDemoCampaign(title), title),
    generatedBy: "demo",
    message: providerErrors.length > 0
      ? `Live AI providers failed. Demo campaign generated locally. ${providerErrors.join(" | ")}`
      : "No live AI provider configured. Demo campaign generated locally.",
  };
};
