"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm({ denied }: { denied: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(denied ? "That account isn't allowed to use this dashboard." : "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("That email and password didn't match.");
        setSubmitting(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the sign-in service. Try again in a moment.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="capture-form">
      <label>
        Email
        <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error && <p className="login-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
