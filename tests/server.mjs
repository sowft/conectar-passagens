import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const nodeRequire = createRequire(import.meta.url);

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const customRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts", mocks);
    return nodeRequire(name);
  };
  const wrapper = vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename });
  wrapper(customRequire, mod, mod.exports);
  return mod.exports;
}
const valid = { nome: "Ana", telefone: "27999999999", origem: "Vitoria", destino: "Rio", data_viagem: "2027-01-20", consentimento: true };
function intake(state = {}) {
  return load("lib/intake.ts", { "@/lib/server-db": { database: () => ({ from: table => {
    if (table === "campaigns") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.campaign ?? null, error: null }) }) }) };
    return { insert: async record => { state.record = record; return { error: state.error ?? null }; } };
  } }) } }).captureLead;
}
test("public capture validates consent before touching database", async () => {
  const state = {}; assert.equal((await intake(state)({ ...valid, consentimento: false })).status, 400); assert.equal(state.record, undefined);
});
test("rejects invalid dates and phone numbers", async () => {
  for (const change of [{ data_viagem: "2027-02-30" }, { telefone: "123" }, { campaign_id: "invalid" }]) assert.equal((await intake()({ ...valid, ...change })).status, 400);
});
test("paused or missing campaigns cannot collect leads", async () => {
  for (const campaign of [null, { status: "pausada" }]) {
    const state = { campaign }; assert.equal((await intake(state)({ ...valid, campaign_id: "12345678-1234-1234-1234-123456789abc" })).status, 409); assert.equal(state.record, undefined);
  }
});
test("capture preserves campaign, forces new status and timestamps authorization", async () => {
  const state = { campaign: { status: "ativa" } }; const id = "12345678-1234-1234-1234-123456789abc";
  const response = await intake(state)({ ...valid, campaign_id: id, status: "convertido", fonte: "Google" });
  assert.equal(response.status, 201); assert.equal(state.record.campaign_id, id); assert.equal(state.record.status, "novo"); assert.ok(state.record.consentimento_em); assert.deepEqual(await response.json(), { ok: true });
});
test("database failure does not report success", async () => { assert.equal((await intake({ error: new Error("db") })(valid)).status, 503); });
test("signed sessions reject forged and expired cookies", async () => {
  process.env.SESSION_SECRET = "a".repeat(64); let token = "1";
  const session = load("lib/session.ts", { "next/headers": { cookies: async () => ({ get: () => ({ value: token }) }) } });
  assert.equal(await session.isAuthenticated(), false);
  const cookie = session.sessionCookie(true); token = cookie.split(";")[0].slice("conectar_admin=".length); assert.equal(await session.isAuthenticated(), true);
  token = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"); assert.equal(await session.isAuthenticated(), false);
  token = "1." + "a".repeat(64); assert.equal(await session.isAuthenticated(), false);
});
test("campaign endpoints deny unauthenticated access", async () => {
  const route = load("app/api/campaigns/route.ts", { "@/lib/session": { isAuthenticated: async () => false }, "@/lib/server-db": { database: () => { throw new Error("must not access"); } } });
  for (const method of ["GET", "POST", "PATCH"]) assert.equal((await route[method](new Request("http://localhost"))).status, 401);
});
test("webhook requires configured secret and correct bearer token", async () => {
  const route = load("app/api/integrations/leads/route.ts", { "@/lib/intake": { captureLead: async () => Response.json({ ok: true }, { status: 201 }) } });
  delete process.env.LEAD_INGEST_TOKEN; assert.equal((await route.POST(new Request("http://localhost"))).status, 503);
  process.env.LEAD_INGEST_TOKEN = "t".repeat(32); assert.equal((await route.POST(new Request("http://localhost"))).status, 401);
  const request = new Request("http://localhost", { method: "POST", headers: { authorization: `Bearer ${process.env.LEAD_INGEST_TOKEN}` }, body: "{}" }); assert.equal((await route.POST(request)).status, 201);
});
test("Google search requires authentication and configuration", async () => {
  let auth = false; const route = load("app/api/companies/route.ts", { "@/lib/session": { isAuthenticated: async () => auth } });
  const request = () => new Request("http://localhost", { method: "POST", body: JSON.stringify({ segmento: "empresas", regiao: "Vitoria" }) });
  assert.equal((await route.POST(request())).status, 401); auth = true; delete process.env.GOOGLE_PLACES_API_KEY; assert.equal((await route.POST(request())).status, 503);
});
test("Google search forwards bounded query without caching and handles provider errors", async () => {
  const route = load("app/api/companies/route.ts", { "@/lib/session": { isAuthenticated: async () => true } });
  process.env.GOOGLE_PLACES_API_KEY = "test"; const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options) => { assert.equal(url, "https://places.googleapis.com/v1/places:searchText"); assert.equal(options.cache, "no-store"); assert.equal(JSON.parse(options.body).pageSize, 10); return Response.json({ places: [{ id: "1" }] }); };
    const request = () => new Request("http://localhost", { method: "POST", body: JSON.stringify({ segmento: "empresas", regiao: "Vitoria" }) });
    const response = await route.POST(request()); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    global.fetch = async () => new Response("quota", { status: 429 }); assert.equal((await route.POST(request())).status, 502);
  } finally { global.fetch = originalFetch; }
});

