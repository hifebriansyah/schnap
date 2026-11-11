// The commerce Worker: the edge gateway between the static SCHNAP pitch pages and the live CS-Cart store (plan.md, "Approach A").
//
//   GET|POST /api/<path>?<query>      ->   https://www.schnap.com.au/<path>?<query>    (e.g. /api/index.php?dispatch=products.search&q=rcbo&is_ajax=1)
//   GET|POST /cscart/<path>?<query>   ->   the same (the alias from plan.md, milestone 1)
//   GET      /health                  ->   {"ok": true}
//
// Why a Worker: SCHNAP sends no CORS headers, so a browser on another site cannot read its answers, and its session cookie
// (sid_customer_...) is set for www.schnap.com.au only. This Worker adds CORS for the allowed pages and keeps the CS-Cart session:
//   - every cookie SCHNAP sets comes back renamed "cs_<name>", host-only on this Worker, SameSite=None; Secure; Partitioned,
//     and only cs_ cookies are sent on to SCHNAP (so no other cookie of this domain ever leaves for SCHNAP);
//   - for pages where third-party cookies are blocked, the same session travels in the X-Session header:
//     each answer carries the current session ("name=value; name=value"); send it back as X-Session on the next request.
// Redirects are not followed here: a Location on SCHNAP is rewritten to this Worker, so the session cookies of every hop are kept.
// Anonymous catalog GETs (no session) are cached for CACHE_SECONDS, which spares the slow backend (plan.md section 7).
// Settings (worker/commerce.jsonc): UPSTREAM, ALLOWED_ORIGINS, CACHE_SECONDS, and the rate limits LIMITER (each IP) and LIMITER_ALL.

const MAX_BODY = 200_000;
const TIMEOUT_MS = 30_000;
const COOKIE_PREFIX = "cs_";
// what a browser may send on to SCHNAP; everything else (Origin, Referer, Cookie of this domain, CF headers) stays here
const FORWARD_HEADERS = ["accept", "accept-language", "content-type", "x-requested-with", "user-agent"];
// controllers that change or read a person's state: never cached
const PRIVATE_DISPATCH = /^(checkout|auth|profiles|orders|wishlist|product_features\.compare|call_requests|discussion)/;

// the upstream path a request asks for, or null when it is not one this gateway forwards
export function upstreamPath(pathname) {
  const m = pathname.match(/^\/(?:api|cscart)(\/.*)?$/);
  if (!m) return null;
  const path = m[1] || "/";
  if (path.includes("..") || path.includes("//") || /[\\\0]/.test(path)) return null;
  // the storefront only: index.php and SEO paths (/brands, /payment-and-shipping/...), never admin.php, vendor.php or other scripts
  if (/\.php$/i.test(path.split("/").pop()) && path.toLowerCase() !== "/index.php") return null;
  return path;
}

