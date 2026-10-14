import { createHmac } from "node:crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (email: string) => email.length <= 254 && EMAIL_PATTERN.test(email);

export const getClientIp = (headers: Headers) =>
  (headers.get("x-forwarded-for") || "").split(",")[0].trim() || headers.get("x-real-ip") || "unknown";

// Stored instead of the raw IP: enough to count signups per visitor, not enough to identify them.
export const hashIp = (ip: string) => createHmac("sha256", process.env.UNSUBSCRIBE_SECRET || "ip-salt").update(ip).digest("hex").slice(0, 32);

export type LeadSignals = { alreadyKnown: boolean; recentFromIp: number; recentTotal: number };

const intFromEnv = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const signupLimits = () => ({
  perIpPerHour: intFromEnv("SIGNUP_LIMIT_PER_IP_HOUR", 5),
  totalPerHour: intFromEnv("SIGNUP_LIMIT_TOTAL_HOUR", 100),
});

export const checkSignupLimits = (signals: LeadSignals, limits: { perIpPerHour: number; totalPerHour: number }) =>
  signals.recentFromIp >= limits.perIpPerHour || signals.recentTotal >= limits.totalPerHour ? "limited" : "ok";