const campaignId = "12345678-1234-1234-1234-123456789abc";
const visitId = "22345678-1234-1234-1234-123456789abc";
function attributionToken(change = {}) {
  process.env.SESSION_SECRET = "s".repeat(64);
  return load("lib/attribution.ts").signAttribution({ visit_id: visitId, campaign_id: campaignId, fonte: "WhatsApp", expires: Date.now() + 60000, ...change });
}

test("attribution rejects tampering, expiration and tokens from another domain of signing", () => {
  const { readAttribution } = load("lib/attribution.ts");
  const token = attributionToken();
  assert.equal(readAttribution(token).visit_id, visitId);
  assert.equal(readAttribution(token + ".extra"), null);
  assert.equal(readAttribution(attributionToken({ expires: Date.now() - 1 })), null);
  assert.equal(readAttribution(attributionToken({ visit_id: "wrong" })), null);
  const [payload] = token.split(".");
  const { createHmac } = nodeRequire("node:crypto");
  const sessionSignature = createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("hex");
  assert.equal(readAttribution(`${payload}.${sessionSignature}`), null);
});

test("tracked capture derives campaign and channel from signed attribution", async () => {
  const state = { campaign: { status: "ativa" } };
  const response = await intake(state)({ ...valid, attribution_token: attributionToken(), campaign_id: "invalid", fonte: "forged" });
  assert.equal(response.status, 201);
  assert.equal(state.record.campaign_id, campaignId);
  assert.equal(state.record.visit_id, visitId);
  assert.equal(state.record.fonte, "WhatsApp");
  const rejected = {};
  assert.equal((await intake(rejected)({ ...valid, attribution_token: "bad" })).status, 400);
  assert.equal(rejected.record, undefined);
});

function campaignEntry(state = {}) {
  return load("app/r/[id]/route.ts", { "@/lib/server-db": { database: () => ({ from: table => {
    if (table === "campaigns") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.campaign === undefined ? { status: "ativa", canais: ["WhatsApp"] } : state.campaign, error: null }) }) }) };
    return { insert: async record => { state.record = record; return { error: state.error }; } };
  } }) } });
}

test("campaign entry records an access and redirects with signed attribution", async () => {
  process.env.SESSION_SECRET = "s".repeat(64);
  const state = {};
  const response = await campaignEntry(state).GET(new Request(`https://example.com/r/${campaignId}?fonte=WhatsApp`), { params: Promise.resolve({ id: campaignId }) });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const target = new URL(response.headers.get("location"));
  assert.equal(target.pathname, "/captacao");
  assert.equal(load("lib/attribution.ts").readAttribution(target.searchParams.get("v")).visit_id, state.record.id);
  assert.equal(state.record.campaign_id, campaignId);
});

test("paused campaigns, invalid channels and persistence failure cannot produce tracked links", async () => {
  const request = () => new Request(`https://example.com/r/${campaignId}?fonte=WhatsApp`);
  const context = { params: Promise.resolve({ id: campaignId }) };
  const paused = { campaign: { status: "pausada", canais: ["WhatsApp"] } };
  assert.equal((await campaignEntry(paused).GET(request(), context)).status, 410);
  assert.equal(paused.record, undefined);
  const wrong = { campaign: { status: "ativa", canais: ["Instagram"] } };
  assert.equal((await campaignEntry(wrong).GET(request(), context)).status, 400);
  assert.equal(wrong.record, undefined);
  assert.equal((await campaignEntry({ error: new Error("db") }).GET(request(), context)).status, 503);
  assert.equal((await campaignEntry().HEAD()).status, 200);
});

