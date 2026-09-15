"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAffiliateUrl, affiliateNetworks } from "@/lib/networks";

type CampaignResult = {
  affiliateUrl: string;
  title: string;
  generatedBy: "gemini" | "openai" | "demo";
  message?: string;
  pinTitle?: string;
  pinDescription?: string;
  shortVideoHook?: string;
  hashtags?: string[];
};

type ActivityItem = [string, string, string, string];

type SavedCampaign = CampaignResult & {
  asin: string;
  createdAt: string;
};

type Variant = {
  tone: string;
  ok: boolean;
  generatedBy?: string;
  variant?: { id: string; headline: string; body: string };
  trackingSlug?: string;
  landingUrl?: string | null;
  error?: string;
};

const CHANNELS = ["pinterest", "tiktok", "x"] as const;

type ChannelPostState = { postId: string; status: "pending_approval" | "approved" };

const LOCAL_ACTIVITY_KEY = "jarvis-activity";
const LOCAL_CAMPAIGNS_KEY = "jarvis-campaigns";

const readLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
};

const engines = [
  { name: "Attraction", detail: "Hooks, pins, and short-form campaign copy", icon: "A", state: "READY", color: "lime", metric: "Campaign route" },
  { name: "Affiliate", detail: "ASIN cleanup and tagged Amazon links", icon: "L", state: "LIVE", color: "blue", metric: "URL generation" },
  { name: "Email", detail: "Resend delivery route for campaign sequences", icon: "E", state: "READY", color: "orange", metric: "API route" },
  { name: "Copywriting", detail: "OpenAI and Gemini generation route", icon: "C", state: "READY", color: "pink", metric: "Provider route" },
];

const workflow = [
  { name: "Research", description: "Validate product, intent, and offer strength." },
  { name: "Attract", description: "Generate hooks, pins, short-form scripts." },
  { name: "Affiliate", description: "Attach clean tracking URLs and tags." },
  { name: "Email", description: "Send welcome drips and conversion flows." },
  { name: "Convert", description: "Track clicks, leads, and revenue." },
];

const integrations = [
  { name: "Gemini", status: "READY", value: "AI copy generation" },
  { name: "Supabase", status: "READY", value: "Auth + database + RLS" },
  { name: "Resend", status: "PENDING", value: "Email delivery infrastructure" },
];

const initialActivity: ActivityItem[] = [
  ["09:42:18", "Copywriting", "Pin copy generated for Ember Mug 2", "success"],
  ["09:41:55", "Affiliate", "Tracking link attached - gblabs20-20", "success"],
  ["09:40:02", "Email", "Welcome sequence queued for 142 leads", "info"],
  ["09:38:44", "Jarvis", "Price sync complete - 42 products checked", "success"],
];

const normalizeAsin = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  const match = value.match(/(?:\/dp\/)?([A-Z0-9]{10})/i) ?? value.match(/([A-Z0-9]{10})/i);
  return match?.[1] ?? value.replace(/[^A-Z0-9]/gi, "").slice(0, 10);
};

const DEFAULT_EDITOR_EXCLUSIONS = ["Notion", "Google Docs", "Canva"];

const parseEditorExclusions = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/\s+/g, " "))
        .filter((item) => item.length > 0)
    )
  );