export function parseCookies(header) {
  const out = new Map();
  for (const part of (header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return out;
}

const serialize = (map) => [...map].map(([k, v]) => `${k}=${v}`).join("; ");

// one upstream Set-Cookie -> {name, value, deleted, header for the browser}
export function rewriteSetCookie(line) {
  const [pair, ...attrs] = line.split(";");
  const i = pair.indexOf("=");
  if (i <= 0) return null;
  const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
  let deleted = value === "" || value === "deleted";
  const kept = [];
  for (const a of attrs) {
    const [k, ...v] = a.trim().split("=");
    const key = k.toLowerCase();
    if (key === "expires" && Date.parse(v.join("=")) < Date.now()) deleted = true;
    if (key === "max-age" && Number(v.join("=")) <= 0) deleted = true;
    if (key === "expires" || key === "max-age" || key === "httponly") kept.push(a.trim());
    // Domain, Path, SameSite, Secure: replaced below
  }
  return { name, value, deleted, header: [`${COOKIE_PREFIX}${name}=${value}`, ...kept, "Path=/", "Secure", "SameSite=None", "Partitioned"].join("; ") };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const originOk = allowed.some((a) => origin === a || origin.startsWith(`${a}:`));   // http://localhost also allows its ports
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : "null",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, X-Session",
      "Access-Control-Expose-Headers": "X-Session, X-Cache, Location",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (url.pathname === "/health") return reply({ ok: true });
    if (request.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    // a navigation (an <a href> or a form post to /cscart/...) has no Origin: allowed, it is the browser's own page, not a script reading it
    if (origin && !originOk) return reply({ error: "forbidden" }, 403);
    if (request.method !== "GET" && request.method !== "POST") return reply({ error: "method not allowed" }, 405);
    const path = upstreamPath(url.pathname);
    if (!path) return reply({ error: "not found" }, 404);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.LIMITER && !(await env.LIMITER.limit({ key: ip })).success) return reply({ error: "too many requests, wait a minute" }, 429);
    if (env.LIMITER_ALL && !(await env.LIMITER_ALL.limit({ key: "all" })).success) return reply({ error: "busy, try again shortly" }, 429);

    // the session: cs_ cookies of this Worker, then X-Session on top (it is what a cookie-blocked page has)
    const session = new Map();
    for (const [k, v] of parseCookies(request.headers.get("Cookie"))) if (k.startsWith(COOKIE_PREFIX)) session.set(k.slice(COOKIE_PREFIX.length), v);
    for (const [k, v] of parseCookies(request.headers.get("X-Session"))) session.set(k, v);

    const upstream = (env.UPSTREAM || "https://www.schnap.com.au").replace(/\/$/, "");
    const target = new URL(upstream + path + url.search);
    const headers = new Headers();
    for (const h of FORWARD_HEADERS) if (request.headers.get(h)) headers.set(h, request.headers.get(h));
    headers.set("Referer", `${upstream}/`);
    if (session.size) headers.set("Cookie", serialize(session));

    let body;
    if (request.method === "POST") {
      body = await request.arrayBuffer();
      if (body.byteLength > MAX_BODY) return reply({ error: "too large" }, 413);
    }

    const dispatch = target.searchParams.get("dispatch") || "";
    const ttl = Number(env.CACHE_SECONDS || 0);
    const cacheable = ttl > 0 && request.method === "GET" && !session.size && !PRIVATE_DISPATCH.test(dispatch);
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request(target.toString() + (headers.get("x-requested-with") ? "#ajax" : ""), { method: "GET" });
    if (cacheable && cache) {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const res = new Response(hit.body, hit);
        for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
        res.headers.set("X-Cache", "HIT");
        return res;
      }
    }

    let res;
    try {
      res = await fetch(target, { method: request.method, headers, body, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      return reply({ error: `upstream: ${String(e?.message || e).slice(0, 200)}` }, 502);
    }

    const out = new Headers();
    for (const h of ["content-type", "content-language", "last-modified", "etag"]) if (res.headers.get(h)) out.set(h, res.headers.get(h));
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    let changed = false;
    for (const line of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const c = rewriteSetCookie(line);
      if (!c) continue;
      out.append("Set-Cookie", c.header);
      if (c.deleted) session.delete(c.name); else session.set(c.name, c.value);
      changed = true;
    }
    if (session.size) out.set("X-Session", serialize(session));
    const location = res.headers.get("Location");
    if (location) {
      const loc = new URL(location, target);
      out.set("Location", loc.origin === new URL(upstream).origin ? `${url.origin}/cscart${loc.pathname}${loc.search}${loc.hash}` : loc.toString());
    }
    out.set("Cache-Control", "no-store");

    if (cacheable && cache && res.status === 200 && !changed) {
      const [a, b] = res.body ? res.body.tee() : [null, null];
      const stored = new Response(b, { status: 200, headers: out });
      stored.headers.set("Cache-Control", `public, max-age=${ttl}`);
      stored.headers.delete("X-Session");
      ctx?.waitUntil?.(cache.put(cacheKey, stored));
      out.set("X-Cache", "MISS");
      return new Response(a, { status: res.status, headers: out });
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};