test("purchase forwarding uses fixed destination and deduplicates by visit without changing sale status", async () => {
  const state = {};
  const route = load("app/comprar/route.ts", { "@/lib/server-db": { database: () => ({ from: table => {
    assert.equal(table, "purchase_clicks");
    return { upsert: async (record, options) => { state.record = record; state.options = options; return { error: state.error }; } };
  } }) } });
  const request = token => { const form = new FormData(); form.set("v", token); return new Request("https://example.com/comprar?url=https://evil.test", { method: "POST", body: form }); };
  const token = attributionToken();
  const response = await route.POST(request(token));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://www.clickbus.com.br/viacao/itapemirim");
  assert.deepEqual(state.record, { visit_id: visitId });
  assert.deepEqual(state.options, { onConflict: "visit_id", ignoreDuplicates: true });
  assert.equal((await route.POST(request("forged"))).status, 400);
  state.error = new Error("db");
  assert.equal((await route.POST(request(token))).status, 503);
  assert.equal((await route.POST(request(""))).status, 303);
});

test("operations and campaign metrics require authentication", async () => {
  const mocks = { "@/lib/session": { isAuthenticated: async () => false }, "@/lib/server-db": { database: () => { throw new Error("no database access permitted"); } } };
  for (const file of ["app/api/operation/route.ts", "app/api/campaigns/metrics/route.ts"]) assert.equal((await load(file, mocks).GET()).status, 401);
});

