import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { verifyImageSignature } from "@/lib/automation";

const SIZES = { pin: { width: 1000, height: 1500 }, feed: { width: 1080, height: 1350 } } as const;

// A branded text card for posts (Pinterest pins, Instagram and Facebook pictures). Only URLs
// signed by this app are drawn; anything else is a 404.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("t") || "";
  const sub = req.nextUrl.searchParams.get("s") || "";
  const size = req.nextUrl.searchParams.get("z") === "feed" ? "feed" : "pin";
  const signature = req.nextUrl.searchParams.get("sig") || "";

  if (!title || title.length > 90 || sub.length > 60 || !verifyImageSignature(title, sub, size, signature)) {
    return new Response("Not found", { status: 404 });
  }

  const { width, height } = SIZES[size];

  return new ImageResponse(
    (
      <div style={{ background: "#050608", color: "#ffffff", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: 90, width: "100%" }}>
        <div style={{ color: "#b7ff38", display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>GB LABS</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: title.length > 48 ? 84 : 104, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          {sub ? <div style={{ color: "#8f99a5", display: "flex", fontSize: 46, marginTop: 36 }}>{sub}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#8f99a5", display: "flex", fontSize: 40 }}>gblabs.app/gifts</div>
          <div style={{ background: "#b7ff38", display: "flex", height: 16, marginTop: 28, width: "100%" }} />
        </div>
      </div>
    ),
    { width, height, headers: { "Cache-Control": "public, max-age=86400, immutable" } }
  );
}
