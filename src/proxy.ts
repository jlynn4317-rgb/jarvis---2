import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

// Everything is locked to the owner's login except these. The worker route checks
// its own CRON_SECRET, and lead pages/capture must stay open to the public.
const PUBLIC_PATHS = ["/login", "/api/health", "/api/leads", "/api/worker/run", "/unsubscribe", "/api/unsubscribe"];
const PUBLIC_PREFIXES = ["/go/"];

const isPublic = (pathname: string) => PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const allowedEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const email = user?.email?.toLowerCase();
  const isOwner = Boolean(email && user?.email_confirmed_at && allowedEmails().includes(email));

  if (pathname === "/login") {
    return isOwner ? copyCookies(response, NextResponse.redirect(new URL("/", request.url))) : response;
  }

  if (isPublic(pathname) || isOwner) return response;

  if (pathname.startsWith("/api/")) {
    const status = user ? 403 : 401;
    return copyCookies(response, NextResponse.json({ ok: false, error: status === 403 ? "Not allowed." : "Sign in required." }, { status }));
  }

  const loginUrl = new URL("/login", request.url);
  if (user) loginUrl.searchParams.set("denied", "1");
  return copyCookies(response, NextResponse.redirect(loginUrl));
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
