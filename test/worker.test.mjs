// Tests worker/commerce.js: CORS, paths, the cs_ cookie session and X-Session, redirects, the edge cache. Run: node test/worker.test.mjs
import assert from "node:assert";
import worker, { upstreamPath, rewriteSetCookie } from "../worker/commerce.js";

const ORIGIN = "https://commerce.situs.id";
const env = { ALLOWED_ORIGINS: `${ORIGIN},http://localhost`, UPSTREAM: "https://www.schnap.com.au", CACHE_SECONDS: "60" };
const store = new Map();
globalThis.caches = { default: { match: async (r) => store.get(r.url)?.clone(), put: async (r, res) => void store.set(r.url, res) } };
const waits = [];
const ctx = { waitUntil: (p) => waits.push(p) };

const seen = [];
let next = () => Response.json({ text: "<div>ok</div>" });
globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), init }); return next(String(url), init); };

const call = (path, { origin = ORIGIN, method = "GET", headers = {}, body } = {}) =>
  worker.fetch(new Request("https://commerce-worker.situs.id" + path, { method, headers: { ...(origin ? { Origin: origin } : {}), "CF-Connecting-IP": "1.2.3.4", ...headers }, body }), env, ctx);

// paths
assert.strictEqual(upstreamPath("/api/index.php"), "/index.php");
assert.strictEqual(upstreamPath("/cscart/brands"), "/brands");
assert.strictEqual(upstreamPath("/api"), "/");
assert.strictEqual(upstreamPath("/api/admin.php"), null);
assert.strictEqual(upstreamPath("/api/vendor.php"), null);
assert.strictEqual(upstreamPath("/api/../x"), null);
assert.strictEqual(upstreamPath("/other"), null);

// a search is forwarded with its query, the ajax header, a SCHNAP referer, and no Origin or foreign cookie
let r = await call("/api/index.php?dispatch=products.search&q=rcbo&is_ajax=1", { headers: { "X-Requested-With": "XMLHttpRequest", Cookie: "auth_token=secret" } });
assert.strictEqual(r.status, 200);
assert.deepStrictEqual(await r.json(), { text: "<div>ok</div>" });
assert.strictEqual(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
assert.strictEqual(r.headers.get("Access-Control-Allow-Credentials"), "true");
assert.strictEqual(r.headers.get("X-Cache"), "MISS");
let up = seen.at(-1);
assert.strictEqual(up.url, "https://www.schnap.com.au/index.php?dispatch=products.search&q=rcbo&is_ajax=1");
assert.strictEqual(up.init.headers.get("x-requested-with"), "XMLHttpRequest");
assert.strictEqual(up.init.headers.get("referer"), "https://www.schnap.com.au/");
assert.strictEqual(up.init.headers.get("origin"), null);
assert.strictEqual(up.init.headers.get("cookie"), null);

// the same anonymous search again comes from the edge cache
await Promise.all(waits);
const before = seen.length;
r = await call("/api/index.php?dispatch=products.search&q=rcbo&is_ajax=1", { headers: { "X-Requested-With": "XMLHttpRequest" } });
assert.strictEqual(r.headers.get("X-Cache"), "HIT");
assert.strictEqual(seen.length, before);
assert.deepStrictEqual(await r.json(), { text: "<div>ok</div>" });

// add to cart: SCHNAP's session cookie comes back as a cs_ cookie and as X-Session; the redirect points at the Worker
next = () => new Response(null, { status: 302, headers: [
  ["Location", "https://www.schnap.com.au/index.php?dispatch=checkout.cart"],
  ["Set-Cookie", "sid_customer_abc=s1; expires=Fri, 01-Jan-2100 00:00:00 GMT; Max-Age=604800; path=/; domain=.schnap.com.au; secure; HttpOnly; SameSite=Lax"],
] });
r = await call("/api/index.php", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "dispatch%5Bcheckout.add%5D=1&product_data%5B1%5D%5Bamount%5D=2" });
assert.strictEqual(r.status, 302);
assert.strictEqual(r.headers.get("Location"), "https://commerce-worker.situs.id/cscart/index.php?dispatch=checkout.cart");
const cookie = r.headers.getSetCookie()[0];
assert.match(cookie, /^cs_sid_customer_abc=s1; /);
assert.match(cookie, /SameSite=None/);
assert.match(cookie, /Partitioned/);
assert.doesNotMatch(cookie, /domain=/i);
assert.strictEqual(r.headers.get("X-Session"), "sid_customer_abc=s1");
up = seen.at(-1);
assert.strictEqual(up.init.method, "POST");
assert.strictEqual(new TextDecoder().decode(up.init.body), "dispatch%5Bcheckout.add%5D=1&product_data%5B1%5D%5Bamount%5D=2");
assert.strictEqual(up.init.redirect, "manual");

// the cart with the cookie: forwarded without the prefix, never cached
next = () => Response.json({ text: "cart" });
r = await call("/cscart/index.php?dispatch=checkout.cart", { headers: { Cookie: "cs_sid_customer_abc=s1; other=x" } });
assert.strictEqual(seen.at(-1).init.headers.get("cookie"), "sid_customer_abc=s1");
assert.strictEqual(r.headers.get("X-Cache"), null);
// a catalog GET with a session is not cached either (prices can depend on the customer)
r = await call("/api/index.php?dispatch=products.view&product_id=1", { headers: { "X-Session": "sid_customer_abc=s1" } });
assert.strictEqual(seen.at(-1).init.headers.get("cookie"), "sid_customer_abc=s1");
assert.strictEqual(r.headers.get("X-Cache"), null);

// a deleted cookie leaves the session
next = () => new Response("bye", { headers: { "Set-Cookie": "sid_customer_abc=deleted; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/" } });
r = await call("/api/index.php?dispatch=auth.logout", { headers: { "X-Session": "sid_customer_abc=s1; x=y" } });
assert.strictEqual(r.headers.get("X-Session"), "x=y");
assert.strictEqual(rewriteSetCookie("a=b; Max-Age=0").deleted, true);

// CORS: localhost with a port is allowed, other sites are not; a navigation without Origin is allowed
assert.strictEqual((await call("/api/index.php", { origin: "http://localhost:5173" })).status, 200);
assert.strictEqual((await call("/api/index.php", { origin: "https://evil.example" })).status, 403);
assert.strictEqual((await call("/api/index.php", { origin: null })).status, 200);
assert.strictEqual((await call("/api/index.php", { method: "OPTIONS" })).status, 204);
assert.strictEqual((await call("/api/index.php", { method: "OPTIONS", origin: "https://evil.example" })).status, 403);

// methods, paths, size, health, rate limits, upstream failure
assert.strictEqual((await call("/api/index.php", { method: "PUT", body: "x" })).status, 405);
assert.strictEqual((await call("/api/admin.php")).status, 404);
assert.strictEqual((await call("/api/index.php", { method: "POST", body: "x".repeat(200_001) })).status, 413);
assert.deepStrictEqual(await (await call("/health")).json(), { ok: true });
const limited = await worker.fetch(new Request("https://w/api/index.php", { headers: { Origin: ORIGIN } }), { ...env, LIMITER: { limit: async () => ({ success: false }) } }, ctx);
assert.strictEqual(limited.status, 429);
next = () => { throw new Error("connect timeout"); };
r = await call("/api/index.php?dispatch=checkout.cart");
assert.strictEqual(r.status, 502);

console.log("commerce worker: all tests passed");