test("local setup rejects production, non-loopback and cross-origin requests", () => {
  const previous = process.env.NODE_ENV;
  try {
    const { localSetupAllowed } = load("lib/local-setup.ts");
    const request = (url = "http://127.0.0.1:3000/api/setup", origin = "http://127.0.0.1:3000", host = "127.0.0.1:3000") => new Request(url, { method: "POST", headers: { host, origin, "content-type": "application/json" } });
    process.env.NODE_ENV = "development";
    assert.equal(localSetupAllowed(request()), true);
    assert.equal(localSetupAllowed(request(undefined, "https://evil.test")), false);
    assert.equal(localSetupAllowed(request("http://evil.test/api/setup", "http://evil.test", "evil.test")), false);
    assert.equal(localSetupAllowed(request(undefined, undefined, "evil.test:3000")), false);
    assert.equal(localSetupAllowed(request("http://localhost:3000/api/setup")), true);
    process.env.NODE_ENV = "production";
    assert.equal(localSetupAllowed(request()), false);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test("local setup stores only a password hash, preserves configuration and cannot overwrite an admin", async () => {
  const previous = { password: process.env.ADMIN_PASSWORD, hash: process.env.ADMIN_PASSWORD_HASH, secret: process.env.SESSION_SECRET };
  const state = { content: "OTHER_SETTING=preserved\n", writes: new Map() };
  const setup = load("lib/local-setup.ts", { "node:fs/promises": {
    readFile: async () => state.content, mkdir: async () => {}, open: async () => ({ close: async () => {} }),
    writeFile: async (file, content) => state.writes.set(file, content),
    rename: async from => { state.content = state.writes.get(from); }, unlink: async () => {},
  } });
  try {
    delete process.env.ADMIN_PASSWORD; delete process.env.ADMIN_PASSWORD_HASH; delete process.env.SESSION_SECRET;
    await assert.rejects(() => setup.configureLocalAdmin("short"), /PASSWORD_LENGTH/);
    await setup.configureLocalAdmin("local-test-password");
    assert.match(state.content, /OTHER_SETTING=preserved/);
    assert.match(state.content, /ADMIN_PASSWORD_HASH=scrypt:/);
    assert.equal(state.content.includes("local-test-password"), false);
    assert.equal(process.env.SESSION_SECRET.length, 64);
    const { verifyAdminPassword } = load("lib/admin-password.ts");
    assert.equal(verifyAdminPassword("local-test-password"), true);
    assert.equal(verifyAdminPassword("wrong-password"), false);
    await assert.rejects(() => setup.configureLocalAdmin("different-password"), /ALREADY_CONFIGURED/);
    delete process.env.ADMIN_PASSWORD_HASH;
    assert.equal(await setup.setupAvailable(), false);
  } finally {
    for (const [key, value] of [["ADMIN_PASSWORD", previous.password], ["ADMIN_PASSWORD_HASH", previous.hash], ["SESSION_SECRET", previous.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("admin login can access the panel without a configured cloud database", async () => {
  const previous = { password: process.env.ADMIN_PASSWORD, hash: process.env.ADMIN_PASSWORD_HASH, secret: process.env.SESSION_SECRET, key: process.env.SUPABASE_SECRET_KEY, role: process.env.SUPABASE_SERVICE_ROLE_KEY };
  try {
    process.env.ADMIN_PASSWORD_HASH = load("lib/admin-password.ts").encodeAdminPassword("local-test-password");
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SESSION_SECRET = "s".repeat(64);
    const route = load("app/api/auth/login/route.ts", {
      "@/lib/session": { sessionCookie: () => "test-cookie" },
      "@/lib/server-db": { database: () => { throw new Error("must not access cloud database"); } },
    });
    const request = (password, email) => new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ password, email }) });
    assert.equal((await route.POST(request("local-test-password"))).status, 200);
    assert.equal((await route.POST(request("local-test-password", "autofill@example.com"))).status, 200);
    assert.equal((await route.POST(request("local-test-password", "   "))).status, 200);
    assert.equal((await route.POST(request("wrong-password"))).status, 401);
    assert.equal((await route.POST(request("wrong-password", "autofill@example.com"))).status, 401);
  } finally {
    for (const [key, value] of [["ADMIN_PASSWORD", previous.password], ["ADMIN_PASSWORD_HASH", previous.hash], ["SESSION_SECRET", previous.secret], ["SUPABASE_SECRET_KEY", previous.key], ["SUPABASE_SERVICE_ROLE_KEY", previous.role]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("recovery is unavailable without setup and blocks cross-origin requests", async () => {
  const previous = process.env.ADMIN_RECOVERY_EMAIL;
  try {
    delete process.env.ADMIN_RECOVERY_EMAIL;
    const route = load("app/api/auth/recover/route.ts");
    assert.deepEqual(await (await route.GET()).json(), { available: false });
    const request = origin => new Request("https://app.example/api/auth/recover", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com" }) });
    assert.equal((await route.POST(request("https://evil.example"))).status, 403);
    assert.equal((await route.POST(request("https://app.example"))).status, 503);
  } finally { if (previous === undefined) delete process.env.ADMIN_RECOVERY_EMAIL; else process.env.ADMIN_RECOVERY_EMAIL = previous; }
});

test("recovery sends only to the administrator, persists only token digests and enforces expiry and single use", async () => {
  const keys = ["ADMIN_RECOVERY_EMAIL", "PUBLIC_APP_URL", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const state = { pending: null, sent: [], lastRequest: 0 };
  const db = {
    rpc: async (name, args) => {
      if (name === "request_admin_recovery") {
        if (Date.now() - state.lastRequest < 60000) return { data: false, error: null };
        state.lastRequest = Date.now(); state.pending = { digest: args.p_token_hash, expires: Date.now() + 1800000 };
        return { data: true, error: null };
      }
      if (!state.pending || state.pending.digest !== args.p_token_hash || state.pending.expires <= Date.now()) return { data: false, error: null };
      state.password = args.p_password_hash; state.pending = null;
      return { data: true, error: null };
    },
    from: () => {
      const filters = {};
      const query = { select: () => query, eq: (key, value) => { filters[key] = value; return query; }, gt: () => query,
        maybeSingle: async () => ({ data: state.pending?.digest === filters.token_hash && state.pending.expires > Date.now() ? { id: "admin" } : null, error: null }) };
      return query;
    },
  };
  try {
    Object.assign(process.env, { ADMIN_RECOVERY_EMAIL: "admin@example.com", PUBLIC_APP_URL: "https://app.example", RESEND_API_KEY: "test", RESEND_FROM_EMAIL: "Conectar <test@example.com>", NEXT_PUBLIC_SUPABASE_URL: "https://db.example", SUPABASE_SECRET_KEY: "test" });
    global.fetch = async (url, options) => { assert.equal(url, "https://api.resend.com/emails"); state.sent.push(JSON.parse(options.body)); return Response.json({ id: "sent" }); };
    const recovery = load("lib/password-recovery.ts", { "@/lib/server-db": { database: () => db } });
    await recovery.requestPasswordRecovery("unknown@example.com"); assert.equal(state.sent.length, 0);
    await recovery.requestPasswordRecovery(" ADMIN@example.com "); assert.equal(state.sent.length, 1);
    assert.deepEqual(state.sent[0].to, ["admin@example.com"]);
    const link = new URL(state.sent[0].text.match(/https:\/\/[^\s]+/)[0]);
    assert.equal(link.origin, "https://app.example"); assert.equal(link.search, "");
    const token = new URLSearchParams(link.hash.slice(1)).get("token");
    assert.match(token, /^[a-f0-9]{64}$/); assert.notEqual(state.pending.digest, token);
    assert.equal(state.pending.digest, recovery.digestRecoveryToken(token));
    await recovery.requestPasswordRecovery("admin@example.com"); assert.equal(state.sent.length, 1);
    assert.equal(await recovery.resetAdminPassword("0".repeat(64), "new-test-password"), false);
    state.pending.expires = Date.now() - 1;
    assert.equal(await recovery.resetAdminPassword(token, "new-test-password"), false);
    state.pending.expires = Date.now() + 60000;
    const results = await Promise.all([recovery.resetAdminPassword(token, "new-test-password"), recovery.resetAdminPassword(token, "second-test-password")]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.match(state.password, /^scrypt:/); assert.equal(state.password.includes("new-test-password"), false);
    assert.equal(await recovery.resetAdminPassword(token, "new-test-password"), false);
  } finally {
    global.fetch = originalFetch;
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});

test("reset password validates origin and strength before touching recovery state", async () => {
  let calls = 0;
  const route = load("app/api/auth/reset/route.ts", { "@/lib/password-recovery": {
    sameOriginJson: request => request.headers.get("origin") === "https://app.example",
    resetAdminPassword: async () => { calls++; return true; },
  } });
  const request = (origin, password, token = "a".repeat(64)) => new Request("https://app.example/api/auth/reset", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
  assert.equal((await route.POST(request("https://evil.example", "new-test-password"))).status, 403);
  assert.equal((await route.POST(request("https://app.example", "short"))).status, 400);
  assert.equal((await route.POST(request("https://app.example", "new-test-password", "bad"))).status, 400);
  assert.equal(calls, 0);
  const response = await route.POST(request("https://app.example", "new-test-password"));
  assert.equal(response.status, 200); assert.match(response.headers.get("set-cookie"), /Max-Age=0/); assert.equal(calls, 1);
});

test("reset invalidates old sessions and old environment passwords, even during database failure", async () => {
  const previous = { email: process.env.ADMIN_RECOVERY_EMAIL, password: process.env.ADMIN_PASSWORD, hash: process.env.ADMIN_PASSWORD_HASH, secret: process.env.SESSION_SECRET };
  let token = "", current = null, unavailable = false;
  const version = "12345678-1234-1234-1234-123456789abc";
  try {
    process.env.ADMIN_RECOVERY_EMAIL = "admin@example.com"; process.env.ADMIN_PASSWORD = "old-test-password"; delete process.env.ADMIN_PASSWORD_HASH; process.env.SESSION_SECRET = "s".repeat(64);
    const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: current, error: unavailable ? new Error("db") : null }) }) }) }) };
    const access = load("lib/admin-access.ts", { "@/lib/server-db": { database: () => db } });
    assert.equal((await access.verifyCurrentAdminPassword("old-test-password")).valid, true);
    const session = load("lib/session.ts", { "@/lib/admin-access": access, "next/headers": { cookies: async () => ({ get: () => ({ value: token }) }) } });
    token = session.sessionCookie(true).split(";")[0].slice("conectar_admin=".length);
    assert.equal(await session.isAuthenticated(), true);
    current = { password_hash: load("lib/admin-password.ts").encodeAdminPassword("new-test-password"), version };
    assert.equal(await session.isAuthenticated(), false);
    assert.equal((await access.verifyCurrentAdminPassword("old-test-password")).valid, false);
    assert.deepEqual(await access.verifyCurrentAdminPassword("new-test-password"), { valid: true, version });
    token = session.sessionCookie(true, version).split(";")[0].slice("conectar_admin=".length);
    assert.equal(await session.isAuthenticated(), true);
    token += ".extra"; assert.equal(await session.isAuthenticated(), false);
    unavailable = true;
    await assert.rejects(() => access.verifyCurrentAdminPassword("old-test-password"), /ADMIN_ACCESS_UNAVAILABLE/);
    assert.equal(await session.isAuthenticated(), false);
  } finally {
    for (const [key, value] of [["ADMIN_RECOVERY_EMAIL", previous.email], ["ADMIN_PASSWORD", previous.password], ["ADMIN_PASSWORD_HASH", previous.hash], ["SESSION_SECRET", previous.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
