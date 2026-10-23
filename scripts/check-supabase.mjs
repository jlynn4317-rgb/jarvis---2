// Checks the Supabase keys in .env against the live project without printing them.
// Run from the repo root: node scripts/check-supabase.mjs
//
// New-style keys (sb_publishable_..., sb_secret_...) must go on the `apikey` header only,
// and Supabase answers 401 to a secret key sent with a browser-like User-Agent. PowerShell's
// Invoke-WebRequest sends "Mozilla/5.0 ...", so test from Node, which does not.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(process.argv[2] ?? ".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const pick = (...names) => names.map((n) => [n, env[n]]).find(([, v]) => v && !/your[-_]|example/i.test(v)) ?? [names[0], ""];
const [urlName, url] = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const [pubName, pub] = pick("SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
const [secName, sec] = pick("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");

const shape = (k) => (k ? `${k.length} chars, starts ${k.slice(0, k.startsWith("sb_") ? k.indexOf("_", 3) + 1 : 3)}` : "missing");
console.log(`URL      ${urlName}: ${url ? new URL(url).host : "missing"}`);
console.log(`Public   ${pubName}: ${shape(pub)}`);
console.log(`Secret   ${secName}: ${shape(sec)}`);
if (!url) process.exit(1);

const check = async (label, key, path) => {
  if (!key) return console.log(`SKIP ${label}`);
  const headers = { apikey: key, "User-Agent": "gblabs-key-check" };
  // Legacy JWT keys also need the Bearer header; new sb_ keys must not have it.
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  const r = await fetch(`${url}${path}`, { headers });
  const body = r.ok ? "" : ` ${(await r.text()).slice(0, 160)}`;
  console.log(`${r.ok ? "OK  " : "FAIL"} ${label} - HTTP ${r.status}${body}`);
};

await check("public key (auth settings)", pub, "/auth/v1/settings");
await check("secret key (admin users)", sec, "/auth/v1/admin/users?per_page=1");
await check("secret key (campaigns table)", sec, "/rest/v1/campaigns?select=id&limit=1");
