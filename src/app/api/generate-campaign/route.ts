import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const getCleanAsin = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  const match = value.match(/(?:\/dp\/)?([A-Z0-9]{10})/i) ?? value.match(/([A-Z0-9]{10})/i);
  return match?.[1] ?? value.replace(/[^A-Z0-9]/gi, "").slice(0, 10);
};

const isConfiguredEnvValue = (value: string | undefined) => {
  return Boolean(value && !value.includes("your_") && !value.includes("example") && value.trim());
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (isConfiguredEnvValue(apiKey)) {
    return new GoogleGenAI({ apiKey });
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT || "empior";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  if (!project || !location) {
    return null;
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
  });
};

const getDemoCampaign = (title: string, cleanAsin: string, affiliateUrl: string) => ({
  pinTitle: `${title || "Product"} That Converts Without The Guesswork`,
  pinDescription: `This high-intent product solves a clear problem and is ready for a direct-response funnel. Grab it here: ${affiliateUrl}`,
  shortVideoHook: `POV: You found the product that actually earns while you sleep`,
  hashtags: ["#affiliateMarketing", "#productHunt", "#viralMarketing"],
  asin: cleanAsin,
});

const buildPrompt = (title: string, cleanAsin: string, affiliateUrl: string) => `
  You are a direct-response affiliate marketing strategist.
  Create conversion-focused social and email content for this product.

  Product: ${title || "Unknown Product"}
  ASIN: ${cleanAsin}
  Affiliate URL: ${affiliateUrl}

  Return valid JSON only:
  {
    "pinTitle": "short SEO title",
    "pinDescription": "high-converting description",
    "shortVideoHook": "viral 3 second hook",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }
`;

const generateWithOpenAI = async (title: string, cleanAsin: string, affiliateUrl: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!isConfiguredEnvValue(apiKey)) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a direct-response affiliate marketing strategist who returns strict JSON with pinTitle, pinDescription, shortVideoHook, and hashtags.",
        },
        {
          role: "user",
          content: buildPrompt(title, cleanAsin, affiliateUrl),
        },
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

const generateWithGemini = async (title: string, cleanAsin: string, affiliateUrl: string) => {
  const ai = getGeminiClient();
  if (!ai) {
    return null;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: buildPrompt(title, cleanAsin, affiliateUrl),
  });

  const text = typeof response?.text === "string" ? response.text : String(response ?? "");
  return JSON.parse(text);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asin, title, affiliateTag = "gblabs20-20" } = body ?? {};
    const cleanAsin = getCleanAsin(String(asin || ""));

    if (!cleanAsin) {
      return NextResponse.json({ error: "Missing valid Amazon ASIN." }, { status: 400 });
    }

    const affiliateUrl = `https://www.amazon.com/dp/${cleanAsin}?tag=${affiliateTag}`;
    const productTitle = String(title || "Product");

    let campaign;
    let generatedBy = "demo";
    let message = "Gemini and OpenAI are not configured. Falling back to demo output.";

    try {
      campaign = await generateWithOpenAI(productTitle, cleanAsin, affiliateUrl);
      if (campaign) {
        generatedBy = "openai";
        message = "Campaign generated using OpenAI.";
      }
    } catch (error) {
      console.warn("OpenAI generation failed, falling back:", error);
    }

    if (!campaign) {
      try {
        campaign = await generateWithGemini(productTitle, cleanAsin, affiliateUrl);
        if (campaign) {
          generatedBy = "gemini";
          message = "Campaign generated using Gemini.";
        }
      } catch (error) {
        console.warn("Gemini generation failed, falling back:", error);
      }
    }

    if (!campaign) {
      campaign = getDemoCampaign(productTitle, cleanAsin, affiliateUrl);
      message = "No live AI provider configured. Demo campaign generated locally.";
    }

    return NextResponse.json({
      affiliateUrl,
      title: productTitle,
      generatedBy,
      message,
      campaign,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
