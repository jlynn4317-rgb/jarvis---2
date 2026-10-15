"use client";

import { useState } from "react";
import Link from "next/link";
import { extractEntries } from "@/lib/product-input";

type Row = {
  entry: string;
  kind: "product" | "search" | "unknown";
  asin?: string;
  keywords?: string;
  title: string;
  reason?: string;
  include: boolean;
  state: "ready" | "adding" | "done" | "failed" | "duplicate";
  message?: string;
};

const MAX_ENTRIES = 15;

export default function AddForm() {
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("coffee and tea lovers");
  const [rows, setRows] = useState<Row[]>([]);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState("");

  const patch = (index: number, change: Partial<Row>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const check = async () => {
    const entries = extractEntries(text).slice(0, MAX_ENTRIES);
    setNotice(extractEntries(text).length > MAX_ENTRIES ? `Only the first ${MAX_ENTRIES} are checked at a time.` : "");
    setFinished(false);
    if (entries.length === 0) {
      setRows([]);
      return;
    }

    setChecking(true);
    const results = await Promise.all(
      entries.map(async (entry): Promise<Row> => {
        try {
          const response = await fetch("/api/campaign/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entry }) });
          const data = await response.json();
          if (!data.ok) return { entry, kind: "unknown", title: "", reason: data.error || "Couldn't check this one.", include: false, state: "ready" };
          return { entry, kind: data.kind, asin: data.asin, keywords: data.keywords, title: data.title || "", reason: data.reason, include: data.kind !== "unknown", state: "ready" };
        } catch {
          return { entry, kind: "unknown", title: "", reason: "Couldn't check this one.", include: false, state: "ready" };
        }
      })
    );
    setRows(results);
    setChecking(false);
  };

  const addAll = async () => {
    setAdding(true);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (!row.include || row.kind === "unknown" || row.state === "done" || row.state === "duplicate") continue;

      patch(index, { state: "adding", message: "Writing copy and making links..." });
      try {
        const response = await fetch("/api/campaign/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: row.title, asin: row.asin, keywords: row.keywords, niche: audience }),
        });
        const data = await response.json();
        if (data.duplicate) patch(index, { state: "duplicate", message: "Already on your board." });
        else if (data.ok) patch(index, { state: "done", message: `Added with ${data.versions} versions.` });
        else patch(index, { state: "failed", message: data.error || "That one didn't work." });
      } catch {
        patch(index, { state: "failed", message: "That one didn't work. Try it again." });
      }
    }
    setAdding(false);
    setFinished(true);
  };

  const toAdd = rows.filter((row) => row.include && row.kind !== "unknown" && row.state !== "done" && row.state !== "duplicate").length;

  return (
    <div className="add-form">
      <label className="add-audience">
        Who is this batch for?
        <input className="add-title" value={audience} onChange={(event) => setAudience(event.target.value)} disabled={adding} placeholder="e.g. coffee lovers, gamers, new parents" />
      </label>
      <textarea
        className="add-textarea"
        rows={8}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"https://amzn.to/...\nburr coffee grinder\nhttps://www.amazon.com/.../dp/B0XXXXXXXX"}
        disabled={checking || adding}
      />
      <div className="add-actions">
        <button type="button" className="run-button" onClick={check} disabled={checking || adding || !text.trim()}>
          {checking ? "Checking..." : "Check these"}
        </button>
        {notice && <span className="board-empty">{notice}</span>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="board-table-wrap">
            <table className="board-table">
              <thead>
                <tr>
                  <th>Add?</th>
                  <th>Name (you can edit)</th>
                  <th>What it is</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.entry}-${index}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.include}
                        disabled={row.kind === "unknown" || adding || row.state === "done"}
                        onChange={(event) => patch(index, { include: event.target.checked })}
                        aria-label="Include this product"
                      />
                    </td>
                    <td>
                      {row.kind === "unknown" ? (
                        <span className="board-empty">{row.entry.slice(0, 60)}</span>
                      ) : (
                        <input className="add-title" value={row.title} disabled={adding || row.state === "done"} onChange={(event) => patch(index, { title: event.target.value })} />
                      )}
                    </td>
                    <td>
                      {row.kind === "product" && <>Single product <small>({row.asin})</small></>}
                      {row.kind === "search" && <>Search page <small>({row.keywords})</small></>}
                      {row.kind === "unknown" && <span className="login-error">{row.reason}</span>}
                    </td>
                    <td>{row.state === "ready" ? (row.kind === "unknown" ? "Skipped" : "Ready") : row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="add-actions">
            <button type="button" className="run-button" onClick={addAll} disabled={adding || toAdd === 0}>
              {adding ? "Adding... please keep this page open" : `Add ${toAdd} product${toAdd === 1 ? "" : "s"}`}
            </button>
            {finished && <Link href="/board" className="channel-chip">See them on the board</Link>}
          </div>
          <p className="board-empty">
            Single-product links usually sell better than search pages. A search page is a fine way to start; you can swap in a specific product later for the ones that get clicks.
          </p>
        </>
      )}
    </div>
  );
}
