"use client";

import { useState } from "react";

export default function GuideSignup() {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === "sending" || !email.includes("@")) return;
    setState("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, hp: trap, source: "gift_guide" }),
      });
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") return <p className="guide-thanks">Thanks! Check your inbox for a short welcome note.</p>;

  return (
    <form onSubmit={submit} className="capture-form guide-form">
      <label>
        Email
        <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      </label>
      <input type="text" name="contact_ref_hp" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(event) => setTrap(event.target.value)} />
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending..." : "Send me ideas"}</button>
      {state === "error" && <p className="login-error">That didn&apos;t go through. Please try again in a moment.</p>}
    </form>
  );
}
