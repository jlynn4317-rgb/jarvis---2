"use client";

import { useState } from "react";

export default function UnsubscribeButton({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  const handleClick = async () => {
    setState("working");
    try {
      const response = await fetch(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`, { method: "POST" });
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") return <p className="go-hook">You&apos;re unsubscribed. You won&apos;t get more emails from us.</p>;

  return (
    <div className="capture-form">
      <button type="button" onClick={handleClick} disabled={state === "working"}>
        {state === "working" ? "Working..." : "Yes, unsubscribe me"}
      </button>
      {state === "error" && <p className="login-error">Something went wrong. Please try again in a moment.</p>}
    </div>
  );
}
