import { createHmac, timingSafeEqual } from "node:crypto";

// The n8n feed uses its own secret (AUTOMATION_SECRET), separate from the owner login. With no
// secret set, or a short one, every automation request is refused.
const secret = () => (process.env.AUTOMATION_SECRET || "").trim();

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const isAutomationAuthorized = (headers: Headers) => {
  const key = secret();
  if (key.length < 24) return false;
  const header = headers.get("authorization") || "";
  return header.startsWith("Bearer ") && safeEqual(header.slice(7).trim(), key);
};

// Branded image URLs are signed so the public image route only draws text that this app asked
// for; nobody can use our domain to host arbitrary pictures.
const sign = (title: string, sub: string, size: string) => createHmac("sha256", secret() || "unset").update(`${size}|${title}|${sub}`).digest("hex").slice(0, 32);

export const verifyImageSignature = (title: string, sub: string, size: string, signature: string) => secret().length >= 24 && signature.length === 32 && safeEqual(sign(title, sub, size), signature);

export const buildImageUrl = (origin: string, title: string, sub: string, size: "pin" | "feed") => {
  if (secret().length < 24) return null;
  const params = new URLSearchParams({ t: title.slice(0, 90), s: sub.slice(0, 60), z: size });
  params.set("sig", sign(title.slice(0, 90), sub.slice(0, 60), size));
  return `${origin}/img/card?${params.toString()}`;
};
