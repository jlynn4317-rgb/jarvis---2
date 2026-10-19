"use client";

import { useState } from "react";
import type { PackItem } from "@/lib/pack";

const PLATFORMS = [
  { id: "pinterest", label: "Pinterest" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok / Reels" },
  { id: "youtube", label: "YouTube Shorts" },
] as const;

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="pack-block">
      <div className="pack-block-head">
        <span>{label}</span>
        <button
          type="button"
          className="channel-chip"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="pack-text">{text}</pre>
    </div>
  );
}

export default function PackCard({ item }: { item: PackItem }) {
  const [posted, setPosted] = useState<Record<string, "saving" | "done" | string>>({});

  const markPosted = async (channel: string) => {
    setPosted((current) => ({ ...current, [channel]: "saving" }));
    try {
      const response = await fetch("/api/pack/posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: item.campaignId, variantId: item.variantId, channel }),
      });
      const data = await response.json();
      setPosted((current) => ({ ...current, [channel]: data.ok ? "done" : data.error || "Couldn't record that." }));
    } catch {
      setPosted((current) => ({ ...current, [channel]: "Couldn't record that." }));
    }
  };

  return (
    <article className="pack-card">
      <header>
        <h2>{item.title}</h2>
        {item.tone && <span className="pack-tone">Version: {item.tone}</span>}
      </header>

      <details open>
        <summary>Pinterest</summary>
        <CopyBlock label="Title" text={item.pinterest.title} />
        <CopyBlock label="Description" text={item.pinterest.description} />
        <CopyBlock label="Link" text={item.pinterest.link} />
      </details>

      <details>
        <summary>Facebook</summary>
        <CopyBlock label="Post" text={item.facebook} />
      </details>

      <details>
        <summary>Instagram (link goes in your bio)</summary>
        <CopyBlock label="Caption" text={item.instagram} />
      </details>

      <details>
        <summary>TikTok / Reels video</summary>
        <CopyBlock label="On-screen text, one line per slide" text={[item.tiktok.hook, ...item.tiktok.lines, item.tiktok.ending].join("\n")} />
        <CopyBlock label="Caption" text={item.tiktok.caption} />
      </details>

      <details>
        <summary>YouTube Shorts</summary>
        <CopyBlock label="Title" text={item.youtube.title} />
        <CopyBlock label="Description" text={item.youtube.description} />
      </details>

      <footer className="pack-posted">
        <span>I posted this on:</span>
        {PLATFORMS.map((platform) => {
          const state = posted[platform.id];
          return (
            <span key={platform.id} className="pack-posted-item">
              <button type="button" className={state === "done" ? "channel-chip queued" : "channel-chip"} disabled={state === "saving" || state === "done"} onClick={() => markPosted(platform.id)}>
                {state === "done" ? `${platform.label} ✓` : state === "saving" ? "Saving..." : platform.label}
              </button>
              {state && state !== "saving" && state !== "done" && <small className="login-error">{state}</small>}
            </span>
          );
        })}
      </footer>
    </article>
  );
}