export default function Home() {
  const [autonomous, setAutonomous] = useState(true);
  const [asin, setAsin] = useState("B09V3KXJPB");
  const [title, setTitle] = useState("Ember Temperature Control Smart Mug");
  const [tag, setTag] = useState("gblabs20-20");
  const [editorExclusions, setEditorExclusions] = useState<string[]>(DEFAULT_EDITOR_EXCLUSIONS);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  const [jarvisStatus, setJarvisStatus] = useState<{ status?: string; readiness?: string; runtime?: Record<string, boolean> } | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({});
  const [activity, setActivity] = useState<ActivityItem[]>(() => readLocal(LOCAL_ACTIVITY_KEY, initialActivity));
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaign[]>(() => readLocal(LOCAL_CAMPAIGNS_KEY, []));
  const [remoteCounts, setRemoteCounts] = useState<{ campaigns: number; telemetry: number; leads: number; socialPosts: number } | null>(null);
  const [niche, setNiche] = useState("general");
  const [network, setNetwork] = useState("amazon");
  const [destination, setDestination] = useState("");
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [channelPosts, setChannelPosts] = useState<Record<string, Record<string, ChannelPostState>>>({});

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/jarvis-status");
        const data = await response.json();
        setJarvisStatus(data);
      } catch (error) {
        console.warn("Unable to load JARVIS status", error);
      }
    };

    loadStatus();

    fetch("/api/integrations/status")
      .then((response) => response.json())
      .then((data) => setIntegrationStatus(data.integrations ?? {}))
      .catch((error) => console.warn("Unable to load integration status", error));

    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          setRemoteCounts({
            campaigns: data.counts?.campaigns ?? 0,
            telemetry: data.counts?.telemetry ?? 0,
            leads: data.counts?.leads ?? 0,
            socialPosts: data.counts?.socialPosts ?? 0,
          });
        }
      })
      .catch((error) => console.warn("Unable to load dashboard data", error));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(activity));
  }, [activity]);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(savedCampaigns));
  }, [savedCampaigns]);

  const affiliateUrl = useMemo(() => {
    return buildAffiliateUrl({ network, asin: normalizeAsin(asin), destination, affiliateTag: tag });
  }, [asin, tag, network, destination]);

  const editorExclusionsText = editorExclusions.join(", ");
  const liveIntegrationCount = Object.values(integrationStatus).filter(Boolean).length;
  const activityEventCount = activity.length;
  const readiness = jarvisStatus?.readiness ?? "0/5";
  const connectionItems = [
    ["Gemini", integrationStatus.gemini],
    ["Supabase", integrationStatus.supabase],
    ["OpenAI", integrationStatus.openai],
    ["Resend", integrationStatus.resend],
  ] as const;

  const updateEditorExclusions = (value: string) => {
    setEditorExclusions(parseEditorExclusions(value));
  };

  const runCampaign = async () => {
    const cleanAsin = normalizeAsin(asin);
    if (!cleanAsin) return;

    setRunning(true);
    setCampaignResult(null);
    setVariants([]);
    setCurrentCampaignId(null);
    setChannelPosts({});

    try {
      const briefResponse = await fetch("/api/campaign-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: cleanAsin, title, affiliateTag: tag, editorExclusions }),
      });

      const briefData = await briefResponse.json();
      if (!briefResponse.ok) {
        throw new Error(briefData.error || "Campaign brief generation failed");
      }

      const response = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: cleanAsin, title, affiliateTag: tag, briefId: briefData.brief?.briefId, editorExclusions, niche, network, destination }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Campaign generation failed");
      }

      const result: CampaignResult = {
        affiliateUrl: data.affiliateUrl,
        title: data.title,
        generatedBy: data.generatedBy,
        message: data.message,
        pinTitle: data.campaign?.pinTitle,
        pinDescription: data.campaign?.pinDescription,
        shortVideoHook: data.campaign?.shortVideoHook,
        hashtags: data.campaign?.hashtags,
      };

      setCampaignResult(result);
      const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setActivity((current) => [[timestamp, "Campaign", `Campaign generated for ${result.title}`, "success"], ...current].slice(0, 5) as ActivityItem[]);
      setSavedCampaigns((current) => [{ ...result, asin: cleanAsin, createdAt: new Date().toISOString() }, ...current].slice(0, 50));

      const [persistResponse, telemetryResponse] = await Promise.all([
        fetch("/api/campaign/persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: result.title, asin: cleanAsin, affiliateTag: tag, status: "generated", brief: data.campaign ?? {} }),
        }),
        fetch("/api/telemetry/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "campaign", eventName: "campaign_generated", payload: { asin: cleanAsin, title: result.title, generatedBy: result.generatedBy } }),
        }),
      ]);

      const persistData = await persistResponse.json();
      const telemetryData = await telemetryResponse.json();
      if (persistData.ok && persistData.campaign?.id) setCurrentCampaignId(persistData.campaign.id);
      const storageMessage = persistData.ok ? "Campaign persisted to Supabase." : "Campaign saved locally; Supabase persistence needs attention.";
      const telemetryMessage = telemetryData.ok ? "Telemetry recorded." : "Telemetry connection needs attention.";
      setActivity((current) => [
        [timestamp, "Supabase", storageMessage, persistData.ok ? "success" : "info"],
        [timestamp, "Telemetry", telemetryMessage, telemetryData.ok ? "success" : "info"],
        ...current,
      ].slice(0, 5) as ActivityItem[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const result: CampaignResult = {
        affiliateUrl: buildAffiliateUrl({ network, asin: cleanAsin, destination, affiliateTag: tag }),
        title,
        generatedBy: "demo",
        message,
      };
      const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setCampaignResult(result);
      setSavedCampaigns((current) => [{ ...result, asin: cleanAsin, createdAt: new Date().toISOString() }, ...current].slice(0, 50));
      setActivity((current) => [[timestamp, "Campaign", `Campaign saved locally for ${result.title}`, "info"], ...current].slice(0, 5) as ActivityItem[]);
    } finally {
      setRunning(false);
    }
  };

  const copyAffiliateUrl = async () => {
    const value = campaignResult?.affiliateUrl ?? affiliateUrl;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const generateVariants = async () => {
    if (!currentCampaignId || generatingVariants) return;
    setGeneratingVariants(true);

    try {
      const response = await fetch("/api/campaign/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: currentCampaignId, title, asin: normalizeAsin(asin), affiliateTag: tag, network, destination, niche }),
      });
      const data = await response.json();
      if (data.ok) setVariants(data.variants ?? []);
    } catch (error) {
      console.warn("Unable to generate variants", error);
    } finally {
      setGeneratingVariants(false);
    }
  };

  const queueToChannel = async (variant: Variant, channel: string) => {
    if (!currentCampaignId || !variant.variant) return;
    const variantId = variant.variant.id;

    try {
      const response = await fetch("/api/social/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: currentCampaignId,
          channels: [channel],
          copyVariantId: variantId,
          content: { headline: variant.variant.headline, body: variant.variant.body },
        }),
      });
      const data = await response.json();
      const postId = data?.posts?.[0]?.post?.id;
      if (!postId) return;

      setChannelPosts((current) => ({
        ...current,
        [variantId]: { ...(current[variantId] ?? {}), [channel]: { postId, status: "pending_approval" } },
      }));
    } catch (error) {
      console.warn("Unable to queue channel post", error);
    }
  };

  const approveChannel = async (variantId: string, channel: string) => {
    const postId = channelPosts[variantId]?.[channel]?.postId;
    if (!postId) return;

    try {
      await fetch("/api/social/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      setChannelPosts((current) => ({
        ...current,
        [variantId]: { ...(current[variantId] ?? {}), [channel]: { postId, status: "approved" } },
      }));
    } catch (error) {
      console.warn("Unable to approve channel post", error);
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>JARVIS</span>
          <small>OS / 01</small>
        </div>

        <div className="workspace-switch">
          <span className="status-dot" />
          Personal workspace
          <span className="chevron">v</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-label">Command</p>
          <a className="nav-item active" href="#overview"><span className="nav-icon">[]</span> Overview <b>1</b></a>
          <a className="nav-item" href="#campaigns"><span className="nav-icon">/</span> Campaigns <b>2</b></a>
          <a className="nav-item" href="#engines"><span className="nav-icon">o</span> Engines <b>3</b></a>
          <a className="nav-item" href="#settings"><span className="nav-icon">*</span> Integrations <b>4</b></a>
          <p className="nav-label second">Infrastructure</p>
          <a className="nav-item" href="#telemetry"><span className="nav-icon">~</span> Telemetry</a>
          <a className="nav-item" href="#settings"><span className="nav-icon">.</span> Settings</a>
        </nav>

        <div className="sidebar-foot">
          <div className="avatar">GB</div>
          <div>
            <strong>GB Labs</strong>
            <span>Founder access</span>
          </div>
          <span className="more">...</span>
        </div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar">
          <div className="crumb"><span>JARVIS</span><i>/</i> Command center</div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search">S</button>
            <button className="icon-button" aria-label="Notifications">N<em /></button>
            <div className="live-pill"><span className="status-dot" /> {jarvisStatus?.status ?? "SYSTEMS NOMINAL"}</div>
          </div>
        </header>

        <div className="page-head">
          <div>
            <p className="eyebrow">THURSDAY, AUGUST 28, 2026 <span>-</span> 09:44 UTC</p>
            <h1>Good morning, Jeff.</h1>
            <p className="subhead">Your ecosystem is running clean. Here is the pulse.</p>
          </div>
          <button className="primary-button" onClick={() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" })}><span>+</span> New campaign</button>
        </div>

        <div className="connection-rail" aria-label="Live connection status">
          <span className="connection-title">CONNECTED STACK</span>
          {connectionItems.map(([name, connected]) => (
            <span className={`connection-item ${connected ? "connected" : "pending"}`} key={name}>
              <i /> {name} <b>{connected ? "LIVE" : "WAITING"}</b>
            </span>
          ))}
        </div>

        <section className="metrics-grid" aria-label="Performance metrics">
          <div className="metric-card">
            <span>SAVED CAMPAIGNS <i>i</i></span>
            <strong>{remoteCounts?.campaigns ?? savedCampaigns.length}</strong>
            <small className="up">{remoteCounts ? "DATABASE" : "LOCAL"} <b>{remoteCounts ? "from Supabase" : "on this device"}</b></small>
            <div className="sparkline cyan"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="metric-card">
            <span>LIVE INTEGRATIONS <i>i</i></span>
            <strong>{liveIntegrationCount}/{Object.keys(integrationStatus).length || 5}</strong>
            <small className="up">RUNTIME <b>connection status</b></small>
            <div className="sparkline lime"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="metric-card">
            <span>TELEMETRY EVENTS <i>i</i></span>
            <strong>{remoteCounts?.telemetry ?? activityEventCount}</strong>
            <small className="up">{remoteCounts ? "DATABASE" : "LIVE FEED"} <b>{remoteCounts ? "from Supabase" : "latest activity"}</b></small>
            <div className="sparkline coral"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="metric-card">
            <span>SYSTEM READINESS <i>i</i></span>
            <strong>{readiness}</strong>
            <small className="up">STATUS <b>{jarvisStatus?.status ?? "CHECKING"}</b></small>
            <div className="sparkline blue"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="metric-card">
            <span>LEADS CAPTURED <i>i</i></span>
            <strong>{remoteCounts?.leads ?? 0}</strong>
            <small className="up">EMAIL LIST <b>owned audience</b></small>
            <div className="sparkline lime"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <div className="metric-card">
            <span>CHANNEL QUEUE <i>i</i></span>
            <strong>{remoteCounts?.socialPosts ?? 0}</strong>
            <small className="up">DISTRIBUTION <b>queued + posted</b></small>
            <div className="sparkline coral"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
        </section>

        <section className="pipeline-panel" aria-label="Campaign workflow">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CORE FLOW</p>
              <h2>Campaign production loop</h2>
            </div>
            <span className="pulse-label"><i /> LIVE</span>
          </div>
          <div className="workflow-grid">
            {workflow.map((step) => (
              <div className="flow-card" key={step.name}>
                <div className="flow-badge">{step.name}</div>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="section-heading">
          <div>
            <p className="eyebrow">THE ECOSYSTEM</p>
            <h2>Engine status</h2>
          </div>
          <button className="text-button" onClick={() => document.getElementById("engines")?.scrollIntoView({ behavior: "smooth" })}>View telemetry <span>{">"}</span></button>
        </div>

        <section className="engine-grid" id="engines">
          {engines.map((engine) => (
            <article className="engine-card" key={engine.name}>
              <div className={`engine-icon ${engine.color}`}>{engine.icon}</div>
              <div className="engine-info">
                <div className="engine-title">
                  <h3>{engine.name}</h3>
                  <span className={`state ${engine.state === "LIVE" ? "live" : "ready"}`}><i /> {engine.state}</span>
                </div>
                <p>{engine.detail}</p>
                <strong>{engine.metric}</strong>
              </div>
              <span className="arrow">{">"}</span>
            </article>
          ))}
        </section>

        <div className="workspace-grid" id="campaigns">
          <section className="studio-panel" id="studio">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ORCHESTRATION / 01</p>
                <h2>Campaign studio</h2>
              </div>
              <div className="mode-toggle">
                <span className={autonomous ? "selected" : ""}>AUTONOMOUS</span>
                <button className={autonomous ? "toggle on" : "toggle"} onClick={() => setAutonomous(!autonomous)} aria-label="Toggle autonomous mode"><i /></button>
              </div>
            </div>

            <p className="panel-description">Feed Jarvis a product. It routes the brief through the attraction, affiliate, copy, and email layers and returns a conversion-ready campaign.</p>

            <div className="form-row">
              <label>
                Affiliate network
                <select value={network} onChange={(event) => setNetwork(event.target.value)}>
                  {affiliateNetworks.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                {affiliateNetworks.find((item) => item.id === network)?.destinationLabel ?? "Destination"}
                {network === "amazon" ? (
                  <input value={asin} onChange={(event) => setAsin(event.target.value)} placeholder="B09V3KXJPB" />
                ) : (
                  <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Vendor ID, merchant ID, or URL" />
                )}
              </label>
            </div>

            <div className="form-row">
              <label>
                Product title
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label>
                Niche / audience focus
                <input value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="general, home fitness, pet care..." />
              </label>
            </div>

            <div className="form-row">
              <label>
                Editor exclusions
                <input value={editorExclusionsText} onChange={(event) => updateEditorExclusions(event.target.value)} placeholder="Notion, Google Docs, Canva" />
              </label>
              <label>
                Copy framework
                <select defaultValue="PAS + AIDA">
                  <option>PAS + AIDA</option>
                  <option>PAS</option>
                  <option>AIDA</option>
                </select>
              </label>
            </div>

            {editorExclusions.length > 0 && (
              <div className="editor-chip-row" aria-label="Excluded editors">
                {editorExclusions.map((editor) => (
                  <button key={editor} type="button" className="editor-chip" onClick={() => setEditorExclusions((current) => current.filter((item) => item !== editor))}>
                    {editor} ×
                  </button>
                ))}
              </div>
            )}

            <div className="form-row">
              <label>
                Affiliate tag
                <div className="input-with-badge">
                  <input value={tag} onChange={(event) => setTag(event.target.value)} />
                  <span>LOCKED</span>
                </div>
              </label>
              <label>
                Campaign mode
                <select defaultValue="AUTONOMOUS">
                  <option>AUTONOMOUS</option>
                  <option>MANUAL REVIEW</option>
                  <option>SAFE MODE</option>
                </select>
              </label>
            </div>

            <div className="affiliate-preview">
              <div>
                <span>GENERATED AFFILIATE LINK</span>
                <p>{(campaignResult?.affiliateUrl ?? affiliateUrl) || "Enter an ASIN to generate your tagged link"}</p>
              </div>
              <button onClick={copyAffiliateUrl} disabled={!((campaignResult?.affiliateUrl ?? affiliateUrl))} aria-label="Copy generated affiliate link">
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            {campaignResult && (
              <div className="campaign-preview">
                <span>Generated by {campaignResult.generatedBy === "gemini" ? "Gemini" : campaignResult.generatedBy === "openai" ? "OpenAI" : "demo fallback"}</span>
                <h3>{campaignResult.pinTitle || campaignResult.title}</h3>
                <p>{campaignResult.pinDescription || campaignResult.message}</p>
                {campaignResult.shortVideoHook && <p className="hook">{campaignResult.shortVideoHook}</p>}
                {campaignResult.hashtags && campaignResult.hashtags.length > 0 && (
                  <div className="tag-row">{campaignResult.hashtags.map((tagValue) => <span key={tagValue}>{tagValue}</span>)}</div>
                )}
              </div>
            )}

            <button className="run-button" onClick={runCampaign} disabled={running || (network === "amazon" ? !normalizeAsin(asin) : !destination)}>
              {running ? "JARVIS IS ROUTING THE BRIEF..." : "RUN CAMPAIGN PIPELINE  ->"}
            </button>

            {currentCampaignId && (
              <section className="variants-panel" aria-label="A/B variants and distribution">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">OPTIMIZATION LOOP</p>
                    <h2>A/B variants + distribution</h2>
                  </div>
                  <button className="text-button" onClick={generateVariants} disabled={generatingVariants}>
                    {generatingVariants ? "Generating..." : "Generate 3 variants"}
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="panel-description">Generate tone-tested variants, each with its own tracking link, then queue them to channels below. A winner is auto-selected from conversions after 24h.</p>
                ) : (
                  <div className="variant-list">
                    {variants.map((item) => (
                      <div className="variant-card" key={item.tone}>
                        <div className="variant-tone">{item.tone}</div>
                        {item.ok && item.variant ? (
                          <>
                            <strong>{item.variant.headline}</strong>
                            <p>{item.variant.body}</p>
                            {item.landingUrl && <code className="variant-link">{item.landingUrl}</code>}
                            <div className="channel-row">
                              {CHANNELS.map((channel) => {
                                const state = channelPosts[item.variant!.id]?.[channel];
                                if (!state) {
                                  return (
                                    <button key={channel} type="button" className="channel-chip" onClick={() => queueToChannel(item, channel)}>
                                      Queue to {channel}
                                    </button>
                                  );
                                }
                                if (state.status === "pending_approval") {
                                  return (
                                    <button key={channel} type="button" className="channel-chip pending" onClick={() => approveChannel(item.variant!.id, channel)}>
                                      {channel}: approve &amp; post
                                    </button>
                                  );
                                }
                                return (
                                  <button key={channel} type="button" className="channel-chip queued" disabled>
                                    {channel} approved
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="variant-error">{item.error || "Variant generation failed."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>

          <section className="activity-panel" id="telemetry">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">LIVE FEED</p>
                <h2>Agent telemetry</h2>
              </div>
              <span className="pulse-label"><i /> LIVE</span>
            </div>

            <div className="activity-list">
              {activity.map(([time, agent, message, type], index) => (
                <div className="activity-item" key={`${time}-${agent}-${index}`}>
                  <span className={`activity-dot ${type}`} />
                  <div>
                    <p><strong>{agent}</strong> {message}</p>
                    <time>{time} UTC</time>
                  </div>
                </div>
              ))}
            </div>

            <button className="text-button feed-button">Open full log <span>{">"}</span></button>
          </section>
        </div>

        <section className="pipeline-panel saved-campaigns" aria-label="Saved campaigns">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LOCAL WORKSPACE</p>
              <h2>Saved campaigns</h2>
            </div>
            <span className="pulse-label">{savedCampaigns.length} STORED</span>
          </div>
          {savedCampaigns.length === 0 ? (
            <p className="panel-description">Run a campaign to save its copy, tracking link, and timestamp on this device.</p>
          ) : (
            <div className="saved-campaign-list">
              {savedCampaigns.slice(0, 5).map((savedCampaign) => (
                <button className="saved-campaign" key={savedCampaign.createdAt} onClick={() => setCampaignResult(savedCampaign)}>
                  <span>{savedCampaign.asin}</span>
                  <strong>{savedCampaign.title}</strong>
                  <time>{new Date(savedCampaign.createdAt).toLocaleDateString()}</time>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="integration-layout" id="settings">
          <div className="settings-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">INTEGRATIONS</p>
                <h2>Connected stack</h2>
              </div>
            </div>
            <div className="integration-grid">
              {integrations.map((item) => (
                <div className="integration-card" key={item.name}>
                  <div className="integration-topline">
                    <strong>{item.name}</strong>
                    <span className={`status ${integrationStatus[item.name.toLowerCase().split(" ")[0]] ? "ready" : "pending"}`}>
                      {integrationStatus[item.name.toLowerCase().split(" ")[0]] ? "LIVE" : "WAITING"}
                    </span>
                  </div>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SYSTEM</p>
                <h2>Global settings</h2>
              </div>
            </div>
            <div className="settings-list">
              <div className="setting-row"><span>Affiliate tag</span><strong>{tag}</strong></div>
              <div className="setting-row"><span>Autonomous mode</span><strong>{autonomous ? "Enabled" : "Manual"}</strong></div>
              <div className="setting-row"><span>System readiness</span><strong>{jarvisStatus?.readiness ?? "0/4"}</strong></div>
              <div className="setting-row"><span>Gemini</span><strong>{jarvisStatus?.runtime?.gemini ? "LIVE" : "WAITING"}</strong></div>
              <div className="setting-row"><span>Supabase</span><strong>{jarvisStatus?.runtime?.supabase ? "LIVE" : "WAITING"}</strong></div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span>JARVIS OS <b>v0.1.0 / INTERNAL</b></span>
          <span>POWERED BY JARVIS CORE <i>*</i></span>
        </footer>
      </section>
    </main>
  );
}
