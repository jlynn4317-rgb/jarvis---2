import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.UNSUBSCRIBE_SECRET || "";

export const signEmail = (email: string) => createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex");

export const verifyEmailToken = (email: string, token: string) => {
  if (!secret() || !email || !token) return false;
  const expected = Buffer.from(signEmail(email), "hex");
  const given = Buffer.from(token, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
};

export const buildUnsubscribeUrl = (email: string, kind: "page" | "api") => {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (!base || !secret()) return null;
  const path = kind === "page" ? "/unsubscribe" : "/api/unsubscribe";
  return `${base}${path}?e=${encodeURIComponent(email)}&t=${signEmail(email)}`;
};
