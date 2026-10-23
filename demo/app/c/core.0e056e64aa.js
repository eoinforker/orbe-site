var __o = (function () {
  "use strict";
  var defs = {}, cache = {}, chunks = {}, manifest = {"js/admin/campaign.js":["shared.5d3179cc4c.js","admin-campaign.d340631411.js"],"js/admin/desk.js":["shared.5d3179cc4c.js","admin-desk.2fc5ef2c9a.js"],"js/app-settings.js":["app-settings.7c4f6b82fc.js"],"js/brand/bookings.js":["shared.5d3179cc4c.js","brand-bookings.cf95387a8e.js"],"js/brand/campaign.js":["shared.5d3179cc4c.js","brand-campaign.cdba2cf047.js"],"js/brand/campaigns.js":["shared.5d3179cc4c.js"],"js/brand/discover.js":["brand-discover.d8529ac889.js"],"js/brand/home.js":["shared.5d3179cc4c.js","brand-home.b486549c6c.js"],"js/brand/intel.js":["brand-intel.7dd360cec9.js"],"js/brand/keys.js":["brand-keys.2fa1bf3a40.js"],"js/brand/profile.js":["brand-profile.4c7979b1ce.js"],"js/brand/reads.js":["shared.5d3179cc4c.js","brand-reads.6ef85cfb02.js"],"js/brand/roster-handoff.js":["shared.5d3179cc4c.js","brand-roster.e406a1a4e1.js"],"js/brand/roster.js":["shared.5d3179cc4c.js","brand-roster.e406a1a4e1.js"],"js/creator/confirm.js":["creator-confirm.d95a176ae9.js"],"js/connect-inline.js":["creator-connect.e6e115989a.js"],"js/creator/connect.js":["creator-connect.e6e115989a.js"],"js/creator/fix.js":["creator-fix.bd2ea362b3.js"],"js/band.js":["creator-home.362e449899.js"],"js/composer.js":["creator-home.362e449899.js"],"js/creator/home.js":["creator-home.362e449899.js"],"js/sky.js":["creator-home.362e449899.js"],"js/creator/library.js":["creator-library.b7933a126d.js"],"js/table.js":["creator-library.b7933a126d.js"],"js/creator/media.js":["creator-media.a36d438104.js"],"js/creator/plan.js":["creator-plan.1cd02d66e6.js"],"js/creator/record.js":["creator-record.d61af5e3ea.js"],"js/creator/report.js":["creator-report.fe91602ba8.js"],"js/creator/sell.js":["creator-sell.070ab1dbb4.js"],"js/creator/deals.js":["shared.5d3179cc4c.js","creator-sponsorships.9cf9e2b12f.js"],"js/creator/sponsorships.js":["shared.5d3179cc4c.js","creator-sponsorships.9cf9e2b12f.js"],"js/creator/start.js":["creator-start.0a6b4a7d2d.js"],"js/creator/studio.js":["creator-studio.63975d2591.js"],"js/creator/retention.js":["creator-work.df470c25ae.js"],"js/creator/work.js":["creator-work.df470c25ae.js"],"js/explore.js":["explore.080b0fa721.js"],"js/integrations.js":["integrations.51c9e876a8.js"],"js/invite.js":["invite.ced9bc9fa4.js"],"js/metrics.js":["metrics.0aee7bed30.js"],"js/settings.js":["settings.b3b27a7578.js"],"js/sharing.js":["sharing.8b1406c8dd.js"],"js/signin.js":["signin.8aaf4ce2ff.js"],"js/team.js":["team.bfabe426a4.js"],"js/tools/developers.js":["tools-developers.9ffbf1bb38.js"],"js/tools/offer.js":["tools-offer.fef881e030.js"],"js/tools/protect.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/audio.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/audiosynth.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/compare.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/image.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/index.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/registry.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/synth.js":["tools-protect.ff714d50f2.js"],"site/engine/protect/video.js":["tools-protect.ff714d50f2.js"],"js/tools/rate.js":["tools-rate.5b73c75bea.js"],"js/tour.js":["tour.08839fce90.js"],"js/welcome.js":["welcome.210ee4b18c.js"],"js/deal.js":["shared.5d3179cc4c.js"]}, base = "/orbe-site/demo/app/c/";
  function d(id, fn) { if (!defs[id]) defs[id] = fn; }
  function r(id) {
    var x = cache[id];
    if (x) return x;
    var fn = defs[id];
    if (!fn) throw new Error("Orbe could not find " + id);
    x = cache[id] = {};
    fn(x);
    return x;
  }
  function e(x, getters) {
    for (var k in getters) Object.defineProperty(x, k, { enumerable: true, get: getters[k] });
  }
  function load(file) {
    if (!chunks[file]) chunks[file] = new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = base + file;
      s.onload = function () { ok(); };
      s.onerror = function () {
        delete chunks[file];
        // A deploy replaced the chunk this page knew about: load the new page once.
        var key = "orbe.reloaded";
        var t = 0;
        try { t = Number(sessionStorage.getItem(key)) || 0; } catch (err) {}
        if (Date.now() - t > 60000) {
          try { sessionStorage.setItem(key, String(Date.now())); } catch (err) {}
          location.reload();
        }
        no(new Error("Orbe could not load part of the app. Check the connection and try again."));
      };
      document.head.appendChild(s);
    });
    return chunks[file];
  }
  function resolve(from, spec) {
    var parts = from.split("/"); parts.pop();
    spec.split("/").forEach(function (p) { if (p === "..") parts.pop(); else if (p !== ".") parts.push(p); });
    return parts.join("/");
  }
  function i(from, spec) {
    var id = resolve(from, spec);
    if (defs[id]) return Promise.resolve().then(function () { return r(id); });
    var need = manifest[id];
    if (!need) return Promise.reject(new Error("Orbe could not find " + id));
    return Promise.all(need.map(load)).then(function () { return r(id); });
  }
  function css(href) {
    return new Promise(function (ok) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      // The screen waits for its styles; if they cannot load, it shows anyway rather than not at all.
      var done = false, finish = function () { if (!done) { done = true; ok(); } };
      l.onload = finish;
      l.onerror = finish;
      setTimeout(finish, 8000);
      document.head.appendChild(l);
    });
  }
  return { d: d, r: r, e: e, i: i, load: load, css: css };
})();
__o.d("js/api.js", function (__x) {
"use strict";
__o.e(__x, { features: () => features, on: () => on, canRateChannels: () => canRateChannels, notHere: () => notHere, signInWays: () => signInWays, ApiError: () => ApiError, SentToOwner: () => SentToOwner, forget: () => forget, notBuiltYet: () => notBuiltYet, session: () => session, boot: () => boot, bundle: () => bundle, currentTeam: () => currentTeam, can: () => can, asks: () => asks, api: () => api, apiHref: () => apiHref, seg: () => seg });
const { roleCan } = __o.r("js/routes.js");

let csrf = null;

const features = new Set();
const on = (feature) => features.has(feature);

let ratesChannels = true;
const canRateChannels = () => ratesChannels;

const notHere = (t) => t?.path === "rate" && !ratesChannels;

let ways = { google: false, email: true, dev: false };
const signInWays = () => ways;
class ApiError extends Error {
constructor(status, code, message, details, requestId) {
super(message);
this.name = "ApiError";
this.status = status;
this.code = code;
this.details = details;
this.requestId = requestId;
}
}

class SentToOwner extends ApiError {
constructor(body) {
super(202, "sent_to_owner", "Sent to the owner to approve. Nothing has happened yet.");
this.approval = body?.approval ?? null;
}
}

const KEEP_MS = 10_000;
const kept = new Map();
const inflight = new Map();
const keep = (path, promise) => {

promise.catch(() => {});
kept.set(path, { at: Date.now(), promise });
};

function forget() {
kept.clear();
}

const asAnswer = (part) => (part.error ? Promise.reject(new ApiError(part.status, part.error.code, part.error.message, part.error.details)) : Promise.resolve(part.body));
function prime(parts) {
for (const [path, part] of Object.entries(parts ?? {})) keep(path, asAnswer(part));
}
function read(path) {
const k = kept.get(path);
if (k && Date.now() - k.at < KEEP_MS) return k.promise;
if (k) kept.delete(path);
let p = inflight.get(path);
if (!p) {
p = send("GET", path).finally(() => inflight.delete(path));
inflight.set(path, p);
}
return p;
}

const UNTEAMED = /^\/v1\/(boot(?!\?.*frame=0)|auth\/|teams\/active|teams\/invitations\/accept)/;

const notBuiltYet = (e) => e instanceof ApiError && e.status === 404 && e.code === "not_found";
async function send(method, path, body, retried, file, raw) {
const headers = { accept: "application/json" };
if (file) Object.assign(headers, { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, file.range ? { "content-range": file.range } : {});
else if (body !== undefined) headers["content-type"] = "application/json";
if (method !== "GET" && csrf) headers["x-csrf-token"] = csrf;

if (team && !UNTEAMED.test(path)) headers["x-orbe-team"] = team.id;
let res;
try {
res = await fetch(path, { method, headers, credentials: "same-origin", body: file ? file.blob : body === undefined ? undefined : JSON.stringify(body) });
} catch {
throw new ApiError(0, "network", "Orbe could not be reached. Check your connection and try again.");
}
const type = res.headers.get("content-type") ?? "";

if (method !== "GET") {
forget();
bundled.clear();
}

if (raw && res.ok) return res;
const data = res.status === 204 ? null : type.includes("application/json") ? await res.json().catch(() => null) : await res.text();

if (res.status === 202 && data?.waitingFor === "owner") {
window.dispatchEvent(new CustomEvent("orbe:sent-to-owner", { detail: data }));
throw new SentToOwner(data);
}
if (res.ok) return data;
const err = data && typeof data === "object" && data.error ? data.error : null;
const e = new ApiError(res.status, err?.code ?? "error", err?.message ?? `Something went wrong (${res.status}). Try again.`, err?.details, err?.requestId ?? res.headers.get("x-request-id"));

if (e.code === "csrf_failed" && !retried) {
await session();
return send(method, path, body, true, file, raw);
}
if (e.status === 401) {
forget();
window.dispatchEvent(new CustomEvent("orbe:signed-out"));
}

if (e.code === "team_changed") {
forget();
window.dispatchEvent(new CustomEvent("orbe:team-changed"));
}
throw e;
}

async function session() {
return apply(await send("GET", "/v1/auth/session", undefined, true));
}

const BUNDLED = new Set();
const bundled = new Map();

async function boot(screen) {
const b = await send("GET", screen ? `/v1/boot?screen=${encodeURIComponent(screen)}` : "/v1/boot", undefined, true);
forget();
bundled.clear();
BUNDLED.clear();
for (const s of b?.screens ?? []) BUNDLED.add(s);
prime(b?.parts);
if (BUNDLED.has(screen)) bundled.set(screen, Date.now());
return apply(b?.session);
}

async function bundle(screen) {
if (!BUNDLED.has(screen)) return;
const at = bundled.get(screen);
if (at && Date.now() - at < KEEP_MS) return;
const b = await read(`/v1/boot?screen=${encodeURIComponent(screen)}&frame=0`).catch(() => null);
if (!b) return;
prime(b.parts);
bundled.set(screen, Date.now());
}
function apply(s) {
csrf = s?.csrfToken ?? null;
features.clear();
for (const f of s?.features ?? []) features.add(f);
ratesChannels = s?.ratesChannels !== false;
if (s?.signIn) ways = s.signIn;
team = s?.team ?? null;
if (!s?.user) return null;

return team ? { ...s.user, type: team.account.type, person: s.user, team } : s.user;
}

let team = null;
const currentTeam = () => team;

const can = (action) => roleCan(team?.role, action);

const asks = (action) => team?.role === "manager" && ["money", "consent", "rights"].includes(action);
const api = {
get: (path) => read(path),

warm: (path) => {
const k = kept.get(path);
if (k && Date.now() - k.at < KEEP_MS) return k.promise;
const p = read(path);
keep(path, p);
return p;
},

fresh: (path) => {
kept.delete(path);
return read(path);
},

post: (path, body = {}, opts) => send("POST", path, body, false, undefined, opts?.file === true),
put: (path, body = {}) => send("PUT", path, body),
patch: (path, body = {}) => send("PATCH", path, body),
del: (path, body) => send("DELETE", path, body),

upload: (path, blob, type, name) => send("POST", path, undefined, false, { blob, type, name }),

chunk: (path, blob, start, total) => send("PUT", path, undefined, false, { blob, type: "application/octet-stream", name: "chunk", range: `bytes ${start}-${start + blob.size - 1}/${total}` }),
};

const apiHref = (path) => (window.orbeDemo ? window.orbeDemo.href(path) : path);

const seg = (s) => encodeURIComponent(String(s));
});
__o.d("js/cards.js", function (__x) {
"use strict";
__o.e(__x, { table: () => table, twoLine: () => twoLine, kv: () => kv, status: () => status, narrow: () => narrow, picks: () => picks, choice: () => choice, button: () => button });
const { pill } = __o.r("js/console-ui.js");
const { action, h } = __o.r("js/ui.js");


function table(heads, rows, opts = {}) {
const num = heads.map(([, kind]) => kind === "num");
return h("div", { class: "dl-wrap" },
h("table", { class: `dl-table cn-dt${opts.cls ? ` ${opts.cls}` : ""}` },
opts.caption ? h("caption", { class: "ob-sr" }, opts.caption) : null,
h("thead", null, h("tr", null, heads.map(([label], i) => h("th", { scope: "col", class: num[i] ? "dl-num" : null }, label)))),
h("tbody", null, rows.filter(Boolean).map((r) => {

const { cells, cls = null, skip = 0 } = Array.isArray(r) ? { cells: r } : r;

return h("tr", { class: [cls, skip ? "cn-tr-cont" : null].filter(Boolean).join(" ") || null },
cells.map((c, i) => (c instanceof HTMLTableCellElement ? c : h("td", { class: num[i + skip] ? "dl-num" : null, "data-label": heads[i + skip]?.[0] ?? "" }, h("span", { class: "cn-dt-v" }, c)))));
})),
),
);
}

const twoLine = (main, sub) => h("span", { class: "cn-two" }, h("span", { class: "cn-cell-t" }, main), sub ? h("span", { class: "dl-sub" }, sub) : null);

const kv = (pairs) => h("dl", { class: "cn-kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))));
const TONES = { good: "done", warn: "needs", bad: "failed", off: "off" };

const status = (text, tone) => pill(TONES[tone] ?? "idle", text);

function narrow(form) {
form.classList.add("cn-form");
return form;
}

function picks(legend, name, options) {
return h("fieldset", { class: "cn-picks" },
h("legend", null, legend),
h("div", { class: "cn-picks-row" },
options.map(([value, label, checked]) => h("label", { class: "cn-pick" }, h("input", { type: "checkbox", name, value, checked: !!checked }), h("span", null, label))),
),
);
}

function choice(label, props = {}, hint) {
return h("label", { class: "cn-choice" }, h("input", { type: "checkbox", ...props }), h("span", { class: "cn-choice-t" }, label, hint ? h("span", { class: "dl-sub" }, hint) : null));
}

function button(label, run, opts = {}) {
const b = action(label, run, opts);
b.className = `cn-btn cn-btn--s${opts.primary ? " cn-btn--primary" : opts.quiet ? " cn-btn--ghost" : ""}`;
return b;
}
});
__o.d("js/catalogue.js", function (__x) {
"use strict";
__o.e(__x, { GLYPH: () => GLYPH, TOOLS: () => TOOLS, GROUP_LINES: () => GROUP_LINES, CREATOR_TABS: () => CREATOR_TABS, BRAND_TABS: () => BRAND_TABS, ADMIN_TABS: () => ADMIN_TABS, SETTINGS: () => SETTINGS, RESOURCES: () => RESOURCES, SITE: () => SITE, siteHref: () => siteHref, toolsFor: () => toolsFor, tabsFor: () => tabsFor, settingsFor: () => settingsFor, tile: () => tile });
const { on } = __o.r("js/api.js");
const { roleCan } = __o.r("js/routes.js");


const GLYPH = {
"products/you/": ".###.|#...#|#.#.#|#...#|.###.",
"products/rate/": "....#|..#.#|..#.#|#.#.#|#.#.#",
"products/fix/": "....#|...#.|#.#..|.#...|#.#..",
"products/podcasts/": "..#..|#.#.#|#.#.#|#.#.#|..#..",
"products/sponsorships/": "#####|#...#|#####|.....|#####",
"products/offer/": ".....|....#|...#.|#.#..|.#...",
"products/selling/": ".####|...##|..#.#|.#..#|#....",
"products/diligence/": "###..|.....|#####|.....|####.",
"products/protect/": "#####|#####|#####|.###.|..#..",
"products/rights/": "###..|#.#..|#####|..#.#|..###",
"products/roster/": "#.#.#|.....|#.#.#|.....|#.#.#",
"teams/": "##.##|##.##|.....|##.##|##.##",
"developers/": "#....|.#...|..#..|.#...|#.###",
};

const tool = (o) => ({ side: "creator", api: null, site: null, nav: true, local: false, ...o });
const TOOLS = [

tool({ id: "rate", nav: false, path: "rate", name: "Rate a channel", line: "Any YouTube channel, against creators the same size.", group: "Grow", k: "also", glyph: "products/rate/", site: "products/rate/",
api: { method: "GET", path: "/v1/rate/youtube/{handle}", mcp: "orbe_rate", note: "Public works only. The rating carries its label wherever it is shown." } }),
tool({ id: "record", path: "record", name: "Record", line: "Your verified results and who may see them.", group: "Earn", k: "rec", glyph: "products/you/", site: "products/you/",
api: { method: "GET", path: "/v1/me/record", mcp: "orbe_explain_rating", note: "JSON by default; add ?format=html or ?format=markdown." } }),
tool({ id: "podcasts", nav: false, path: "podcasts", name: "Podcasts", line: "Free measurement and a page for your show.", group: "Grow", k: "pod", glyph: "products/podcasts/", site: "products/podcasts/",
api: { method: "GET", path: "/v1/me/podcasts", mcp: "orbe_podcast_plausibility", note: "The MCP tool checks whether a download claim fits public signals." } }),
tool({ id: "fix", nav: false, path: "fix", name: "Fix", line: "New titles and thumbnails, kept only on lift.", group: "Grow", k: "fix", glyph: "products/fix/", site: "products/fix/",
api: { method: "GET", path: "/v1/me/fixes", mcp: "orbe_diagnose_upload", note: "orbe_judge_fix says whether a change lifted a work." } }),
tool({ id: "plan", nav: false, path: "predictions", name: "Predictions", line: "Seal a forecast before a work; checked after.", group: "Grow", k: "note", glyph: "products/you/",
api: { method: "GET", path: "/v1/me/predictions", mcp: null, note: "Each seal is chained to the one before and added to a public log." } }),
tool({ id: "media", nav: false, path: "media", feature: "media", name: "Drop in a video", line: "Clips, captions and words from one video, ready to send.", group: "Grow", k: "also", glyph: "products/podcasts/",
api: { method: "POST", path: "/v1/me/media/items", mcp: null, note: "Then PUT the file in chunks to the upload address it returns, with Content-Range." } }),

tool({ id: "sponsorships", path: "deals", name: "Deals", line: "Offers, bookings, reads and payouts, in one place.", group: "Earn", k: "spon", glyph: "products/sponsorships/", site: "products/sponsorships/",
api: { method: "GET", path: "/v1/me/sponsorships/inventory", mcp: "orbe_price_sponsorship", note: "orbe_quote_guaranteed_read quotes a read paid only on verified delivery." } }),
tool({ id: "finder", nav: false, path: "deals?tab=finder", screen: "deals", feature: "sponsor_finder", name: "Sponsors like you", line: "Brands that sponsor channels like yours, from their public works.", group: "Earn", k: "spon", glyph: "products/sponsorships/",
api: { method: "GET", path: "/v1/me/sponsor-finder", mcp: null, note: "Detected in public works; a price only where Orbe settled one or your own results support it." } }),
tool({ id: "assistant", nav: false, path: "deals?tab=assistant", screen: "deals", feature: "deals_agent", name: "Hand it off", line: "Answers offers inside your rules. Agrees only where they allow.", group: "Earn", k: "sell", glyph: "products/offer/",
api: { method: "GET", path: "/v1/me/deals", mcp: null, note: "Emails wait for your tap. A counter goes alone only when Counter for me is on, and says your assistant sent it." } }),
tool({ id: "offer", nav: false, path: "offer", name: "Check an offer", line: "Is this offer fair for your size?", group: "Earn", k: "spon", glyph: "products/offer/", site: "products/offer/",
api: { method: "GET", path: "/v1/me/sponsorships/inventory", mcp: "orbe_fair_offer", note: "The check sets an offer against the range your own results support." } }),
tool({ id: "sell", nav: false, path: "selling", name: "Selling", line: "An indicative value; fees in full, never a cut.", group: "Earn", k: "sell", glyph: "products/selling/", site: "products/selling/",
api: { method: "GET", path: "/v1/me/valuation?margin={margin}&faceDependence={faceDependence}", mcp: "orbe_value_business", note: "Margin and face dependence are 0 to 1." } }),
tool({ id: "report", nav: false, path: "report", name: "Diligence report", line: "The report a buyer reads first.", group: "Earn", k: "rec", glyph: "products/diligence/", site: "products/diligence/",
api: { method: "POST", path: "/v1/me/reports", mcp: null, note: "Issues a free Orbe Verified report of your record as it stands." } }),

tool({ id: "protect", nav: false, local: true, path: "protect", name: "Protect", line: "Is this a copy of your work? Checked on your device.", group: "Protect", k: "rec", glyph: "products/protect/", site: "products/protect/" }),
tool({ id: "rights", nav: false, path: null, name: "Rights", line: "Who may use what, until when.", group: "Protect", k: "note", glyph: "products/rights/", site: "products/rights/" }),

tool({ id: "connect", nav: false, path: "connections", name: "Connections", line: "Everything Orbe reads for you, and where it can post.", group: "Connections", k: "note", glyph: "products/roster/",
api: { method: "GET", path: "/v1/me/connections", mcp: null, note: "Grants without their secrets." } }),
tool({ id: "developers", nav: false, path: "developers", name: "For developers", line: "Orbe for agents, over MCP.", group: "Connections", k: "pod", glyph: "developers/", site: "developers/",
api: { method: "MCP", path: "orbe-mcp", mcp: "orbe_rate", note: "Twelve tools, worked out on your machine." } }),

tool({ side: "buyer", id: "intel", nav: false, path: "intelligence", feature: "brand_intel", name: "Intelligence", line: "Who sponsors in your category, and which creators your competitors back.", group: "Intelligence", k: "rec", glyph: "products/diligence/",
api: { method: "GET", path: "/v1/brand/intel?days={days}", mcp: null, note: "Add &format=csv for a spreadsheet. Every row links to the public works it was counted from." } }),
tool({ side: "buyer", id: "reads", nav: false, path: "reads", feature: "reads_checkout", name: "Buy guaranteed reads", line: "A brief in, reads at the creator's price out. Paid only on verified delivery.", group: "Campaigns", k: "spon", glyph: "products/offer/",
api: { method: "POST", path: "/v1/brand/checkout/proposal", mcp: "orbe_quote_guaranteed_read", note: "Then POST /v1/brand/checkout with the picks. Nothing is booked until each creator accepts." } }),
tool({ side: "buyer", id: "campaigns", path: "campaigns", name: "Campaigns", line: "Briefs, matches and offers.", group: "Campaigns", k: "spon", glyph: "products/sponsorships/", site: "teams/",
api: { method: "GET", path: "/v1/brand/campaigns", mcp: "orbe_quote_guaranteed_read", note: "Matches come ranked, each with its reasons." } }),
tool({ side: "buyer", id: "bookings", path: "bookings", name: "Bookings", line: "Fund, review and approve reads.", group: "Campaigns", k: "sell", glyph: "products/selling/",
api: { method: "GET", path: "/v1/brand/bookings", mcp: "orbe_check_delivery", note: "Delivery is read at source, and short reads are made good." } }),
tool({ side: "buyer", id: "profile", nav: false, path: "profile", name: "Brand profile", line: "Who you are and the terms you accept.", group: "Campaigns", k: "note", glyph: "teams/",
api: { method: "GET", path: "/v1/brand/profile", mcp: null, note: "" } }),
tool({ side: "buyer", id: "discover", path: "discover", name: "Discover", line: "Creators by results at their size.", group: "Creators", k: "also", glyph: "products/rate/",
api: { method: "GET", path: "/v1/brand/discover?kinds={kinds}&bands={bands}", mcp: "orbe_benchmark", note: "Anonymised until a creator accepts an offer from you." } }),
tool({ side: "buyer", id: "roster", path: "roster", name: "Roster", line: "Every creator you look after.", group: "Creators", k: "note", glyph: "products/roster/", site: "products/roster/",
api: { method: "GET", path: "/v1/roster", mcp: null, note: "Built fresh each time it is opened." } }),
tool({ side: "buyer", id: "brand-rate", nav: false, path: "rate", name: "Rate a channel", line: "Any YouTube channel, against creators its size.", group: "Creators", k: "also", glyph: "products/rate/",
api: { method: "GET", path: "/v1/rate/youtube/{handle}", mcp: "orbe_rate", note: "Public works only." } }),
tool({ side: "buyer", id: "keys", nav: false, path: "keys", name: "API keys", line: "Keys for the data API.", group: "Developers", k: "pod", glyph: "developers/",
api: { method: "GET", path: "/v1/data/discover", mcp: null, note: "Send a key as a bearer token." } }),
tool({ side: "buyer", id: "brand-developers", nav: false, path: "developers", name: "MCP and agents", line: "Orbe for agents, over MCP.", group: "Developers", k: "pod", glyph: "developers/",
api: { method: "MCP", path: "orbe-mcp", mcp: "orbe_rate", note: "Twelve tools, worked out on your machine." } }),
];
const GROUP_LINES = {
Grow: "Each work, rated against creators your size.",
Earn: "Get paid fairly when money moves.",
Protect: "Your work, and who may use it.",
Connect: "What Orbe reads for you, and how agents reach it.",
Intelligence: "Your market, from public works, with the evidence.",
Campaigns: "Guaranteed reads, paid only on verified delivery.",
Creators: "Creators found by their results, not their followers.",
Developers: "The data API and MCP.",
};

const CREATOR_TABS = [
{ name: "Home", path: "", icon: "home" },
{ name: "Library", path: "library", icon: "library" },
{ name: "Deals", path: "deals", icon: "earn" },
{ name: "Record", path: "record", icon: "chart" },
{ name: "Explore", path: "explore", icon: "explore" },
];
const BRAND_TABS = [
{ name: "Home", path: "", icon: "home" },
{ name: "Intelligence", path: "intelligence", icon: "chart" },
{ name: "Campaigns", icon: "megaphone", groups: ["Campaigns"] },
{ name: "Creators", icon: "people", groups: ["Creators"] },
{ name: "Explore", path: "explore", icon: "explore" },
];
const ADMIN_TABS = [{ name: "Desk", path: "desk", icon: "bolt" }];

const SETTINGS = [
{ id: "account", name: "Account", line: "Your name, email, the walkthrough, and deleting your account.", side: "both", icon: "user", group: "General" },
{ id: "brand", name: "Brand profile", line: "Who you are to creators, and the terms you accept.", side: "buyer", feature: "sponsorships", icon: "megaphone", group: "General" },
{ id: "connections", name: "Connections", line: "Everything Orbe reads for you, and where it can post.", side: "creator", icon: "plug", group: "General" },
{ id: "team", name: "Team", line: "The people on this account, what each may do, and what waits for the owner.", side: "both", icon: "people", group: "General" },
{ id: "sharing", name: "Sharing", line: "Your public page, shared ratings, emails and your invitation link.", side: "both", icon: "link", group: "General", anyOf: ["creator_pages", "share_cards", "habit_email", "referrals"] },
{ id: "plan", name: "Plan and usage", line: "Free for creators; the optional plan for heavy use, and what you have used.", side: "creator", feature: "pro", icon: "card", group: "Billing", needs: "read.money" },
{ id: "keys", name: "API keys", line: "Keys for the data API, and what each has used.", side: "buyer", feature: "brand_data", icon: "key", group: "Developer", needs: "read.money" },
{ id: "mcp", name: "MCP and agents", line: "Use Orbe from Claude and other AI tools.", side: "both", icon: "code", group: "Developer" },
{ id: "app", name: "App and notifications", line: "Install Orbe, and choose what it tells you.", side: "both", icon: "bell", group: "General" },
{ id: "security", name: "Security", line: "Where you are signed in.", side: "both", icon: "shield", group: "Security" },
{ id: "metrics", name: "Metrics", line: "What investors ask, counted from Orbe's own records. Staff only.", side: "both", icon: "chart", group: "Staff", staff: true },
];

const RESOURCES = [
["Developer resources", [["For developers", "developers/", "code"], ["The published maths", "/v1/maths?format=markdown", "doc"], ["For agents (llms.txt)", "llms.txt", "sparkle"]]],
["Learning", [["How the rating works", "products/rate/", "chart"], ["Answers", "answers/", "book"], ["All products", "products/", "grid"]]],
["Company", [["Pricing", "pricing/", "card"], ["For teams", "teams/", "people"], ["Brand", "brand/", "image"]]],
["Legal", [["Terms", "legal/terms.html", "doc"], ["Privacy", "legal/privacy.html", "shield"]]],
];

const SITE = "/orbe-site/";
const siteHref = (p) => (p.startsWith("/") ? p : `${SITE}${p}`);

const agencyOnly = (user) => user.type !== "creator" && user.team?.kind === "agency" && user.team.brand === false && on("sponsorships");
const brandScreens = (screens) => new Set(screens.filter((r) => r.brand).map((r) => r.path));

function toolsFor(user, screens) {
const open = new Set(screens.map((r) => r.path));
const side = user.type === "creator" ? "creator" : "buyer";
const notOurs = agencyOnly(user) ? brandScreens(screens) : new Set();

return TOOLS.filter((t) => t.side === side && !notOurs.has(t.screen ?? t.path)).map((t) => ({ ...t, status: t.path === null ? "coming" : open.has(t.screen ?? t.path) && (!t.feature || on(t.feature)) ? "live" : "off" }));
}

function tabsFor(user, screens) {
const open = new Set(screens.map((r) => r.path));
const agency = agencyOnly(user) && open.has("roster");
const notOurs = agency ? brandScreens(screens) : new Set();

const tools = toolsFor(user, screens).filter((t) => t.status === "live" && t.nav && !(agency && t.path === "roster"));
const base = user.type === "creator" ? CREATOR_TABS : agency ? BRAND_TABS.map((tab) => (tab.path === "" ? { ...tab, path: "roster", name: "Roster", icon: "people" } : tab)) : BRAND_TABS;
const staff = (user.roles ?? []).includes("admin") ? ADMIN_TABS : [];
return [...base, ...staff]
.map((tab) => (tab.groups ? { ...tab, items: tools.filter((t) => tab.groups.includes(t.group)) } : tab))
.filter((tab) => (tab.items ? tab.items.length > 0 : open.has(tab.path) && !notOurs.has(tab.path)));
}

const settingsFor = (user, on) =>
SETTINGS.filter((s) => (!s.staff || (user.roles ?? []).includes("admin")) && (s.side === "both" || s.side === user.type) && (!s.feature || on(s.feature)) && (!s.anyOf || s.anyOf.some((f) => on(f) && (user.type === "creator" || f === "referrals"))) && roleCan(user.team?.role, s.needs));

function tile(glyphPath, k, h, size) {
const g = GLYPH[glyphPath] ?? "";
const NS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(NS, "svg");
svg.setAttribute("viewBox", "0 0 5 5");
svg.setAttribute("shape-rendering", "crispEdges");
svg.setAttribute("focusable", "false");
g.split("|").forEach((row, y) =>
[...row].forEach((c, x) => {
if (c !== "#") return;
const r = document.createElementNS(NS, "rect");
for (const [a, v] of [["x", x], ["y", y], ["width", 1], ["height", 1]]) r.setAttribute(a, String(v));
svg.append(r);
}),
);
return h("span", { class: `cn-tile${size ? ` cn-tile--${size}` : ""}`, "data-k": k, "aria-hidden": "true" }, svg);
}
});
__o.d("js/console-ui.js", function (__x) {
"use strict";
__o.e(__x, { sparkline: () => sparkline, bars: () => bars, stat: () => stat, statStrip: () => statStrip, checklist: () => checklist, alerts: () => alerts, emptyState: () => emptyState, card: () => card, sampleTag: () => sampleTag, section: () => section, pixelGrid: () => pixelGrid, cover: () => cover, segmented: () => segmented, rating: () => rating, pill: () => pill, skeleton: () => skeleton, codeBlock: () => codeBlock, drawer: () => drawer, toolPage: () => toolPage, apiTab: () => apiTab, serverRuns: () => serverRuns, historyList: () => historyList, ago: () => ago, toolShell: () => toolShell, screenHead: () => screenHead });
const { api, signInWays } = __o.r("js/api.js");
const { TOOLS, tile } = __o.r("js/catalogue.js");
const { icon } = __o.r("js/icons.js");
const { h, nextId, opener, refocus, signed } = __o.r("js/ui.js");

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
const el = document.createElementNS(NS, tag);
for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
return el;
};
const setVar = (el, name, value) => (el.style.setProperty(name, String(value)), el);

function sparkline(values, label, opts = {}) {
const v = (values ?? []).filter((x) => typeof x === "number" && Number.isFinite(x));
if (v.length < 2) return null;
const w = 120;
const ht = 36;
const lo = Math.min(...v);
const hi = Math.max(...v);
const span = hi - lo || 1;
const pts = v.map((x, i) => [(i / (v.length - 1)) * w, ht - 3 - ((x - lo) / span) * (ht - 8)]);
const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const svg = svgEl("svg", { viewBox: `0 0 ${w} ${ht}`, class: `cn-spark${opts.tone ? ` cn-spark--${opts.tone}` : ""}`, role: "img", "aria-label": label ?? `Trend over ${v.length} readings`, preserveAspectRatio: "none" });
svg.append(
svgEl("polygon", { class: "cn-spark-area", points: `0,${ht} ${line} ${w},${ht}` }),
svgEl("polyline", { class: "cn-spark-line", points: line, fill: "none", "vector-effect": "non-scaling-stroke" }),
);
const [lx, ly] = pts[pts.length - 1];
svg.append(svgEl("circle", { class: "cn-spark-dot", cx: lx.toFixed(1), cy: ly.toFixed(1), r: 2.2 }));
return svg;
}

function bars(values, label) {
const v = (values ?? []).filter((x) => typeof x === "number" && Number.isFinite(x));
if (!v.length || Math.max(...v) <= 0) return null;
const hi = Math.max(...v);
return h("span", { class: "cn-bars", role: "img", "aria-label": label ?? `${v.length} periods` },
v.map((x) => setVar(h("span", { class: "cn-bar" }), "--v", Math.max(0.06, x / hi).toFixed(3))));
}

function stat({ label, value, line, spark, links = [], tone }) {
return h("section", { class: `cn-stat${tone ? ` cn-stat--${tone}` : ""}` },
h("p", { class: "cn-stat-label" }, label),
h("div", { class: "cn-stat-row" }, h("p", { class: "cn-stat-value" }, value), spark ?? null),
line ? h("p", { class: "cn-stat-line" }, line) : null,
links.length ? h("div", { class: "cn-stat-links" }, links.map(([text, href]) => h("a", { class: "cn-btn cn-btn--xs", href }, text))) : null,
);
}
const statStrip = (cells) => h("div", { class: "cn-strip" }, cells.filter(Boolean));

function checklist(steps) {
const firstOpen = steps.findIndex((s) => !s.done);
return h("ol", { class: "cn-checks" },
steps.map((s, i) =>
h("li", { class: `cn-check${s.done ? " is-done" : ""}${i === firstOpen ? " is-next" : ""}` },
h("span", { class: "cn-check-mark", "aria-hidden": "true" }, s.done ? icon("check") : null),
h("div", { class: "cn-check-main" },
s.done || !s.href ? h("p", { class: "cn-check-t" }, s.name) : h("a", { class: "cn-check-t", href: s.href }, s.name),
s.line && !s.done ? h("p", { class: "cn-check-d" }, s.line) : null,
),
i === firstOpen && s.href ? h("a", { class: "cn-check-go", href: s.href, "aria-hidden": "true", tabindex: "-1" }, "Start", icon("arrowRight")) : null,
h("span", { class: "ob-sr" }, s.done ? "Done" : "Not done yet"),
),
),
);
}

function alerts(items) {
if (!items?.length) return null;
return h("section", { class: "cn-alerts", "aria-label": "Waiting on you" },
items.slice(0, 3).map((n) => h("a", { class: "cn-alert", href: n.href }, h("span", { class: "cn-alert-dot", "aria-hidden": "true" }), h("span", { class: "cn-alert-t" }, n.title), h("span", { class: "cn-alert-d" }, n.line), icon("arrowRight"))),
);
}

function emptyState(iconName, text, actions = [], more) {
return h("div", { class: "cn-empty" },
h("span", { class: "cn-empty-ico" }, icon(iconName)),
h("p", { class: "cn-empty-t" }, text),
more ? h("p", { class: "cn-empty-d" }, more) : null,
actions.length
? h("div", { class: "cn-empty-actions" },
actions.map(([label, to, primary]) =>
typeof to === "function"
? h("button", { class: `cn-btn cn-btn--s${primary ? " cn-btn--primary" : ""}`, type: "button", onclick: to }, label)
: h("a", { class: `cn-btn cn-btn--s${primary ? " cn-btn--primary" : ""}`, href: to }, label),
))
: null,
);
}

function card(title, ...body) {
return h("section", { class: "cn-card" }, title ? h("header", { class: "cn-card-head" }, h("h2", { class: "cn-h2" }, title)) : null, h("div", { class: "cn-card-body" }, ...body));
}

const sampleTag = () => (signInWays()?.sample ? h("span", { class: "cn-tag cn-tag--line" }, "Sample") : null);
function section({ title, line, actions, cls }, ...body) {
return h("section", { class: `cn-card${cls ? ` ${cls}` : ""}` },
h("header", { class: "cn-card-head" }, h("div", null, h("h2", { class: "cn-h2" }, title), line ? h("p", { class: "cn-card-line" }, line) : null), actions ? h("div", { class: "cn-card-actions" }, actions) : null),
h("div", { class: "cn-card-body" }, ...body),
);
}

function pixelGrid(place, opts = {}) {
const p = place === null || place === undefined ? null : Math.max(1, Math.min(100, Math.round(place)));
const grid = h("div", { class: `cn-grid100${opts.cls ? ` ${opts.cls}` : ""}`, role: "img", "aria-label": p === null ? "No place yet" : opts.label ?? `Better than ${p - 1} in 100` });
for (let i = 0; i < 100; i++) {

const row = 9 - Math.floor(i / 10);
const col = i % 10;
const cell = h("span", { class: `cn-cell${p !== null && i < p - 1 ? " is-on" : ""}${p !== null && i === p - 1 ? " is-you" : ""}` });
setVar(cell, "--r", row + 1);
setVar(cell, "--c", col + 1);
setVar(cell, "--i", i);
grid.append(cell);
}
return grid;
}

function seeded(text) {
let x = 2166136261;
for (const ch of String(text)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
return () => {
x = Math.imul(x ^ (x >>> 15), 2246822507);
x = Math.imul(x ^ (x >>> 13), 3266489909);
x ^= x >>> 16;
return (x >>> 0) / 4294967296;
};
}

function cover(seedText, k, strength = 0.5) {
const rnd = seeded(seedText);
const cols = 32;
const rows = 18;
const svg = svgEl("svg", { viewBox: `0 0 ${cols} ${rows}`, class: "cn-cover-art", "shape-rendering": "crispEdges", "aria-hidden": "true", preserveAspectRatio: "xMidYMid slice" });
const lift = Math.max(0, Math.min(1, strength));

let prev = 4 + rnd() * 4;
let drift = 0;
for (let x = 0; x < cols; x++) {
drift = drift * 0.7 + (rnd() - 0.5) * 3;
const want = 3 + lift * 9 + drift + (rnd() - 0.5) * 3;
const ht = Math.max(1, Math.min(rows - 3, Math.round(prev * 0.55 + want * 0.45)));
prev = ht;
svg.append(svgEl("rect", { x, y: rows - ht, width: 1, height: ht, class: "cn-px-a" }));
svg.append(svgEl("rect", { x, y: rows - ht, width: 1, height: 1, class: "cn-px-b" }));

if (rnd() < 0.12) svg.append(svgEl("rect", { x, y: Math.max(0, rows - ht - 2 - Math.floor(rnd() * 4)), width: 1, height: 1, class: "cn-px-b" }));
}
return h("span", { class: "cn-cover", "data-k": k }, svg);
}

function segmented(label, options, value, onChange, opts = {}) {
const wrap = h("div", { class: `cn-seg${opts.cls ? ` ${opts.cls}` : ""}`, role: "radiogroup", "aria-label": label });
const btns = options.map(([v, text, ico]) =>
h("button", { class: "cn-seg-btn", type: "button", role: "radio", "aria-checked": String(v === value), title: opts.iconOnly ? text : null, "aria-label": opts.iconOnly ? text : null, onclick: () => pick(v) }, ico ? icon(ico) : null, opts.iconOnly ? null : text),
);
function pick(v) {
btns.forEach((b, i) => b.setAttribute("aria-checked", String(options[i][0] === v)));
onChange(v);
}
wrap.append(...btns);
return wrap;
}

const rating = (value, { size = "s", tag = "span", cls = "" } = {}) =>
h(tag, { class: `cn-rating${size ? ` cn-rating--${size}` : ""}${value > 0 ? " is-up" : ""}${cls ? ` ${cls}` : ""}` }, signed(value));

const pill = (state, text) => h("span", { class: `cn-pill cn-pill--${state}` }, h("span", { class: "cn-pill-dot", "aria-hidden": "true" }), text);

const skeleton = (n = 3, cls = "") => h("div", { class: `cn-skel${cls ? ` ${cls}` : ""}`, "aria-hidden": "true" }, Array.from({ length: n }, () => h("span", { class: "cn-skel-line" })));

function codeBlock(text, label) {
const btn = h("button", { class: "cn-code-copy", type: "button", "aria-label": `Copy ${label ?? "code"}` }, icon("copy"), h("span", null, "Copy"));
btn.addEventListener("click", async () => {
try {
await navigator.clipboard.writeText(text);
btn.lastChild.textContent = "Copied";
} catch {
btn.lastChild.textContent = "Select and copy";
}
setTimeout(() => (btn.lastChild.textContent = "Copy"), 2000);
});
return h("div", { class: "cn-code" }, h("div", { class: "cn-code-bar" }, h("span", null, label ?? ""), btn), h("pre", null, h("code", null, text)));
}

function drawer(label, build, opts = {}) {
const back = opener();
const d = h("dialog", { class: `cn-drawer${opts.wide ? " cn-drawer--wide" : ""}`, "aria-label": label });
const close = () => d.open && d.close();
const closeBtn = h("button", { class: "cn-iconbtn", type: "button", "aria-label": "Close", onclick: close }, icon("close"));
const body = h("div", { class: "cn-drawer-body" });
d.append(h("div", { class: "cn-drawer-bar" }, h("p", { class: "cn-drawer-label" }, label), closeBtn), body);
d.addEventListener("click", (e) => e.target === d && close());
d.addEventListener("close", () => {
d.remove();
opts.onClose?.();
refocus(back);
});
document.body.append(d);
d.showModal();
Promise.resolve(build(close)).then((kids) => body.replaceChildren(...[kids].flat().filter(Boolean)));
closeBtn.focus({ focusVisible: false });
return close;
}

function toolPage({ tool, title, line, tags = [], inputs, results, history, api, historyNote = "Your team, every device" }) {
const id = nextId("tp");
const status = h("span", { class: "cn-result-status" }, pill("idle", "Idle"));
const json = h("pre", { class: "cn-json", hidden: true }, h("code", null, "Run the tool to see its answer as JSON."));
const preview = h("div", { class: "cn-result-body", "aria-live": "polite" }, results);
const view = segmented("Result view", [["preview", "Preview", "image"], ["json", "JSON", "code"]], "preview", (v) => {
preview.hidden = v !== "preview";
json.hidden = v !== "json";
}, { cls: "cn-seg--s" });
const play = h("div", { class: "cn-tp-panel", id: `${id}-play`, role: "tabpanel", "aria-labelledby": `${id}-t-play` },
h("div", { class: "cn-play" },
h("section", { class: "cn-play-in", "aria-label": "Input" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2" }, "Input")), h("div", { class: "cn-play-body" }, inputs)),
h("section", { class: "cn-play-out", "aria-label": "Result" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2" }, "Result"), status, h("span", { class: "cn-grow" }), view), h("div", { class: "cn-play-body" }, preview, json)),
),
history ? h("section", { class: "cn-play-hist", "aria-labelledby": `${id}-hist` }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h2", id: `${id}-hist` }, "History"), h("span", { class: "cn-play-note" }, historyNote)), h("div", { class: "cn-play-body" }, history)) : null,
);
const apiPanel = h("div", { class: "cn-tp-panel", id: `${id}-api`, role: "tabpanel", "aria-labelledby": `${id}-t-api`, hidden: true }, api ? apiTab(api) : null);
const tabBtn = (key, text) => h("button", { class: "cn-tp-tab", type: "button", role: "tab", id: `${id}-t-${key}`, "aria-controls": `${id}-${key}`, "aria-selected": String(key === "play"), onclick: () => select(key) }, text);
const tabs = [tabBtn("play", "Playground"), api ? tabBtn("api", "API") : null].filter(Boolean);
function select(key) {
tabs.forEach((t) => t.setAttribute("aria-selected", String(t.id.endsWith(`-t-${key}`))));
play.hidden = key !== "play";
apiPanel.hidden = key !== "api";
}
const node = h("div", { class: "cn-tp" },
pageHead({ tileNode: tool ?? null, title, line, tags }),
h("div", { class: "cn-tp-tabs", role: "tablist", "aria-label": "Views" }, tabs),
play,
apiPanel,
);
return {
node,

status(state, text, answer) {
status.replaceChildren(pill(state, text));
if (answer !== undefined) json.firstChild.textContent = JSON.stringify(answer, null, 2);
},
};
}

function apiTab(api) {
const curl = api.method === "MCP"
? null
: `curl ${api.method === "GET" ? "" : `-X ${api.method} `}"https://api.orbe.vc${api.path}" \\\n  -H "Cookie: orbe_session=..."${api.method === "GET" ? "" : ' \\\n  -H "X-CSRF-Token: ..."'}`;
return h("div", { class: "cn-api" },
h("div", { class: "cn-api-main" },
curl ? [h("h2", { class: "cn-h2" }, "HTTP"), h("p", { class: "cn-api-line" }, h("span", { class: `cn-method cn-method--${api.method.toLowerCase()}` }, api.method), h("code", null, api.path)), codeBlock(curl, "curl")] : null,
api.mcp
? [h("h2", { class: "cn-h2" }, "MCP"), h("p", { class: "cn-api-line" }, h("span", { class: "cn-method cn-method--mcp" }, "TOOL"), h("code", null, api.mcp)), codeBlock(`claude mcp add orbe -- npx -y orbe-mcp\n# then ask: "Use ${api.mcp} on ..."`, "Claude Code, once published")]
: null,
),
h("aside", { class: "cn-api-side" },
h("h2", { class: "cn-h2" }, "Notes"),
api.note ? h("p", null, api.note) : null,
h("p", null, "Signed-in calls use your session cookie and, for anything that changes data, the CSRF token from GET /v1/auth/session. The MCP server is not on npm yet."),
h("p", null, "Wherever a rating is shown to a person, show its label with it: Independently calculated by Orbe."),
),
);
}

function serverRuns(tool, max = 8) {
const q = (extra = {}) => new URLSearchParams({ ...(tool ? { tool } : {}), limit: String(max), ...extra });
return {
list: async (search) => (await api.get(`/v1/runs?${q(search ? { q: search } : {})}`)).runs,
run: async (job) => (await api.post("/v1/runs", { ...(tool ? { tool } : {}), ...job })).run,
clear: () => api.del("/v1/runs"),
};
}

function historyList(entries, emptyText, hrefOf) {
if (!entries.length) return h("p", { class: "cn-hist-empty" }, emptyText);
return h("ul", { class: "cn-hist" },
entries.map((e) => h("li", null, hrefOf ? h("a", { href: hrefOf(e) }, e.label) : h("span", null, e.label), h("span", { class: "cn-hist-d" }, e.summary), e.at ? h("time", { class: "cn-hist-t", datetime: e.at }, ago(e.at)) : null)),
);
}

function ago(isoText, now = Date.now()) {
const t = Date.parse(isoText);
if (!Number.isFinite(t)) return "";
const s = Math.max(0, Math.round((now - t) / 1000));
if (s < 45) return "Now";
if (s < 3600) return `${Math.round(s / 60)}m`;
if (s < 86400) return `${Math.round(s / 3600)}h`;
if (s < 86400 * 7) return `${Math.round(s / 86400)}d`;
dayMonth ??= new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
return dayMonth.format(new Date(t));
}
let dayMonth = null;

function pageHead({ tileNode, title, line, tags = [], actions }) {
const more = tags.length || (line && line.length > 96);
let about = null;
if (more) {
about = h("details", { class: "cn-about" },
h("summary", { class: "cn-btn cn-btn--s cn-btn--ghost", "aria-label": `About ${title}` }, icon("doc"), h("span", null, "About")),
h("div", { class: "cn-about-panel" }, line ? h("p", null, line) : null, tags.length ? h("div", { class: "cn-tags" }, tags.map(([text, tone]) => h("span", { class: `cn-tag${tone ? ` cn-tag--${tone}` : ""}` }, text))) : null),
);
const shut = (e) => {
if (!about.contains(e.target) || e.key === "Escape") about.open = false;
};
about.addEventListener("toggle", () => {
for (const [type, fn] of [["click", shut], ["keydown", shut]]) (about.open ? document.addEventListener : document.removeEventListener).call(document, type, fn);
});
}
return h("header", { class: "cn-tp-head cn-ph" },
tileNode ?? null,
h("div", { class: "cn-tp-names" },
h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, title),
line ? h("p", { class: "cn-tp-line", title: more ? line : null }, line) : null,
),
about || actions ? h("div", { class: "cn-ts-actions" }, about, actions ?? null) : null,
);
}

function toolShell(main, { tool, title, line, tags = [], tile: tileNode, back }) {
const work = h("div", { class: "cn-ts-work" });

const apiBtn = tool?.api ? h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => drawer(`${tool.name}: API`, () => apiTab(tool.api), { wide: true }) }, icon("code"), "API") : null;
main.append(
h("div", { class: "cn-tp cn-ts" },
back ? h("p", { class: "cn-back" }, h("a", { href: back[1] }, icon("arrowRight", { cls: "cn-i--back" }), back[0])) : null,
pageHead({ tileNode, title, line, tags, actions: apiBtn }),
work,
),
);
return work;
}

function screenHead(main, toolId, opts = {}) {
const t = TOOLS.find((x) => x.id === toolId);
return toolShell(main, { tool: t, title: opts.title ?? t?.name ?? "", line: opts.line ?? t?.line, tags: opts.tags ?? [], tile: t ? tile(t.glyph, t.k, h, "l") : null, back: opts.back });
}
});
__o.d("js/creator/handoff.js", function (__x) {
"use strict";
__o.e(__x, { headline: () => headline, queueItems: () => queueItems, readHandoff: () => readHandoff, OWN: () => OWN, dealHandoff: () => dealHandoff, dealTimeline: () => dealTimeline, rulesDrawer: () => rulesDrawer, handoffCard: () => handoffCard });
const { api, can, on, SentToOwner, seg } = __o.r("js/api.js");
const { button, choice, table, twoLine } = __o.r("js/cards.js");
const { ago, drawer, sampleTag, section, skeleton } = __o.r("js/console-ui.js");
const { formatName } = __o.r("js/terms.js");
const { check, confirmBox, field, form, h, input, money, select, textarea, toast } = __o.r("js/ui.js");



const VERB = {
accept: ["Accept", "Accepting", "Accepted"],
counter: ["Counter", "Countering", "Countered"],
decline: ["Decline", "Declining", "Declined"],
};
const PLAIN = { done: 2, stopped: 0, dismissed: 0, failed: 0, superseded: 0, waiting: 0, scheduled: 1 };
const AFTER = { stopped: "Stopped", dismissed: "Left for you", failed: "Could not be done", superseded: "Replaced" };
const priced = (a) => (a.amount ? ` at ${money(a.amount)}` : "");
const clock = (iso, now = new Date()) => {
const t = new Date(iso);
if (!Number.isFinite(t.getTime())) return "";
const hm = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
return t.toDateString() === now.toDateString() ? hm : `${t.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at ${hm}`;
};

const notesChanged = () => window.dispatchEvent(new Event("orbe:notes-changed"));

const titled = (a) => {
const t = a.kind === "note" && a.state === "waiting" ? String(a.title ?? "").replace(/^Your answer: /, "Yours to answer: ") : String(a.title ?? "");
return /[.!?]$/.test(t) ? t : `${t}.`;
};

const SHORT_MS = 5 * 60_000;
const secondsTo = (iso, now = new Date()) => Math.max(0, Math.ceil((Date.parse(iso) - now.getTime()) / 1000));
const soon = (a, now = new Date()) => a.state === "scheduled" && a.runAt && Date.parse(a.runAt) - now.getTime() < SHORT_MS;
const sendsIn = (a, now = new Date()) => {
const n = secondsTo(a.runAt, now);
return n > 0 ? `Sends in ${n}s` : "Sending now";
};

function headline(a, now = new Date()) {
const v = VERB[a.kind];
if (!v) return titled(a);
const words = `${v[PLAIN[a.state] ?? 0]} ${a.brandName}${priced(a)}`;
if (soon(a, now)) return `${words}. ${sendsIn(a, now)} unless you stop it.`;
if (a.state === "scheduled") return `${words}${a.runAt ? `, at ${clock(a.runAt, now)} unless you stop it` : ""}.`;
if (AFTER[a.state]) return `${AFTER[a.state]}: ${words.charAt(0).toLowerCase()}${words.slice(1)}.`;
return `${words}.`;
}

const counterLine = (a) => `A counter cannot be taken back. If ${a.brandName} accepts it, the deal is agreed.`;

function queueItems(state) {
return (state?.queue ?? [])
.filter((a) => a.state === "waiting")
.map((a) => {
const line = headline(a).replace(/\.$/, "");

return { title: a.kind === "note" ? line : `Approve: ${line.charAt(0).toLowerCase()}${line.slice(1)}`, line: a.why, href: `/orbe-site/demo/app/deals?handoff=${seg(a.id)}`, kind: "handoff", id: a.id, offerId: a.offerId };
});
}

async function readHandoff() {
if (!on("deals_agent") || !can("read.money")) return null;
try {
return await api.get("/v1/me/deals/handoff");
} catch (e) {
if (e?.status === 404 || e?.status === 403) return null;
throw e;
}
}
const SENT = "Sent to the owner to approve. Nothing has changed yet.";

const OWN = {
own: true,
base: "/v1/me/deals/handoff",
name: null,
read: () => readHandoff(),

may: (action) => can(action),
};

const toCreator = (r) => (r?.waitingFor === "creator" ? r.message : null);

const PERSON = { person: "Edited by you" };
function messageFold(a) {
if (!a.message) return null;
return h("details", { class: "dl-fold ho-msg" },
h("summary", null, "The message"),
h("article", { class: "cn-msg" },
h("header", { class: "cn-msg-head" }, h("p", { class: "cn-msg-who" }, PERSON[a.message.draftedBy] ?? "Drafted by Orbe's assistant")),
a.message.subject ? h("p", { class: "cn-msg-subject" }, a.message.subject) : null,
h("p", { class: "cn-msg-body" }, a.message.body),
),
);
}

const doneLine = (a) =>
a.kind === "accept" ? `Accepted ${a.brandName}${priced(a)}. Money is held when they fund, and paid out on verified delivery.`
: a.kind === "counter" ? `Counter sent to ${a.brandName}. If they accept it, the deal is agreed.`
: a.kind === "decline" ? `Declined ${a.brandName}.`
: "Done.";

function actionItem(a, opts) {
const scope = opts.scope ?? OWN;
const changed = () => opts.changed?.(a);

const head = h("p", { class: "ho-item-t", id: opts.inDrawer ? null : `ho-${a.id}`, tabindex: "-1" }, soon(a) ? `${VERB[a.kind]?.[1] ?? ""} ${a.brandName}${priced(a)}.` : headline(a));
if (soon(a) && VERB[a.kind]) {

const left = h("span", { class: "ho-count" }, ` ${sendsIn(a)}.`);
head.append(left);
const tick = setInterval(() => {
if (!left.isConnected) return clearInterval(tick);
left.textContent = ` ${sendsIn(a)}.`;
if (!secondsTo(a.runAt)) clearInterval(tick);
}, 1000);
}
const why = a.why ? h("p", { class: "ho-item-d" }, a.why) : null;
const may = scope.may("business");
let body = null;
if (a.state === "scheduled") {
body = may
? h("div", { class: "cn-dw-actions" },
a.can?.approve ? button("Do it now", async () => {
try {
await api.post(`${scope.base}/actions/${seg(a.id)}/approve`, {});
} catch (e) {
if (e instanceof SentToOwner) return null;
throw e;
}

await opts.approved?.(a);
toast(doneLine(a));
return null;
}, { primary: true }) : null,
a.can?.stop ? button("Stop", async () => {
await api.post(`${scope.base}/actions/${seg(a.id)}/stop`, {});
changed();
return "Stopped. Nothing was sent.";
}) : null,
)
: null;
} else if (a.state === "waiting") {
const edit = a.can?.edit && a.can?.approve && a.message ? textarea({ name: "message", rows: 8, maxlength: 5000, value: a.message.body }) : null;
const editField = edit ? field("Your message", edit, "Sent as you write it when you approve.") : null;

const to = a.needsEmail && a.can?.approve ? field(`${a.brandName}'s email address`, input({ name: "brandEmail", type: "email", required: true, maxlength: 254, autocomplete: "off", placeholder: "name@example.com" }), "Orbe sends it here. Without it, copy the message and send it yourself.") : null;
if (editField) editField.hidden = true;
const editBtn = editField ? button("Edit message", () => {
editField.hidden = false;
editBtn.hidden = true;
edit.focus();
}, { quiet: true }) : null;
const note = a.kind === "note";
const extra = [
editBtn,
note && a.offerId && opts.open && !opts.inDrawer && scope.own ? button("Open the offer", () => opts.open(a), { primary: true }) : null,
note && a.can?.dismiss ? button("Clear", async () => {
await api.post(`${scope.base}/actions/${seg(a.id)}/dismiss`, {});
changed();
return null;
}, { quiet: true }) : null,
!note && a.can?.dismiss ? button("Not this one", async () => {
const sure = await confirmBox(scope.own ? `Orbe does nothing more with it, and ${a.brandName}'s offer stays for your own answer.` : `Orbe does nothing more with it, and ${a.brandName}'s offer stays for ${scope.name} to answer.`, { title: scope.own ? "Leave this one for you?" : `Leave this one for ${scope.name}?`, yes: "Not this one" });
if (!sure) return null;
await api.post(`${scope.base}/actions/${seg(a.id)}/dismiss`, {});
changed();
return "Left for you. Nothing was sent.";
}, { quiet: true }) : null,
].filter(Boolean);
body = may && a.can?.approve
? form(
[
a.notice ? h("p", { class: "dl-notice ho-notice" }, a.notice) : null,
a.notice ? check("I have read this and want to accept.", { name: "seen" }) : null,
to,
editField,
],
"Approve",
async (fd) => {
const msg = edit && !editField.hidden ? String(fd.get("message") ?? "").trim() : "";
try {
const brandEmail = to ? String(fd.get("brandEmail") ?? "").trim() : "";
await api.post(`${scope.base}/actions/${seg(a.id)}/approve`, { ...(a.notice ? { noticeShown: true } : {}), ...(brandEmail ? { email: brandEmail } : {}), ...(msg && msg !== a.message.body.trim() ? { message: msg } : {}) });
} catch (e) {
if (e instanceof SentToOwner) return SENT;
throw e;
}

await opts.approved?.(a);
toast(doneLine(a));
return null;
},
{ extra },
)
: may && extra.length ? h("div", { class: "cn-dw-actions" }, extra) : null;
}

const submit = body?.querySelector?.("button[type=submit]");
submit?.setAttribute("class", "cn-btn cn-btn--s cn-btn--primary");

const seen = body?.querySelector?.("input[name=seen]");
if (submit && seen) {
const sync = () => (submit.disabled = !seen.checked);
seen.addEventListener("change", sync);
sync();
}
return h("li", { class: `ho-item ho-item--${a.state}`, "data-id": a.id },
head,
why,
a.kind === "counter" ? h("p", { class: "ho-item-d" }, counterLine(a)) : null,

a.waitsFor ? h("p", { class: "ho-item-d ho-waits" }, a.waitsFor) : null,
a.state === "waiting" ? messageFold(a) : null,
body,
);
}

function dealHandoff(d, done) {
const box = h("div", { class: "ho-deal" });
readHandoff().then((s) => {
const mine = (s?.queue ?? []).filter((a) => (d.kind === "offer" ? a.offerId === d.id : a.bookingId === d.id || (a.offerId && a.offerId === d.x?.offerId)));
if (!mine.length) return;
box.replaceChildren(
h("p", { class: "ho-deal-t" }, "Orbe's assistant"),
h("ul", { class: "ho-list" }, mine.map((a) => actionItem(a, { changed: done, approved: done, inDrawer: true }))),
);
}).catch(() => {});
return box;
}

function dealTimeline(d, draw) {
const box = h("div", null, draw(d.x.audit));
if (!on("deals_agent") || !can("read.money")) return box;
const q = d.kind === "booking" ? `booking=${seg(d.id)}` : `offer=${seg(d.id)}`;
api.get(`/v1/me/deals/handoff/timeline?${q}`).then((r) => {

if (r?.items?.length) box.replaceChildren(draw([...r.items].sort((x, y) => String(x.at ?? "").localeCompare(String(y.at ?? "")))));
}).catch(() => {});
return box;
}


const graceWords = (secs = 1800) => `You have ${secs >= 120 ? `${Math.round(secs / 60)} minutes` : `${secs} seconds`} to stop it.`;

const PRICED = [["integration", "youtube"], ["dedicated", "youtube"], ["newsletter_slot", "substack"], ["podcast_read", "podcast"]];
const TONES = [["warm", "Warm"], ["brief", "Brief"], ["formal", "Formal"]];
const pence = (v) => (String(v ?? "").trim() === "" ? undefined : Math.round(Number(v) * 100));
const list = (fd, k) => String(fd.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const dayText = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const awayBox = (b) => check(`${dayText(b.start)} to ${dayText(b.end)}`, { name: "away", value: `${b.start}|${b.end}`, checked: true });

function awayDates(blocked, scope = OWN) {
const kept = h("div", { class: "ho-away" }, blocked.map(awayBox));
const from = input({ type: "date", name: "awayFrom" });
const to = input({ type: "date", name: "awayTo" });
const say = h("p", { class: "ap-hint", "aria-live": "polite" });
const add = h("button", { class: "cn-btn cn-btn--s", type: "button", onclick: () => {
if (!from.value || !to.value) return (say.textContent = "Choose both days first.");
if (to.value < from.value) return (say.textContent = "The last day comes after the first.");
if (kept.querySelectorAll("input[name=away]").length >= 20) return (say.textContent = "Up to 20 sets of dates.");
kept.append(awayBox({ start: from.value, end: to.value }));
say.textContent = `Added ${dayText(from.value)} to ${dayText(to.value)}.`;
from.value = "";
to.value = "";
from.focus();
} }, "Add dates");
return h("fieldset", { class: "dl-fs" },
h("legend", null, scope.own ? "Dates you are away" : `Dates ${scope.name} is away`),
kept,
h("div", { class: "cn-grid2" }, field("From", from), field("To", to)),
h("div", null, add),
say,
);
}

function rulesDrawer(state, reload, ctx = {}) {
const scope = ctx.scope ?? OWN;

let saved = false;
drawer(scope.own ? "Your rules" : `${scope.name}'s rules`, (close) => {
const l = state.rules ?? {};
const acc = l.accept ?? { mode: "ask" };
const autoAccept = acc.mode === "auto";
const above = input({ name: "above", type: "number", min: "1", step: "1", inputmode: "decimal", value: autoAccept ? String(acc.above / 100) : "", "aria-label": "Accept at or above, in pounds" });
const notice = ctx.notice || state.acceptNotice || null;
const consent = h("div", { class: "ho-consent" },
notice ? h("p", { class: "dl-notice ho-notice" }, notice) : null,
check("I have read this and want Orbe to accept for me.", { name: "acceptSeen", checked: autoAccept }),
);
const ask = h("input", { type: "radio", name: "acceptMode", value: "ask", checked: !autoAccept });
const auto = h("input", { type: "radio", name: "acceptMode", value: "auto", checked: autoAccept });
const sync = () => {
consent.hidden = !auto.checked;
above.disabled = !auto.checked;
above.required = auto.checked;
consent.querySelector("input").required = auto.checked;
};
ask.addEventListener("change", sync);
auto.addEventListener("change", sync);
sync();
const tone = l.tone ?? { style: "warm", signOff: "" };
const f = form(
[
h("fieldset", { class: "dl-fs" },
h("legend", null, scope.own ? "Least you take" : `Least ${scope.name} takes`),
h("div", { class: "cn-grid2" }, PRICED.map(([fm, kind]) => field(`${formatName(fm, kind)} (£)`, input({ name: `min_${fm}`, type: "number", min: "0", step: "1", inputmode: "decimal", value: l.minimums?.[fm] ? String(l.minimums[fm] / 100) : "" })))),
),
field("Brands to avoid", input({ name: "avoidBrands", value: (l.avoidBrands ?? []).join(", "), maxlength: 2000 }), "Separated by commas."),
field("Categories to avoid", input({ name: "avoidCategories", value: (l.avoidCategories ?? []).join(", "), maxlength: 2000 }), "As brands give them, for example gambling, crypto."),
h("div", { class: "cn-grid2" },
field("Most reads a month", input({ name: "maxReads", type: "number", min: "1", max: "60", step: "1", value: l.maxReadsPerMonth ?? "" }), "Leave empty for no limit."),
field("Notice (days)", input({ name: "leadDays", type: "number", min: "0", max: "120", step: "1", value: l.leadDays ?? 7, required: true }), "The least time before a read goes live."),
),
awayDates(l.blockedDates ?? [], scope),
h("fieldset", { class: "dl-fs ho-alone" },
h("legend", null, "What Orbe may do without asking"),
choice("Decline for me", { name: "autoDecline", checked: l.autoDecline !== false, role: "switch" }, `When an offer breaks a rule above: a brand or category you avoid, dates you are away, too little notice or a full month. ${graceWords(state.graceSeconds)}`),
choice("Counter for me", { name: "autoCounter", checked: !!l.autoCounter, role: "switch" }, "Below your floor, at most twice. If a brand accepts a counter, the deal is agreed, with no further tap from you. Money is held until delivery is verified."),
choice("Remind brands to fund", { name: "chase", checked: l.chase !== false, role: "switch" }, "A short email from Orbe to a brand that has not funded an agreed booking."),
),
scope.own
? h("fieldset", { class: "dl-fs ho-accept" },
h("legend", null, "Accepting"),
h("label", { class: "ap-check" }, ask, h("span", null, "Always ask me")),
h("label", { class: "ap-check ho-above" }, auto, h("span", null, "Accept for me at or above £"), above),
consent,
)

: h("div", { class: "dl-fs ho-accept" },
h("p", { class: "ho-h" }, "Accepting"),
h("p", { class: "ho-item-d" }, `${autoAccept ? `Accepts for ${scope.name} at or above ${money({ amount: acc.above, currency: "GBP" })}.` : `Always asks ${scope.name} before accepting.`} Only ${scope.name} can change this.`),
),
h("div", { class: "cn-grid2" },
field("Tone", select(TONES, { name: "tone", value: tone.style })),
field("Sign off as", input({ name: "signOff", maxlength: 40, value: tone.signOff ?? "", autocomplete: "off" })),
),
state.models?.available ? choice("Draft with a model", { name: "modelDrafts", checked: !!l.modelDrafts, role: "switch" }, "Off unless you turn it on. A draft that names a figure Orbe cannot show is replaced by a plain one.") : null,
],
state.enabled ? "Save rules" : "Save and switch on",
async (fd) => {
const minimums = {};
for (const [fm] of PRICED) {
const v = pence(fd.get(`min_${fm}`));
if (v) minimums[fm] = v;
}
const max = String(fd.get("maxReads") ?? "").trim();
const blockedDates = fd.getAll("away").map((x) => String(x).split("|")).map(([start, end]) => ({ start, end }));
const from = String(fd.get("awayFrom") ?? "");
const to = String(fd.get("awayTo") ?? "");
if (from && to && to >= from) blockedDates.push({ start: from, end: to });
const mode = !scope.own ? acc : fd.get("acceptMode") === "auto"
? { mode: "auto", above: pence(fd.get("above")), noticeShownAt: acc.mode === "auto" && acc.noticeShownAt ? acc.noticeShownAt : new Date().toISOString() }
: { mode: "ask" };
const { outbound: _skip, ...kept } = l;
const rules = {
...kept,
minimums,
avoidBrands: list(fd, "avoidBrands"),
avoidCategories: list(fd, "avoidCategories"),
maxReadsPerMonth: max === "" ? null : Number(max),
leadDays: Number(fd.get("leadDays") || 0),
blockedDates,
autoDecline: fd.get("autoDecline") === "on",
autoCounter: fd.get("autoCounter") === "on",
chase: fd.get("chase") === "on",
accept: mode,
tone: { style: String(fd.get("tone") || "warm"), signOff: String(fd.get("signOff") ?? "").trim() },
...(state.models?.available ? { modelDrafts: fd.get("modelDrafts") === "on" } : {}),
};
try {
const r = await api.put(scope.base, { ...(state.enabled ? {} : { enabled: true }), rules });
const asked = toCreator(r);
if (asked) return asked;
} catch (e) {
if (e instanceof SentToOwner) return SENT;
throw e;
}

await api.post(`${scope.base}/run`, {}).catch(() => {});
saved = true;
close();
toast(state.enabled ? "Rules saved. New offers are answered inside them." : "Hand it off is on. New offers are answered within a minute.");
return null;
},
);
f.classList.add("cn-form", "ho-rules-form");
return [h("p", { class: "dl-notice" }, scope.own ? "Orbe answers offers inside these rules and shows you why each time. Anything outside them waits for you." : scope.rules ? `Orbe answers ${scope.name}'s offers inside these rules. ${scope.name} lets you change them; each change is in their activity.` : `Orbe answers ${scope.name}'s offers inside these rules. A change you save goes to ${scope.name} to approve, with each old and new value.`), f];
}, { wide: true, onClose: () => saved && reload() });
}


function doneList(recent, limit) {
return h("ul", { class: "ho-list ho-list--done" }, recent.slice(0, limit).map((a) =>
h("li", { class: "ho-done" },
h("p", { class: "ho-item-t" }, headline(a)),
h("p", { class: "ho-item-d" }, [a.why, a.kind === "counter" && a.state === "done" ? counterLine(a) : null].filter(Boolean).join(" ")),
h("time", { class: "ho-at", datetime: a.doneAt ?? a.createdAt }, ago(a.doneAt ?? a.createdAt)),
),
));
}
function allDone(recent) {
drawer("Done this week", () => [
h("p", { class: "dl-notice" }, "Everything Orbe's assistant did or proposed in the last seven days, with the rule it followed."),
table([["What"], ["Why"], ["When"]], recent.map((a) => [twoLine(headline(a), a.kind === "counter" && a.state === "done" ? counterLine(a) : null), a.why ?? "", ago(a.doneAt ?? a.createdAt)]), { caption: "Done this week" }),
], { wide: true });
}

function group(id, title, items, opts) {
if (!items.length) return null;
id = `${opts.scope?.own === false ? "hr" : "ho"}-${id}`;
return h("section", { class: "ho-group", "aria-labelledby": id },
h("h3", { class: "ho-h", id }, title, h("span", { class: "ho-n" }, String(items.length))),
h("ul", { class: "ho-list" }, items.map((a) => actionItem(a, opts))),
);
}

const keepAs = (el, key) => ((el.dataset.keep = key), el);

function switchRow(label, checked, hint, send, say, keep) {
const row = choice(label, { checked, role: "switch" }, hint);
const box = row.querySelector("input");
box.dataset.keep = keep;

let busy = false;
box.addEventListener("change", async () => {
if (busy) return (box.checked = !box.checked);
const want = box.checked;
busy = true;
box.setAttribute("aria-busy", "true");
try {
await send(want);
} catch (e) {
box.checked = !want;
say(e instanceof SentToOwner ? SENT : e.message ?? "That did not work. Try again.");
} finally {
busy = false;
box.removeAttribute("aria-busy");
}
});
return row;
}

function handoffCard(ctx = {}) {
const scope = ctx.scope ?? OWN;

const slot = h("div", { class: "ho-slot is-loading" }, skeleton(4));
let timer = 0;
const load = async (focusId) => {
clearTimeout(timer);
let s;
let sender = null;
try {
[s, sender] = await Promise.all([scope.read(), scope.own && on("deals_agent") && can("read.money") ? api.get("/v1/me/deals/sender").then((r) => r.sender, () => null) : null]);
} catch {

if (slot.classList.contains("is-loading")) slot.replaceChildren();
slot.classList.remove("is-loading");
return;
}
slot.classList.remove("is-loading");
if (!s || !slot.isConnected) return slot.replaceChildren();

const keep = slot.contains(document.activeElement) ? document.activeElement.dataset.keep : null;
slot.replaceChildren(draw(s, sender));
if (keep) slot.querySelector(`[data-keep="${keep}"]`)?.focus({ preventScroll: true });

const due = (s.queue ?? []).filter((a) => a.state === "scheduled" && a.runAt).map((a) => Date.parse(a.runAt)).filter(Number.isFinite);
const first = due.length ? Math.min(...due) - Date.now() : null;
if (first !== null && s.demo && scope.own && first < SHORT_MS) {

timer = setTimeout(async () => {
if (!slot.isConnected) return;
await api.post(`${scope.base}/run`, {}).catch(() => {});
load();
notesChanged();
}, Math.max(1_000, first + 1_000));
} else if (first !== null && first + 65_000 < 3_600_000) timer = setTimeout(() => slot.isConnected && load(), Math.max(5_000, first + 65_000));
if (focusId) reveal(focusId);
};
const reveal = (id) => {
const item = slot.querySelector(`[data-id="${CSS.escape(id)}"]`);
if (!item) return toast("That one is no longer waiting. What Orbe did is under Done this week.");
item.classList.add("is-asked");
item.querySelector("details")?.setAttribute("open", "");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
item.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });

item.querySelector(".ho-item-t")?.focus({ preventScroll: true, focusVisible: false });
};
const draw = (s, sender) => {
const note = h("div", { class: "ho-say", role: "status" });
const say = (text) => note.replaceChildren(h("p", null, text));
const changed = () => (load(), notesChanged(), ctx.changed?.());
const approved = (a) => (notesChanged(), ctx.reload ? ctx.reload({ open: a.offerId ? { offerId: a.offerId } : null }) : changed());
const open = ctx.reload ? (a) => ctx.reload({ open: { offerId: a.offerId } }) : null;
const editRules = () => rulesDrawer(s, changed, { ...ctx, scope });
const tag = sampleTag();
if (!s.enabled) {
return section(
{ title: "Hand it off", line: scope.own ? "Set your rules once. Orbe answers new offers inside them. Nothing is agreed unless your rules allow it." : `Off for ${scope.name}. Orbe answers new offers inside their rules once it is on. Nothing is agreed unless the rules allow it.`, actions: tag, cls: "ho ho--off" },
scope.may("business") ? h("div", { class: "cn-dw-actions" }, button(scope.own ? "Set your rules" : "Set rules", () => editRules(), { primary: true })) : h("p", { class: "ho-item-d" }, "The team's owner sets the rules."),
note,
);
}
const queue = s.queue ?? [];
const recent = s.recent ?? [];

const shown = recent.filter((a) => a.state !== "superseded");

const head = [
tag,
scope.may("business")
? switchRow("Answering offers", true, null, async () => {
const asked = toCreator(await api.put(scope.base, { enabled: false }));
if (asked) throw new Error(asked);
toast("Hand it off is off. Nothing waiting was sent.");
changed();
}, say, "handoff")
: null,
scope.may("business") ? keepAs(button("Rules", () => editRules(), { quiet: true }), "rules") : null,
];
const paused = sender?.paused ? h("p", { class: "ho-paused" }, "Sending is paused after bounces. Orbe will draft but not send.") : null;
const outbound = s.outbound ?? { on: false, perWeek: 3, sentThisWeek: 0 };
const outHint = `Up to ${outbound.perWeek} ${outbound.perWeek === 1 ? "brand" : "brands"} a week that sponsor creators like you. Each email waits for your approval.${outbound.on && outbound.sentThisWeek ? ` ${outbound.sentThisWeek} sent this week.` : ""}`;
const foot = h("div", { class: "ho-foot" },
scope.may("consent")
? switchRow("Propose my slots to brands", !!outbound.on, outHint, async (want) => {
await api.put("/v1/me/deals/handoff/outbound", { on: want, perWeek: outbound.perWeek });
toast(want ? "On. Each email waits for your approval." : "Off. Orbe writes to no brand on its own.");
changed();
}, say, "outbound")
: h("p", { class: "ho-item-d" }, outbound.on ? `Proposing ${scope.own ? "your" : `${scope.name}'s`} slots to up to ${outbound.perWeek} brands a week.` : `Not proposing ${scope.own ? "your" : `${scope.name}'s`} slots to brands.`),
s.demo && scope.own && can("business") && s.sampleOffersLeft > 0
? button(`Send a sample offer (${4 - s.sampleOffersLeft} of 3)`, async () => {
const r = await api.post("/v1/me/deals/handoff/demo-offer", {});
const first = r?.actions?.[0];
await load(first?.id);
notesChanged();
return null;
})
: null,
);
return section(
{ title: "Hand it off", line: "On. New offers are answered within a minute.", actions: head, cls: "ho" },
s.summary?.length ? h("ul", { class: "ho-rules", "aria-label": scope.own ? "Your rules" : `${scope.name}'s rules` }, s.summary.map((line) => h("li", null, line))) : null,
paused,
note,
group("waiting", scope.own ? "Waiting on you" : "Waiting", queue.filter((a) => a.state === "waiting"), { changed, approved, open, scope }),
group("soon", "About to happen", queue.filter((a) => a.state === "scheduled"), { changed, approved, scope }),
recent.length
? h("section", { class: "ho-group", "aria-labelledby": "ho-done" },
h("h3", { class: "ho-h", id: "ho-done" }, "Done this week"),
shown.length ? doneList(shown, 3) : null,
recent.length > Math.min(shown.length, 3) ? h("div", null, button("See all", () => allDone(recent), { quiet: true })) : null,
)
: null,
!queue.length && !recent.length ? h("p", { class: "ho-empty" }, "Nothing yet. New offers will show here with what Orbe did and why.") : null,
foot,
);
};
load(ctx.focus ?? undefined);
return slot;
}
});
__o.d("js/icons.js", function (__x) {
"use strict";
__o.e(__x, { icon: () => icon, ICONS: () => ICONS });

const P = {
home: "M2.5 7.2 8 2.5l5.5 4.7V13a.5.5 0 0 1-.5.5H9.5V10h-3v3.5H3a.5.5 0 0 1-.5-.5z",
explore: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z",
library: "M2.5 3.5h3v9h-3zM6.5 3.5h3v9h-3zM10.4 4l2.9-.8 2 8.7-2.9.7z",
studio: "M2.5 13.5 9 7M10.5 2.5v2M13.5 5.5h-2M12.6 3.4l-1.3 1.3M9.5 2.5l.6 1.4M13.5 9.5l-1.4-.6",
earn: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM10 5.8C9.6 5.2 8.9 5 8 5c-1.2 0-2 .6-2 1.5S6.8 7.8 8 8s2 .7 2 1.5S9.2 11 8 11c-.9 0-1.7-.3-2-.9M8 3.8V5M8 11v1.2",
code: "M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5",
settings: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1",
search: "M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6 14 14",
bell: "M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.5 14h3",
help: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.1v.4M8 11.4v.1",
book: "M2.5 3.2c1.8-.6 3.6-.4 5.5.8v9.5c-1.9-1.2-3.7-1.4-5.5-.8zM13.5 3.2c-1.8-.6-3.6-.4-5.5.8v9.5c1.9-1.2 3.7-1.4 5.5-.8z",
chevron: "M4.5 6.5 8 10l3.5-3.5",
chevronRight: "M6.5 4.5 10 8l-3.5 3.5",
plus: "M8 3v10M3 8h10",
star: "m8 2.3 1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11.1 4.5 13l.8-3.9-2.9-2.7 3.9-.5z",
folder: "M2 4.5c0-.6.4-1 1-1h3l1.5 1.5H13c.6 0 1 .4 1 1V12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1z",
grid: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
list: "M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5",
filter: "M2 3.5h12L9.5 9v4l-3 1.5V9z",
close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
arrowUp: "M8 13V3M3.5 7.5 8 3l4.5 4.5",
arrowRight: "M3 8h10M8.5 3.5 13 8l-4.5 4.5",
external: "M9 2.5h4.5V7M13.5 2.5 7 9M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3",
copy: "M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3",
check: "M3 8.5 6.5 12 13 4.5",
clock: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5",
play: "M5 3.2v9.6L12.8 8z",
mic: "M8 1.8a2 2 0 0 0-2 2v3.7a2 2 0 0 0 4 0V3.8a2 2 0 0 0-2-2zM4.2 7.4a3.8 3.8 0 0 0 7.6 0M8 11.2v3M5.8 14.2h4.4",
phone: "M5 1.5h6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7 6v4l3-2z",
camera: "M2.5 5.5a1 1 0 0 1 1-1h1.8l1-1.5h3.4l1 1.5h1.8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM8 11a2.3 2.3 0 1 0 0-4.6A2.3 2.3 0 0 0 8 11z",
box: "M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11zM2.5 5 8 7.5 13.5 5M8 7.5v6",
sun: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9",
moon: "M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z",
monitor: "M2 3h12v8H2zM6 14h4M8 11v3",
logout: "M6 13.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h3M10.5 11 13.5 8l-3-3M13.5 8H6",
user: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4",
key: "M10.5 9a3.5 3.5 0 1 0-3.4-2.6L2.5 11v2.5H5V12h1.5v-1.5H8l.9-.9A3.5 3.5 0 0 0 10.5 9zM11 5h.01",
plug: "M5.5 2v3.5M10.5 2v3.5M3.5 5.5h9V8a4.5 4.5 0 0 1-9 0zM8 12.5V15",
shield: "M8 1.8 13 3.7v4c0 3.1-2.1 5.6-5 6.5-2.9-.9-5-3.4-5-6.5v-4z",
trash: "M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.8v4M9.2 6.8v4",
card: "M1.5 4h13v8.5h-13zM1.5 6.8h13M4 10h3",
chart: "M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5",
bolt: "M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z",
menu: "M2 4h12M2 8h12M2 12h12",
sliders: "M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6M10.5 3v3M5.5 10v3",
link: "M6.5 9.5l3-3M7 4.5l1.3-1.3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.3 1.3a2.5 2.5 0 0 1-3.5-3.5L5.5 8",
mail: "M2 3.5h12v9H2zM2.5 4l5.5 4.5L13.5 4",
scales: "M8 2.5v11M4.5 13.5h7M3 4.5h10M3 4.5 1.5 8.5h3zM13 4.5l-1.5 4h3zM1.5 8.5a1.5 1.5 0 0 0 3 0M11.5 8.5a1.5 1.5 0 0 0 3 0",
megaphone: "M2.5 6.5v3h2l5 3v-9l-5 3zM12 6a2.5 2.5 0 0 1 0 4M4.5 9.5 5.5 13h1.5l-.5-3",
sparkle: "M8 1.8 9.4 6.6 14.2 8 9.4 9.4 8 14.2 6.6 9.4 1.8 8 6.6 6.6z",
pulse: "M1.5 8.5h3l1.5-4 3 8 1.5-4h4",
people: "M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.4-2.2 2.1-3.5 4.5-3.5s4.1 1.3 4.5 3.5M11 7a2 2 0 1 0 0-4M12.5 10.2c1.1.5 1.8 1.6 2 3.3",
doc: "M4 1.5h5.5L12.5 4.5V14a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5zM9.5 1.5v3h3M5.5 8h5M5.5 10.5h5",
image: "M2 3h12v10H2zM2 10.5l3.5-3.5 3 3 2-2L14 11.5M10.5 6.5h.01",
enter: "M13 3v5.5a1 1 0 0 1-1 1H3.5M6 7 3.5 9.5 6 12",
status: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 8h.01",
dots: "M3.5 8h.01M8 8h.01M12.5 8h.01",
};
const NS = "http://www.w3.org/2000/svg";

function icon(name, opts = {}) {
const svg = document.createElementNS(NS, "svg");
svg.setAttribute("viewBox", "0 0 16 16");
svg.setAttribute("class", `cn-i${opts.cls ? ` ${opts.cls}` : ""}`);
svg.setAttribute("fill", name === "star" && opts.filled ? "currentColor" : name === "play" ? "currentColor" : "none");
svg.setAttribute("stroke", "currentColor");
svg.setAttribute("stroke-width", "1.5");
svg.setAttribute("stroke-linecap", "round");
svg.setAttribute("stroke-linejoin", "round");
svg.setAttribute("focusable", "false");
if (opts.label) {
svg.setAttribute("role", "img");
svg.setAttribute("aria-label", opts.label);
} else svg.setAttribute("aria-hidden", "true");
const path = document.createElementNS(NS, "path");
path.setAttribute("d", P[name] ?? P.dots);
svg.append(path);
return svg;
}
const ICONS = Object.keys(P);
});
__o.d("js/install.js", function (__x) {
"use strict";
__o.e(__x, { installable: () => installable, installState: () => installState, install: () => install, registration: () => registration, signedOut: () => signedOut });
const { h } = __o.r("js/ui.js");

const url = document.querySelector('meta[name="orbe-sw"]')?.content ?? null;
const sw = "serviceWorker" in navigator ? navigator.serviceWorker : null;

const installable = Boolean(url && sw);
let offer = null;
window.addEventListener("beforeinstallprompt", (e) => {
e.preventDefault();
offer = e;
window.dispatchEvent(new Event("orbe:install-changed"));
});
window.addEventListener("appinstalled", () => {
offer = null;
window.dispatchEvent(new Event("orbe:install-changed"));
});
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function installState() {
if (standalone()) return "installed";
if (offer) return "offer";
if (apple()) return "apple";
return "none";
}

async function install() {
if (!offer) return false;
const e = offer;
offer = null;
e.prompt();
const { outcome } = await e.userChoice;
window.dispatchEvent(new Event("orbe:install-changed"));
return outcome === "accepted";
}
let ready = null;

const registration = () => ready ?? Promise.resolve(null);

function signedOut() {
sw?.controller?.postMessage({ type: "signed-out" });
}
function bar(text, ...more) {
return h("div", { class: "cn-appline", role: "status" }, h("span", null, text), ...more);
}
let offlineLine = null;
function online() {
if (navigator.onLine) {
offlineLine?.remove();
offlineLine = null;
} else if (!offlineLine) {
offlineLine = bar("You are offline. What you see was kept from your last visit.");
document.body.append(offlineLine);
}
}
let accepted = false;
function offerUpdate(waiting) {
if (document.querySelector(".cn-appline--update")) return;
const line = bar(
"A new version of Orbe is ready.",
h("button", {
class: "cn-appline-b",
type: "button",
onclick: () => {
accepted = true;
line.remove();
waiting.postMessage({ type: "skip-waiting" });
},
}, "Reload"),
);
line.classList.add("cn-appline--update");
document.body.append(line);
}
if (installable) {
window.addEventListener("online", online);
window.addEventListener("offline", online);
if (!navigator.onLine) online();
sw.addEventListener("controllerchange", () => {

if (accepted) location.reload();
});
sw.addEventListener("message", (e) => {
const t = e.data?.type;
if (t === "boot-changed") window.dispatchEvent(new Event("orbe:boot-changed"));
else if (t === "open" && typeof e.data.url === "string") window.dispatchEvent(new CustomEvent("orbe:open", { detail: e.data.url }));
});
const start = async () => {
const reg = await sw.register(url, { scope: "/orbe-site/demo/app/" }).catch(() => null);
if (!reg) return null;
const watch = (w) => w?.addEventListener("statechange", () => w.state === "installed" && sw.controller && offerUpdate(w));
if (reg.waiting && sw.controller) offerUpdate(reg.waiting);
reg.addEventListener("updatefound", () => watch(reg.installing));
return sw.ready;
};
ready = new Promise((resolve) => {
const go = () => start().then(resolve, () => resolve(null));
if (document.readyState === "complete") go();
else window.addEventListener("load", go, { once: true });
});
}
});
__o.d("js/main.js", function (__x) {
"use strict";
__o.e(__x, { go: () => go });
const { api, boot: bootCall, bundle, can, features, seg, signInWays } = __o.r("js/api.js");
const { failure, h, loading, toast } = __o.r("js/ui.js");
const { forgetNotifications } = __o.r("js/notify.js");
const { ADMIN, BASE, BRAND, CREATOR, match, screensFor } = __o.r("js/routes.js");
const { drawFrame, markHere } = __o.r("js/shell.js");
const { signedOut } = __o.r("js/install.js");

let main = document.getElementById("main");
let framed = null;
let user = null;
let brandReady = null;
let seq = 0;
let first = true;

let welcomeLooked = false;
let tourLooked = false;
window.addEventListener("orbe:welcome-done", () => (tourLooked = false));
const rest = () => {
const p = location.pathname;
return p === BASE || p.startsWith(`${BASE}/`) ? p.slice(BASE.length).replace(/^\/+|\/+$/g, "") : "";
};

let toTop = false;
function go(path, opts = {}) {
const before = location.href;
history[opts.replace ? "replaceState" : "pushState"](null, "", path);
if (tabOnly(before)) return;
toTop = true;
render();
}

function tabOnly(before) {
const a = new URL(before);
const b = new URL(location.href);
if (a.pathname !== b.pathname) return false;
a.searchParams.delete("tab");
b.searchParams.delete("tab");
if (a.search !== b.search) return false;
const set = main.querySelector("[data-address-tabs]");
if (!set) return false;
set.dispatchEvent(new Event("orbe:address"));
return true;
}

let shown = location.href;
const inApp = (a) => {
if (!a || a.target || a.hasAttribute("download")) return null;
const u = new URL(a.href, location.href);
return u.origin === location.origin && (u.pathname === BASE || u.pathname.startsWith(`${BASE}/`)) ? u : null;
};
document.addEventListener("click", (e) => {
if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
const u = inApp(e.target.closest?.("a[href]"));
if (!u) return;
e.preventDefault();
go(u.pathname + u.search + u.hash);
});

let table = [];
const WARM = {
"works/:id": (p) => [`/v1/me/works/${seg(p.id)}/full`],
};
const screenOf = (path) => (path === BASE ? "" : path.slice(BASE.length).replace(/^\/+|\/+$/g, ""));
function warm(found, screen) {
__o.i("js/main.js", found.route.module).catch(() => {});
bundle(screen || "home").catch(() => {});
for (const path of WARM[found.route.path]?.(found.params) ?? []) api.warm(path).catch(() => {});
}
let rested = 0;
function warmLink(e) {
if (!user) return;

const a = e.target.closest?.("a[href]") ?? e.target.closest?.(".cn-vt-tr")?.querySelector(":scope > a[href]");
const u = inApp(a);
if (!u) return;
const screen = screenOf(u.pathname);
const found = match(table, screen);
if (!found) return;
clearTimeout(rested);

if (e.type === "pointerover" && e.pointerType === "mouse") rested = setTimeout(() => warm(found, screen), 60);
else warm(found, screen);
}
document.addEventListener("pointerover", warmLink, { passive: true });
document.addEventListener("pointerout", () => clearTimeout(rested), { passive: true });
document.addEventListener("touchstart", warmLink, { passive: true });
document.addEventListener("focusin", warmLink);
window.addEventListener("popstate", () => {
const was = shown;
shown = location.href;
if (!tabOnly(was)) render();
});

window.addEventListener("orbe:sent-to-owner", () => {
forgetNotifications();
window.dispatchEvent(new Event("orbe:notes-changed"));
toast("Sent to the owner to approve. Nothing has happened yet.", { href: `${BASE}/settings/team?tab=approvals`, label: "See the request" });
});



let bootAt = 0;
let reread = false;
window.addEventListener("orbe:boot-changed", async () => {
if (!user || reread) return;
reread = true;
try {
user = await bootCall(rest() || "home");
} catch {
return;
}
const busy = main.contains(document.activeElement) && document.activeElement !== main;
if (!user || (Date.now() - bootAt < 10_000 && !busy)) render();
});

window.addEventListener("orbe:open", (e) => {
const u = new URL(e.detail, location.href);
if (u.origin === location.origin && (u.pathname === BASE || u.pathname.startsWith(`${BASE}/`))) go(u.pathname + u.search);
});

const MOVED = "orbe.team-moved";
let restarting = false;
function teamMoved() {
if (restarting) return;
restarting = true;
keepFrame(null);
try {
sessionStorage.setItem(MOVED, "1");
} catch {

}
location.reload();
}
let switching = false;
window.addEventListener("orbe:switching", (e) => (switching = e.detail === true));
window.addEventListener("orbe:team-changed", () => switching || teamMoved());
window.addEventListener("pageshow", async (e) => {
if (!e.persisted || !user) return;
try {
const s = await (await fetch("/v1/auth/session", { credentials: "same-origin", headers: { accept: "application/json" } })).json();
if ((s?.team?.id ?? null) !== (user.team?.id ?? null) || (s?.user?.id ?? null) !== (user.person ?? user).id) teamMoved();
} catch {

}
});
try {
new BroadcastChannel("orbe-team").addEventListener("message", (e) => {

if (user && !switching && e.data?.team && e.data.team !== user.team?.id) teamMoved();
});
} catch {

}
window.addEventListener("orbe:signed-out", () => {
keepFrame(null);
if (!user) return;
user = null;
render();
});
async function signOut() {
keepFrame(null);
try {
await api.post("/v1/auth/logout");
} catch {

}
user = null;
brandReady = null;
go(`${BASE}/signin`);
}

async function isBrand() {
if (brandReady !== null) return brandReady;
try {
await api.get("/v1/brand/profile");
brandReady = true;
} catch (e) {
if (e.code === "not_a_brand") brandReady = false;
else throw e;
}
return brandReady;
}
async function render() {
const n = ++seq;
shown = location.href;
const query = new URLSearchParams(location.search);
const ctx = { user, params: {}, query, go, refresh: () => render(), brandSaved: () => (brandReady = true) };
if (!user) {
framed = null;

signedOut();
await drawFrame(null, [], { go, signOut });
document.title = "Sign in: Orbe";
document.body.dataset.screen = "signin";
const m = await __o.i("js/main.js", "./signin.js");
if (n !== seq) return;
main.replaceChildren();
m.render(main, { ...ctx, ways: signInWays() });
settle();
return;
}

if (rest() === "signin") {
go(`${BASE}/${location.search}`, { replace: true });
return;
}


if (rest() === "invite" || (user.team && user.team.role !== "owner")) welcomeLooked = true;
if (!welcomeLooked) {
welcomeLooked = true;

const [w, teams] = await Promise.all([api.get("/v1/me/welcome").then((r) => r.welcome, () => null), api.get("/v1/teams").then((r) => r.teams, () => [])]);
if (n !== seq) return;
if (w?.due && teams.length < 2 && rest() !== "welcome" && rest() !== "podcasts/confirm") {
go(`${BASE}/welcome`, { replace: true });
return;
}
}
table = screensFor(user, [...features]);
if (framed !== user) {
framed = user;
await drawFrame(user, table, { go, signOut });
}
let found = match(table, rest());

const first = table.find((r) => !r.hidden && r.path !== "");
if (!found && rest() === "" && first) {
go(`${BASE}/${first.path}`, { replace: true });
return;
}
if (!found) {
const own = user.type === "creator" ? CREATOR : BRAND;
const off = match([...own, ...((user.roles ?? []).includes("admin") ? ADMIN : [])], rest());
const other = off ? null : match(user.type === "creator" ? BRAND : CREATOR, rest());

const role = off?.route.needs && !can(off.route.needs) ? user.team?.role ?? null : null;
document.title = "Not here: Orbe";
markHere(off?.route ?? { path: rest(), name: "Not here", hidden: true }, off?.params);
main.replaceChildren(
h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, role ? "Not part of your role" : off ? "Not available yet" : other ? "This is for the other side of Orbe" : "Nothing here"),
h("p", { class: "ap-lede" }, role ? `As ${/^[aeiou]/.test(role) ? "an" : "a"} ${role} on ${user.team?.name ?? "this team"}, you do not see this. The owner can change your role in Settings, Team.` : off ? "This part of Orbe is switched off for now." : other ? `You are signed in as a ${user.type === "creator" ? "creator" : "brand"}. Sign out and back in with the other kind of account to open it.` : "That page is not part of the app."),
table.length ? h("p", null, h("a", { class: "ob-lnk", href: `${BASE}/` }, "Go to Home")) : null,
);
settle();
return;
}
if (user.type === "buyer" && found.route.brand && features.has("sponsorships")) {
loading(main);
try {
const brand = await isBrand();
if (n !== seq) return;

if (!brand && user.team?.kind === "agency") {
if (table.some((r) => r.path === "roster")) {

if (found.route.path !== "") toast(`${found.route.name} is for brands buying sponsorships. Your creators and their deals are in the Roster.`);
go(`${BASE}/roster`, { replace: true });
return;
}
document.title = `${found.route.name}: Orbe`;
markHere(found.route, found.params);
main.replaceChildren(
h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, found.route.name),
h("p", { class: "ap-lede" }, `This part of Orbe is for brands buying sponsorships. ${user.team.name} is an agency: your creators and their deals are in the Roster.`),
h("p", null, h("a", { class: "ob-lnk", href: `${BASE}/roster` }, "Go to the Roster")),
);
settle();
return;
}
if (!brand) found = { route: BRAND.find((r) => r.path === "profile"), params: {}, setup: true };
} catch (e) {
main.removeAttribute("aria-busy");
main.replaceChildren(failure(e, () => render()));
return;
}
}

if (found.moved !== null && found.moved !== undefined) history.replaceState(history.state, "", `${BASE}/${found.moved}${location.search}${location.hash}`);
document.title = `${found.route.name}: Orbe`;
markHere(found.route, found.params);

const layout = found.route.path === "invite" ? "welcome" : found.route.path || "home";

main.setAttribute("aria-busy", "true");
const slow = setTimeout(() => n === seq && waiting(found.route, layout), 150);
try {

const [m] = await Promise.all([__o.i("js/main.js", found.route.module), bundle(rest() || "home"), ...(WARM[found.route.path]?.(found.params) ?? []).map((p) => api.warm(p).catch(() => {}))]);
clearTimeout(slow);
if (n !== seq) return;
await swap(() => m.render(main, { ...ctx, params: found.params, setup: found.setup === true }), layout);
if (found.route.path === "" && !tourLooked && n === seq) {
tourLooked = true;
const w = await api.get("/v1/me/welcome").then((r) => r.welcome, () => null);
if (w?.tourDue && n === seq) (await __o.i("js/main.js", "./tour.js")).startTour(user);
}
} catch (e) {
clearTimeout(slow);
if (n !== seq) return;
document.body.dataset.screen = layout;
main.removeAttribute("aria-busy");

main.replaceChildren(h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, found.route.name), failure(e, () => render()));
}
settle();
}

const bars = (n) => h("span", { class: "cn-skel", "aria-hidden": "true" }, Array.from({ length: n }, () => h("span", { class: "cn-skel-line" })));
const quiet = (cls) => h("span", { class: `cn-skel-q ${cls}`, "aria-hidden": "true" });

const toolPage = (body) => (name) =>
h("div", { class: "cn-tp cn-ts" },
h("header", { class: "cn-tp-head cn-ph" }, quiet("cn-skel-q--tile"), h("div", { class: "cn-tp-names" }, h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--line"))),
h("div", { class: "cn-ts-work cn-skel", "aria-hidden": "true" }, body()),
);
const SHAPES = {
library: (name) =>
h("div", { class: "cn-lib cn-lib--wait" },
h("nav", { class: "cn-lib-side", "aria-hidden": "true" }, bars(6)),
h("section", { class: "cn-lib-main" },
h("header", { class: "cn-lib-head" }, h("div", null, h("h1", { class: "cn-lib-title", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--count")), h("span", { class: "cn-grow" }), quiet("cn-skel-q--tools")),
h("div", { class: "cn-vt cn-vt--skel", "aria-hidden": "true" }, h("div", { class: "cn-vt-head" }), Array.from({ length: 8 }, () => h("div", { class: "cn-vt-tr" }, h("span", { class: "cn-vt-skel" })))),
),
),
deals: toolPage(() => [h("div", { class: "cn-skel-q--stats" }, [0, 1, 2, 3].map(() => quiet("cn-skel-q--stat"))), quiet("cn-skel-q--tabs"), quiet("cn-skel-q--panel")]),
record: toolPage(() => [quiet("cn-skel-q--tabs"), quiet("cn-skel-q--panel")]),
explore: (name) => [
h("header", { class: "cn-pagehead cn-pagehead--s" }, h("div", null, h("h1", { class: "cn-h1", tabindex: "-1", "data-title": "" }, name), quiet("cn-skel-q--line"))),
h("div", { class: "cn-skel", "aria-hidden": "true" },
h("div", { class: "cn-explore-bar" }, quiet("cn-skel-q--search")),
h("div", { class: "cn-toolrows" }, Array.from({ length: 6 }, () => quiet("cn-skel-q--toolrow"))),
),
],
"works/:id": (name) => [
h("div", { class: "cn-tp cn-ts" }, h("header", { class: "cn-tp-head cn-ph" }, h("div", { class: "cn-tp-names" }, h("h1", { class: "cn-tp-title ap-h1", tabindex: "-1", "data-title": "" }, name)))),
h("div", { class: "cn-skel-hero", "aria-hidden": "true" }, h("span", { class: "cn-skel-box" }), h("span", { class: "cn-skel-box" })),
bars(4),
],
};
function waiting(route, layout, who = user) {
document.body.dataset.screen = layout;
main.setAttribute("aria-busy", "true");
const shape = route.path === "" && who?.type === "creator" ? () => homeShape(who) : SHAPES[route.path];
main.replaceChildren(
h("p", { class: "ob-sr", role: "status" }, `Loading ${route.name}.`),
...[(shape ?? ((name) => [h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, name), h("div", { class: "cn-loading" }, bars(4))]))(route.name)].flat(),
);
}

function homeShape(who) {
const hour = new Date().getHours();
const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
const first = ((who.person ?? who).displayName ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/)[0] || "";
return h("div", { class: "cn-home cn-home--top" },
h("h1", { class: "cn-home-hi", tabindex: "-1", "data-title": "" }, first ? `${part}, ${first}.` : `${part}.`),
h("div", { class: "cn-composer cn-skel cn-skel-composer", "aria-hidden": "true" }),
matchMedia("(max-width: 899px)").matches ? null : h("div", { class: "cn-quick", "aria-hidden": "true" }, [0, 1, 2].map(() => quiet("cn-skel-q--quick"))),
);
}

const still = matchMedia("(prefers-reduced-motion: reduce)");
async function swap(draw, layout) {
const put = () => {

const fresh = main.cloneNode(false);
fresh.removeAttribute("aria-busy");
fresh.classList.remove("is-entering");
main.replaceWith(fresh);
main = fresh;
document.body.dataset.screen = layout;
if (toTop) window.scrollTo(0, 0);
toTop = false;
return draw();
};
if (still.matches || first || !document.startViewTransition) {
const done = put();
if (!still.matches && !first) {
main.classList.remove("is-entering");
void main.offsetWidth;
main.classList.add("is-entering");
}
return done;
}
let done;
const vt = document.startViewTransition(() => {
done = put();
return Promise.race([done, new Promise((r) => setTimeout(r, 80))]);
});
vt.ready.catch(() => {});
await vt.updateCallbackDone;
return done;
}

function settle() {
main.removeAttribute("aria-busy");
if (first) {
first = false;
return;
}
(main.querySelector("[data-focus-first]") ?? main.querySelector("[data-title]"))?.focus({ preventScroll: true });
}

function demoBanner() {
const ways = signInWays();
if (!(ways.demo || ways.sample) || document.querySelector(".cn-demo")) return;
document.body.prepend(h("p", { class: "cn-demo", role: "note" }, h("b", null, ways.demo ? "Demo" : "Sample"), " Everything here is made up: no real creator, brand, figure or payment."));
}

const SIDE = "orbe.side";
const FRAME = "orbe.frame";
const keepFrame = (u) => {
try {
if (!u) return localStorage.removeItem(FRAME);
const { type, id, displayName, email, roles, person, team } = u;
localStorage.setItem(FRAME, JSON.stringify({ user: { type, id, displayName, email, roles, person, team }, features: [...features] }));
} catch {

}
};
window.addEventListener("orbe:switching", (e) => e.detail === true && keepFrame(null));
function fetchScreenEarly() {
let found = null;
let hint = null;
try {
const side = localStorage.getItem(SIDE);
hint = side ? JSON.parse(localStorage.getItem(FRAME) ?? "null") : null;
if (hint?.user?.type !== (side === "buyer" ? "buyer" : "creator")) hint = null;
found = side ? match(hint ? screensFor(hint.user, hint.features) : side === "buyer" ? BRAND : CREATOR, rest()) : null;
} catch {

}
if (found) __o.i("js/main.js", found.route.module).catch(() => {});
const full = ["welcome", "invite", "signin"].includes(found?.route.path ?? rest());
if (hint && found && !full) {
const screens = screensFor(hint.user, hint.features);
drawFrame(hint.user, screens, { go, signOut, provisional: true });
markHere(found.route, found.params);
waiting(found.route, found.route.path || "home", hint.user);
} else if (found && found.route.path && !full) waiting(found.route, found.route.path);
else loading(main, "Loading your Orbe.");
}
async function boot() {
fetchScreenEarly();
try {

user = await bootCall(rest() || "home");
} catch (e) {
main.removeAttribute("aria-busy");
main.replaceChildren(failure(e, boot));
return;
}
try {
if (user) localStorage.setItem(SIDE, user.type);
} catch {

}
keepFrame(user);
demoBanner();
bootAt = Date.now();
render();
try {
if (sessionStorage.getItem(MOVED) && user?.team) toast(`This page was open on another team. You are now working in ${user.team.name}.`);
sessionStorage.removeItem(MOVED);
} catch {

}
}
boot();
});
__o.d("js/notify.js", function (__x) {
"use strict";
__o.e(__x, { approvalsWaiting: () => approvalsWaiting, forgetNotifications: () => forgetNotifications, loadNotifications: () => loadNotifications, watchNotifications: () => watchNotifications });
const { api, can, currentTeam, on } = __o.r("js/api.js");
const { plural } = __o.r("js/ui.js");
const { headline, queueItems } = __o.r("js/creator/handoff.js");

const CREATOR_MOVES = { in_production: "Deliver", changes_requested: "Revise the draft for", ready: "Go live for", short: "Choose a remedy for", make_good: "Make good for" };
const BRAND_MOVES = { awaiting_funds: "Fund the booking with", draft_review: "Review the draft from" };
const settle = (p) => p.then((v) => v, () => null);

const kept = (path) => api.get(path);
const afresh = (path) => api.fresh(path);
let cached = { at: 0, items: [], key: "" };

async function approvalItems(get) {
const team = currentTeam();
if (!team) return [];
const r = await settle(get("/v1/team/approvals?state=pending"));

const list = (r?.approvals ?? []).filter((a) => !String(a.requestedBy?.id ?? "").startsWith("assistant:"));
if (!list.length) return [];
const href = "/orbe-site/demo/app/settings/team?tab=approvals";
if (team.role === "owner") {
const first = list[0];
return [{ title: list.length === 1 ? "A request waits for you" : `${plural(list.length, "request")} wait for you`, line: first.summary, href, kind: "approval", count: list.length, n: list.length }];
}
return [{ title: `Waiting for the owner: ${plural(list.length, "request")}`, line: list[0].summary, href, kind: "approval", count: 0, n: list.length }];
}

async function approvalsWaiting(user) {
const items = await loadNotifications(user);
return items.find((i) => i.kind === "approval")?.count ?? 0;
}

const forgetNotifications = () => (cached = { at: 0, items: [], key: "" });

async function handoffItems(get) {
if (!on("deals_agent") || !can("read.money")) return { items: [], offers: new Set() };
const s = await settle(get("/v1/me/deals/handoff"));
return { items: queueItems(s), offers: new Set((s?.queue ?? []).map((a) => a.offerId).filter(Boolean)) };
}
async function creatorItems(get) {
if (!can("read.money")) return [];
const [offers, bookings, intros, rosters, handoff] = await Promise.all([
on("sponsorships") ? settle(get("/v1/me/sponsorships/offers")) : null,
on("sponsorships") ? settle(get("/v1/me/sponsorships/bookings")) : null,
settle(get("/v1/me/introductions")),
on("brand_data") ? settle(get("/v1/me/rosters")) : null,
handoffItems(get),
]);
const out = [];

out.push(...handoff.items.slice(0, 3).map((i) => ({ ...i, total: handoff.items.length, n: 1 })));
if (handoff.items.length > 3) out.push({ title: `${handoff.items.length - 3} more waiting on Deals`, line: "Orbe's assistant waits for your say on each.", href: "/orbe-site/demo/app/deals", n: handoff.items.length - 3 });
const open = (offers?.offers ?? []).filter((o) => o.state === "sent" && !handoff.offers.has(o.id));
if (open.length) out.push({ title: `Answer ${plural(open.length, "sponsorship offer")}`, line: `${open[0].brandName} is waiting. Offers lapse if not answered.`, href: "/orbe-site/demo/app/deals", n: open.length });
for (const b of (bookings?.bookings ?? []).filter((x) => CREATOR_MOVES[x.state]).slice(0, 4)) out.push({ title: `${CREATOR_MOVES[b.state]} ${b.brandName}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/deals?tab=bookings" });
const asked = (intros?.introductions ?? []).filter((i) => i.status === "requested");
if (asked.length) out.push({ title: `${plural(asked.length, "buyer")} asked to be introduced`, line: "Approve or decline before the request lapses.", href: "/orbe-site/demo/app/selling", n: asked.length });
const invited = (rosters?.rosters ?? []).filter((r) => r.state === "invited");
for (const r of invited.slice(0, 2)) out.push({ title: `${r.org} invited you to their roster`, line: "Join or decline from your record.", href: "/orbe-site/demo/app/record" });
return out;
}

async function rosterItems(get) {
if (currentTeam()?.kind !== "agency" || !on("deals_agent")) return [];
const r = await settle(get("/v1/roster/handoff"));
const mine = (r?.queue ?? []).filter((a) => a.state === "waiting" && !a.waitsFor);
const items = mine.slice(0, 3).map((a) => {
const line = headline(a).replace(/\.$/, "");
return { title: `${a.creator.name}: ${a.kind === "note" ? line : `approve, ${line.charAt(0).toLowerCase()}${line.slice(1)}`}`, line: a.why, href: "/orbe-site/demo/app/roster", kind: "handoff", total: mine.length, n: 1 };
});
if (mine.length > 3) items.push({ title: `${mine.length - 3} more waiting on the Roster`, line: "Each waits for your say.", href: "/orbe-site/demo/app/roster", n: mine.length - 3 });
return items;
}
async function brandItems(get) {
if (!on("sponsorships") || !can("read.money")) return [];
const [bookings, roster] = await Promise.all([currentTeam()?.brand === false ? null : settle(get("/v1/brand/bookings")), rosterItems(get)]);
const out = [...roster];
for (const b of (bookings?.bookings ?? []).filter((x) => BRAND_MOVES[x.state] || (x.state === "live" && !x.contentApprovedAt)).slice(0, 5)) {
const who = `a creator (${String(b.format ?? "read").replaceAll("_", " ")})`;
out.push({ title: BRAND_MOVES[b.state] ? `${BRAND_MOVES[b.state]} ${who}` : `Approve the content from ${who}`, line: "A booking is waiting on you.", href: "/orbe-site/demo/app/bookings" });
}
return out;
}

async function loadNotifications(user, opts = {}) {
const key = `${user.type}:${user.id}:${currentTeam()?.id ?? ""}`;
if (!opts.fresh && cached.key === key && Date.now() - cached.at < 60_000) return cached.items;
const get = opts.fresh ? afresh : kept;
const [approvals, own] = await Promise.all([approvalItems(get), user.type === "creator" ? creatorItems(get) : brandItems(get)]);

const owner = (currentTeam()?.role ?? "owner") === "owner";
const proposals = own.find((i) => i.kind === "handoff")?.total ?? 0;
const waiting = (approvals[0]?.count ?? 0) + (owner ? proposals : 0);
const items = [...approvals, ...own].map((i) => (i.kind === "handoff" ? { ...i, kind: "approval", count: 0 } : i));
const first = items.find((i) => i.kind === "approval");
if (first) first.count = waiting;

items.total = items.reduce((t, i) => t + (i.n ?? 1), 0);
cached = { at: Date.now(), items, key };
return items;
}
const MIN_GAP = 60_000;
const MAX_GAP = 15 * 60_000;

let unwatch = null;
function watchNotifications(user, show) {
unwatch?.();
let gap = MIN_GAP;
let last = Date.now();
let seen = "";
const look = async () => {
if (document.visibilityState === "hidden" || Date.now() - last < gap) return;
last = Date.now();
const items = await loadNotifications(user, { fresh: true }).catch(() => null);
if (!items) return;
const now = JSON.stringify(items);
gap = now === seen ? Math.min(gap * 2, MAX_GAP) : MIN_GAP;
seen = now;
show(items);
};
loadNotifications(user).then((items) => {
seen = JSON.stringify(items);
show(items);
}).catch(() => {});
window.addEventListener("focus", look);
document.addEventListener("visibilitychange", look);
unwatch = () => {
window.removeEventListener("focus", look);
document.removeEventListener("visibilitychange", look);
};
}
});
__o.d("js/routes.js", function (__x) {
"use strict";
__o.e(__x, { BASE: () => BASE, ROLE_CAN: () => ROLE_CAN, roleCan: () => roleCan, CREATOR: () => CREATOR, BRAND: () => BRAND, ADMIN: () => ADMIN, screensFor: () => screensFor, match: () => match });

const BASE = "/orbe-site/demo/app";

const ROLE_CAN = {
"read.money": ["owner", "manager"],
content: ["owner", "manager", "editor"],
business: ["owner", "manager"],
money: ["owner", "manager"],
consent: ["owner", "manager"],
rights: ["owner", "manager"],
owner: ["owner"],
};
const roleCan = (role, action) => !action || !ROLE_CAN[action] || ROLE_CAN[action].includes(role ?? "owner");

const TEAM = [
{ path: "team", name: "Team", module: "./team.js", also: ["team/:section"], hidden: true },
{ path: "invite", name: "Join a team", module: "./invite.js", hidden: true },
];

const CREATOR = [
{ path: "", name: "Home", module: "./creator/home.js" },
{ path: "library", name: "Library", module: "./creator/library.js" },
{ path: "works/:id", name: "Work", module: "./creator/work.js", moved: ["library/:id"], hidden: true, under: "library" },
{ path: "deals", name: "Deals", module: "./creator/sponsorships.js", moved: ["sponsorships"], feature: "sponsorships", needs: "read.money" },
{ path: "record", name: "Record", module: "./creator/record.js", feature: "record", needs: "read.money" },

{ path: "selling", name: "Selling", module: "./creator/sell.js", moved: ["sell"], hidden: true, under: "record", needs: "read.money" },
{ path: "report", name: "Diligence report", module: "./creator/report.js", hidden: true, under: "record", feature: "record", needs: "read.money" },
{ path: "explore", name: "Explore", module: "./explore.js" },

{ path: "runs", name: "Runs", module: "./creator/studio.js", moved: ["studio"], under: "explore" },
{ path: "rate", name: "Rate a channel", module: "./tools/rate.js", under: "explore", feature: "rating" },
{ path: "offer", name: "Check an offer", module: "./tools/offer.js", under: "explore", feature: "sponsorships", needs: "read.money" },
{ path: "protect", name: "Protect", module: "./tools/protect.js", under: "explore" },
{ path: "developers", name: "For developers", module: "./tools/developers.js", under: "explore" },

{ path: "media", name: "Drop in a video", module: "./creator/media.js", hidden: true, under: "library", feature: "media", needs: "content" },
{ path: "media/:id", name: "Video", module: "./creator/media.js", hidden: true, under: "library", feature: "media" },

{ path: "fix", name: "Fix", module: "./creator/fix.js", also: ["fixes"], under: "explore", feature: "fix" },
{ path: "predictions", name: "Predictions", module: "./creator/plan.js", moved: ["plan"], under: "explore", needs: "read.money" },
{ path: "settings", name: "Settings", module: "./settings.js", also: ["settings/:section"] },

{ path: "connections", name: "Connections", module: "./creator/connect.js", moved: ["connect"] },

{ path: "podcasts", name: "Podcasts", module: "./creator/start.js", moved: ["start"], under: "connections", feature: "podcasts" },

{ path: "podcasts/confirm", name: "Confirm your show", module: "./creator/confirm.js", hidden: true, feature: "podcasts" },
...TEAM,

{ path: "welcome", name: "Welcome", module: "./welcome.js", hidden: true },
];

const BRAND = [
{ path: "", name: "Home", module: "./brand/home.js", brand: true },
{ path: "intelligence", name: "Intelligence", module: "./brand/intel.js", brand: true, feature: "brand_intel" },
{ path: "explore", name: "Explore", module: "./explore.js" },
{ path: "rate", name: "Rate a channel", module: "./tools/rate.js", feature: "rating" },
{ path: "campaigns", name: "Campaigns", module: "./brand/campaigns.js", brand: true, feature: "sponsorships", needs: "read.money" },
{ path: "campaigns/:id", name: "Campaign", module: "./brand/campaign.js", hidden: true, under: "campaigns", brand: true, feature: "sponsorships", needs: "read.money" },
{ path: "bookings", name: "Bookings", module: "./brand/bookings.js", brand: true, feature: "sponsorships", needs: "read.money" },

{ path: "reads", name: "Buy guaranteed reads", module: "./brand/reads.js", also: ["reads/:id"], hidden: true, under: "campaigns", brand: true, feature: "reads_checkout", needs: "read.money" },
{ path: "discover", name: "Discover", module: "./brand/discover.js", brand: true, feature: "brand_data" },
{ path: "roster", name: "Roster", module: "./brand/roster.js", feature: "brand_data" },
{ path: "keys", name: "API keys", module: "./brand/keys.js", feature: "brand_data", needs: "read.money" },
{ path: "profile", name: "Brand profile", module: "./brand/profile.js", feature: "sponsorships" },
{ path: "developers", name: "MCP and agents", module: "./tools/developers.js" },
{ path: "settings", name: "Settings", module: "./settings.js", also: ["settings/:section"] },
...TEAM,
{ path: "welcome", name: "Welcome", module: "./welcome.js", hidden: true },
];

const ADMIN = [
{ path: "desk", name: "Desk", module: "./admin/desk.js", feature: "sponsorships", admin: true },
{ path: "desk/campaigns/:id", name: "Desk campaign", module: "./admin/campaign.js", hidden: true, under: "desk", feature: "sponsorships", admin: true },
];

function screensFor(user, features) {
const on = new Set(features ?? []);
const own = user.type === "creator" ? CREATOR : BRAND;
const staff = (user.roles ?? []).includes("admin") ? ADMIN : [];
const role = user.team?.role;
return [...own, ...staff].filter((r) => (!r.feature || on.has(r.feature)) && roleCan(role, r.needs));
}

function match(table, rest) {
const segs = rest === "" ? [] : rest.split("/");
for (const route of table) {
for (const p of [route.path, ...(route.also ?? []), ...(route.moved ?? [])]) {
const parts = p === "" ? [] : p.split("/");
if (parts.length !== segs.length) continue;
const params = {};
if (parts.every((part, i) => (part.startsWith(":") ? ((params[part.slice(1)] = decodeURIComponent(segs[i])), segs[i] !== "") : part === segs[i]))) {

const moved = (route.moved ?? []).includes(p) ? route.path.split("/").map((part) => (part.startsWith(":") ? encodeURIComponent(params[part.slice(1)]) : part)).join("/") : null;
return { route, params, moved };
}
}
}
return null;
}
});
__o.d("js/shell.js", function (__x) {
"use strict";
__o.e(__x, { portal: () => portal, lockup: () => lockup, menu: () => menu, drawFrame: () => drawFrame, markHere: () => markHere, nameHere: () => nameHere, commandsFor: () => commandsFor, matchCommands: () => matchCommands, openPalette: () => openPalette });
const { api, can, canRateChannels, currentTeam, notHere, on } = __o.r("js/api.js");
const { RESOURCES, settingsFor, siteHref, tabsFor, tile, toolsFor } = __o.r("js/catalogue.js");
const { icon } = __o.r("js/icons.js");
const { approvalsWaiting, loadNotifications, watchNotifications } = __o.r("js/notify.js");
const { setTheme, theme } = __o.r("js/theme-switch.js");
const { h, nextId, refocus } = __o.r("js/ui.js");
const { PORTAL } = __o.r("site/mark.js");

const BASE = "/orbe-site/demo/app";
const href = (path) => (path ? `${BASE}/${path}` : `${BASE}/`);
let state = { user: null, screens: [], tabs: [], tools: [], go: null, signOut: null };
const top = () => document.querySelector("[data-top]");

let tabsNode = null;
const tabsEl = () => (tabsNode ??= document.querySelector("[data-tabs]"));
const crumbsEl = () => document.querySelector("[data-crumbs]");

function portal(cls = "cn-portal") {
const NS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(NS, "svg");
svg.setAttribute("viewBox", "8.5 8.5 83 83");
svg.setAttribute("class", cls);
svg.setAttribute("aria-hidden", "true");
svg.setAttribute("focusable", "false");
const p = document.createElementNS(NS, "path");
p.setAttribute("fill", "currentColor");
p.setAttribute("fill-rule", "evenodd");
p.setAttribute("d", PORTAL.small);
svg.append(p);
return svg;
}

const lockup = (cls = "") => h("span", { class: `cn-lockup${cls ? ` ${cls}` : ""}` }, portal(), h("span", { class: "cn-wordmark", role: "img", "aria-label": "Orbe" }));

let openMenu = null;
function closeMenus() {
if (!openMenu) return;
const { btn, panel } = openMenu;
btn.setAttribute("aria-expanded", "false");
panel.hidden = true;
openMenu = null;
}

function menu(label, build, opts = {}) {
const id = nextId("menu");
const btn = h("button", { class: `cn-menubtn${opts.cls ? ` ${opts.cls}` : ""}`, type: "button", "aria-expanded": "false", "aria-controls": id, "aria-label": opts.aria ?? null, title: opts.title ?? null }, label);
const panel = h("div", { class: `cn-menu${opts.panel ? ` ${opts.panel}` : ""}${opts.end ? " cn-menu--end" : ""}`, id, hidden: true });
const open = async () => {
panel.replaceChildren(...[await build()].flat(Infinity).filter(Boolean));
panel.hidden = false;
btn.setAttribute("aria-expanded", "true");
openMenu = { btn, panel };
};
btn.addEventListener("click", async (e) => {
e.stopPropagation();
const was = openMenu?.btn === btn;
closeMenus();
if (was) return;
await open();
panel.querySelector("a, button, input")?.focus({ preventScroll: true });
});
btn.addEventListener("keydown", async (e) => {
if (e.key !== "ArrowDown" || openMenu?.btn === btn) return;
e.preventDefault();
closeMenus();
await open();
panel.querySelector("a, button")?.focus({ preventScroll: true });
});
panel.addEventListener("keydown", (e) => {
if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
const items = [...panel.querySelectorAll("a, button")];
const i = items.indexOf(document.activeElement);
e.preventDefault();
const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
items[next]?.focus();
});
panel.addEventListener("click", (e) => {
if (e.target.closest("a, [data-close]")) closeMenus();
});
return h("div", { class: "cn-menuwrap" }, btn, panel);
}
document.addEventListener("click", (e) => {
if (openMenu && !openMenu.panel.contains(e.target)) closeMenus();
});
document.addEventListener("keydown", (e) => {
if (e.key === "Escape" && openMenu) {
const { btn } = openMenu;
closeMenus();
refocus(btn);
}
});

const toolLink = (t) =>
t.status === "coming"
? h("a", { class: "cn-item", href: siteHref(t.site ?? "products/"), target: "_blank", rel: "noopener" }, tile(t.glyph, t.k, h), h("span", { class: "cn-item-t" }, t.name, h("span", { class: "cn-soon" }, "Coming")), h("span", { class: "cn-item-d" }, t.line))
: h("a", { class: "cn-item", href: href(t.path), "data-path": t.path }, tile(t.glyph, t.k, h), h("span", { class: "cn-item-t" }, t.name), h("span", { class: "cn-item-d" }, t.line));

const row = (iconName, name, line, props = {}) =>
h(props.href ? "a" : "button", { class: `cn-item${line ? "" : " cn-item--row"}`, type: props.href ? null : "button", ...props }, h("span", { class: "cn-item-ico" }, icon(iconName)), h("span", { class: "cn-item-t" }, name), line ? h("span", { class: "cn-item-d" }, line) : null);

function initials(user) {
const from = (user.displayName || user.email || "O").replace(/\(.*?\)/g, "").trim();
const parts = from.split(/[\s@._-]+/).filter(Boolean);
return ((parts[0]?.[0] ?? "O") + (parts[1]?.[0] ?? "")).toUpperCase();
}
function avatarMenu() {
const u = state.user;
const choice = (value, label, ico) =>
h("button", { class: "cn-themebtn", type: "button", "aria-pressed": String(theme() === value), "aria-label": label, title: label, "data-close": "", onclick: () => setTheme(value) }, icon(ico));
return menu(h("span", { class: "cn-avatar" }, initials(u)), () => [
h("div", { class: "cn-menu-head" },
h("span", { class: "cn-avatar cn-avatar--m", "aria-hidden": "true" }, initials(u)),
h("div", null, h("p", { class: "cn-item-t" }, u.displayName || "You"), u.email ? h("p", { class: "cn-item-d cn-wrap" }, u.email) : null),
),
row("settings", "Settings", null, { href: href("settings/account") }),
planRow(),
state.screens.some((r) => r.path === "connections") ? row("link", "Connections", null, { href: href("connections") }) : null,
state.screens.some((r) => r.path === "runs") ? row("studio", "Runs", null, { href: href("runs") }) : null,
row("shield", "Where you are signed in", null, { href: href("settings/security") }),
h("div", { class: "cn-menu-sep" }),
h("div", { class: "cn-menu-theme" }, h("span", { class: "cn-item-t" }, "Theme"), h("div", { class: "cn-themes", role: "group", "aria-label": "Theme" }, choice("system", "Match my device", "monitor"), choice("dark", "Ink", "moon"), choice("light", "Paper", "sun"))),
h("div", { class: "cn-menu-sep" }),
row("logout", "Sign out", null, { onclick: () => { closeMenus(); state.signOut(); } }),
], { aria: "Your account", end: true, cls: "cn-menubtn--avatar", panel: "cn-menu--account" });
}

function helpMenu() {
return menu(icon("help"), () => [
row("sparkle", "Take the tour", null, { "data-close": "", onclick: () => __o.i("js/shell.js", "./tour.js").then((m) => m.startTour(state.user, { force: true })) }),
RESOURCES.map(([group, links]) => [
h("p", { class: "cn-menu-group" }, group),
links.map(([name, path, ico]) => row(ico, name, null, { href: siteHref(path), target: "_blank", rel: "noopener" })),
]),
], { aria: "Help and resources", title: "Help and resources", end: true, panel: "cn-menu--resources" });
}

let notesHeard = false;
let markNow = () => {};
function bell() {
const dot = h("span", { class: "cn-dot", hidden: true });

const mark = (items) => {
const n = items.total ?? items.length;
dot.hidden = n === 0;
dot.textContent = n ? String(n) : "";
dot.classList.toggle("cn-dot--n", n > 0);
};
const wrap = menu([icon("bell"), dot], async () => {
const items = await loadNotifications(state.user);
mark(items);
const head = h("div", { class: "cn-menu-title" }, h("p", null, "Notifications"), h("span", { class: "cn-count" }, String(items.total ?? items.length)));
if (!items.length) return [head, h("div", { class: "cn-menu-empty" }, h("span", { class: "cn-empty-ico" }, icon("bell")), h("p", { class: "cn-item-t" }, "All caught up"), h("p", { class: "cn-item-d" }, "Offers, bookings and introductions that need you show here."))];
return [head, items.map((n) => h("a", { class: `cn-note${n.kind === "approval" ? " cn-note--approval" : ""}`, href: n.href }, h("span", { class: "cn-note-dot", "aria-hidden": "true" }), h("span", { class: "cn-item-t" }, n.title), h("span", { class: "cn-item-d" }, n.line)))];
}, { aria: "Notifications", title: "Notifications", end: true, panel: "cn-menu--notes" });

if (state.provisional) return wrap;

watchNotifications(state.user, mark);
if (!notesHeard) window.addEventListener("orbe:notes-changed", () => loadNotifications(state.user, { fresh: true }).then(markNow).catch(() => {}));
notesHeard = true;
markNow = mark;
return wrap;
}

function planRow() {
const u = state.user;
if (u.type !== "creator" || !on("pro") || !can("read.money")) return null;
const r = row("card", "Free plan", null, { href: href("settings/plan"), title: "Plan and usage" });
api.get("/v1/me/plan").then(({ plan }) => (r.querySelector(".cn-item-t").textContent = plan.plan === "pro" ? "Creator Pro" : "Free plan")).catch(() => {});
return r;
}
function searchButton() {
const kbd = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
return h("button", { class: "cn-search", type: "button", onclick: () => openPalette(""), "aria-label": "Search anything", "aria-keyshortcuts": "Control+K Meta+K" }, icon("search"), h("span", { class: "cn-search-t" }, "Search anything"), h("kbd", { class: "cn-kbd" }, kbd));
}

const KIND = { creator: "Creator", brand: "Brand", agency: "Agency" };
const roleWord = (r) => r[0].toUpperCase() + r.slice(1);

const teamTile = (name, kind, size = "") =>
h("span", { class: `cn-teamtile${size ? ` cn-teamtile--${size}` : ""}`, "data-kind": kind, "aria-hidden": "true" }, initials({ displayName: name }));

const personName = (u) => (u.displayName || u.email || "").replace(/\s*\(.*?\)\s*/g, " ").trim() || "You";
let teamsCache = null;
const loadTeams = () => (teamsCache ??= api.get("/v1/teams").catch(() => null));
async function switchTo(teamId) {

window.dispatchEvent(new CustomEvent("orbe:switching", { detail: true }));
try {
await api.put("/v1/teams/active", { teamId });
} catch (e) {
window.dispatchEvent(new CustomEvent("orbe:switching", { detail: false }));
throw e;
}

try {
const c = new BroadcastChannel("orbe-team");
c.postMessage({ team: teamId });
c.close();
} catch {

}

location.replace(href(""));
}

async function teamRows() {
const r = await loadTeams();
if (!r) return [];
return r.teams.map((t) =>
h("button", { class: "cn-item cn-teamrow", type: "button", role: "menuitemradio", "aria-checked": String(t.id === r.active.id), "data-close": "", onclick: () => (t.id === r.active.id ? null : switchTo(t.id)) },
teamTile(t.name, t.kind, "s"),
h("span", { class: "cn-item-t" }, t.name),
h("span", { class: "cn-item-d" }, `${KIND[t.kind] ?? "Team"}, ${t.role}${t.agency ? `, through ${t.agency.org}` : ""}`),
h("span", { class: "cn-teamrow-tick", "aria-hidden": "true" }, icon("check")),
),
);
}

function teamSwitcher() {
const u = state.user;

const team = state.provisional ? u.team ?? null : currentTeam();

const me = u.person ?? u;
const own = !team || team.role === "owner";
const unnamed = own && !me.displayName && (!team || team.name === (me.email ?? "").split("@")[0]);
const fallback = (u.displayName || u.email || "").replace(/\s*\(.*?\)\s*/g, " ").trim() || (u.type === "creator" ? "Creator" : "Brand");
const name = unnamed ? "Your account" : team?.name ?? fallback;
const kind = team?.kind ?? (u.type === "creator" ? "creator" : "brand");
const t = h("span", { class: "cn-who-t" }, name);
const leads = team && team.via === "member" && (team.role === "owner" || team.role === "manager");

const role = own ? KIND[kind] ?? "Team" : team.role.charAt(0).toUpperCase() + team.role.slice(1);
const tile = unnamed ? h("span", { class: "cn-teamtile", "data-kind": kind, "aria-hidden": "true" }, icon("user")) : teamTile(name, kind);
return menu([tile, t, h("span", { class: "cn-who-k" }, role), icon("chevron", { cls: "cn-i--chev" })], async () => [
h("div", { class: "cn-menu-head cn-menu-head--team" },
h("span", { class: "cn-avatar cn-avatar--m", "aria-hidden": "true" }, initials(u.person ?? u)),
h("div", null, h("p", { class: "cn-item-t" }, personName(u.person ?? u)), (u.person ?? u).email ? h("p", { class: "cn-item-d cn-wrap" }, (u.person ?? u).email) : null),
),
h("p", { class: "cn-menu-group" }, "Teams"),
h("div", { role: "group", "aria-label": "Teams" }, await teamRows()),
h("div", { class: "cn-menu-sep" }),
row("people", "Team settings", null, { href: `${href("settings/team")}` }),
leads ? row("plus", "Invite people", null, { href: `${href("settings/team")}?tab=people&invite=1` }) : null,
], { aria: `Team: ${name}. Switch team`, cls: "cn-who cn-switcher", panel: "cn-menu--team" });
}

async function drawFrame(user, screens, opts) {
state = { user, screens, tabs: user ? tabsFor(user, screens) : [], tools: user ? toolsFor(user, screens) : [], go: opts.go, signOut: opts.signOut, provisional: opts.provisional === true };
const bar = top();
document.body.classList.toggle("cn--out", !user);
if (!user) {

document.documentElement.removeAttribute("data-framed");
try {
localStorage.removeItem("orbe.side");
} catch {

}
bar.replaceChildren();
bar.hidden = true;
tabsEl().hidden = true;
if (crumbsEl()) crumbsEl().hidden = true;
const dock = document.querySelector("[data-dock]");
if (dock) dock.hidden = true;
return;
}
bar.hidden = false;
const mark = h("a", { class: "cn-mark", href: href(""), "aria-label": "Orbe, home" }, lockup());

if (!crumbsEl()) bar.after(h("nav", { class: "cn-crumbs", "aria-label": "Breadcrumb", "data-crumbs": "", hidden: "" }));
bar.replaceChildren(
mark,
h("span", { class: "cn-slash", "aria-hidden": "true" }, "/"),
teamSwitcher(),
tabsEl(),
h("div", { class: "cn-tools" }, searchButton(), helpMenu(), bell(), avatarMenu()),
);
drawTabs();
drawDock();
}

const docked = () => state.tabs.filter((t) => !t.items).slice(0, 3);
function drawDock() {
let dock = document.querySelector("[data-dock]");
if (!dock) {
dock = h("nav", { class: "cn-navdock", "aria-label": "Orbe", "data-dock": "" });
document.body.append(dock);
}
const links = docked();
dock.hidden = false;
dock.replaceChildren(
...links.map((tab) => h("a", { class: "cn-navdock-i", href: href(tab.path), "data-path": tab.path }, icon(tab.icon), h("span", null, tab.name))),
h("button", { class: "cn-navdock-i", type: "button", "aria-haspopup": "dialog", onclick: () => openSheet() }, icon("menu"), h("span", null, "More")),
);
}
function drawTabs() {
const el = tabsEl();
el.hidden = false;
el.replaceChildren(
h("ul", { class: "cn-tablist" },
state.tabs.map((tab) =>
h("li", { class: "cn-tabitem", "data-tab": tab.name },
tab.items
? menu([icon(tab.icon), h("span", null, tab.name), icon("chevron", { cls: "cn-i--chev" })], () => {
const groups = [...new Set(tab.items.map((t) => t.group))];
return groups.map((g) => [groups.length > 1 ? h("p", { class: "cn-menu-group" }, g) : null, tab.items.filter((t) => t.group === g).map(toolLink)]).concat(
h("a", { class: "cn-menu-foot", href: href("explore") }, icon("explore"), h("span", null, "Explore every tool"), icon("arrowRight")),
);
}, { cls: "cn-tab", panel: `cn-menu--tools${tab.items.length > 4 ? " cn-menu--two" : ""}` })
: h("a", { class: "cn-tab", href: href(tab.path), "data-path": tab.path, title: jumpKey(tab) ? `${tab.name} (G then ${jumpKey(tab).toUpperCase()})` : null }, icon(tab.icon), h("span", null, tab.name)),
),
),
),
);
}

function markHere(route, params) {
const here = route.under ?? route.path;
const settings = here === "settings";
let tabName = settings ? "Settings" : null;
let item = null;
let tabLink = null;
for (const tab of state.tabs) {
if (!tab.items && tab.path === here) [tabName, tabLink] = [tab.name, href(tab.path)];
const found = tab.items?.find((i) => i.path === here);
if (found && !tabName) [tabName, item] = [tab.name, found];
}
for (const li of tabsEl().querySelectorAll("[data-tab]")) {
const tab = li.querySelector(".cn-tab");
if (li.dataset.tab === tabName) tab.setAttribute("aria-current", "page");
else tab.removeAttribute("aria-current");
}
for (const a of document.querySelectorAll("[data-dock] [data-path]")) {
if (a.dataset.path === here) a.setAttribute("aria-current", "page");
else a.removeAttribute("aria-current");
}
const crumbs = crumbsEl();
if (!crumbs) return;
const parts = [];

if (tabName && tabName !== "Home") parts.push([tabName, tabLink ?? (item && item.name === tabName && route.path !== item.path ? href(item.path) : null)]);

const parent = route.under && !settings && !tabName ? state.screens.find((r) => r.path === route.under) : null;
if (parent) parts.push([parent.name, href(parent.path)]);

if (item && item.name !== tabName) parts.push([item.name, href(item.path)]);
if (item ? route.path !== item.path : route.hidden || (route.path && !settings && tabName !== route.name)) parts.push([route.name, null]);
if (settings) {
const section = settingsFor(state.user, on).find((s) => s.id === params?.section)?.name ?? "Account";
parts.push([section, null]);
document.title = `${section}, Settings: Orbe`;
}
if (!parts.length) parts.push(["Home", null]);

crumbs.hidden = !parts.some(([, link], i) => link && i < parts.length - 1);
crumbs.replaceChildren(
h("ol", null, parts.map(([name, link], i) => h("li", null, link && i < parts.length - 1 ? h("a", { href: link }, name) : h("span", { "aria-current": i === parts.length - 1 ? "page" : null }, name)))),
);
}

function nameHere(name) {
const last = crumbsEl()?.querySelector("[aria-current]");
if (last) last.textContent = name;
}


function openSheet() {
const d = h("dialog", { class: "cn-sheet", "aria-label": "More" });
const sheetTeams = h("div", { class: "cn-sheet-group cn-sheet-teams" }, h("p", { class: "cn-menu-group" }, "Team"));
teamRows().then((rows) => (rows.length > 1 ? sheetTeams.append(...rows) : sheetTeams.append(...rows, row("people", "Team settings", null, { href: href("settings/team") }))));
const close = () => d.close();
const inDock = new Set(docked().map((t) => t.path));
const rest = state.tabs.filter((t) => !t.items && !inDock.has(t.path));
d.append(
h("div", { class: "cn-sheet-bar" }, lockup(), h("button", { class: "cn-iconbtn", type: "button", onclick: close, "aria-label": "Close" }, icon("close"))),
sheetTeams,
h("nav", { class: "cn-sheet-nav", "aria-label": "More" },
rest.length ? h("div", { class: "cn-sheet-main" }, rest.map((tab) => h("a", { class: "cn-sheet-link", href: href(tab.path) }, icon(tab.icon), h("span", null, tab.name)))) : null,
state.tabs.filter((t) => t.items).map((tab) => h("div", { class: "cn-sheet-group" }, h("p", { class: "cn-menu-group" }, tab.name), tab.items.map(toolLink))),
),
);
d.addEventListener("click", (e) => {
if (e.target.closest("a") || e.target === d) close();
});
d.addEventListener("close", () => d.remove());
document.body.append(d);
d.showModal();
}


function commandsFor(user, tabs, sections, extra = [], tools = []) {
const out = [];
const seen = new Set();
const add = (c) => {
if (c.href && !c.external && seen.has(c.href)) return;
if (c.href) seen.add(c.href);
out.push(c);
};
for (const tab of tabs) if (!tab.items) add({ group: "Go to", name: tab.name, line: "", href: href(tab.path), icon: tab.icon });

const listed = [...(tools.length ? tools : tabs.flatMap((tab) => tab.items ?? []))].sort((a, b) => Number(notHere(a)) - Number(notHere(b)));
for (const t of listed)
if (t.status !== "off") add({ group: "Explore", name: t.name, line: notHere(t) ? "Not on this server" : t.line, href: t.status === "coming" ? siteHref(t.site ?? "products/") : href(t.path), external: t.status === "coming", tile: [t.glyph, t.k] });
for (const s of sections) add({ group: "Settings", name: s.name, line: s.line, href: href(`settings/${s.id}`), icon: s.icon });
for (const c of extra) add(c);
return out;
}

function matchCommands(commands, q) {
const words = q.toLowerCase().split(/\s+/).filter(Boolean);
if (!words.length) return commands;
const scored = [];
for (const c of commands) {
const name = c.name.toLowerCase();
const all = `${name} ${c.line.toLowerCase()} ${c.group.toLowerCase()}`;
if (!words.every((w) => all.includes(w))) continue;
scored.push([name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2, c]);
}
return scored.sort((a, b) => a[0] - b[0]).map(([, c]) => c);
}
let palette = null;
let worksCache = null;

async function paletteWorks() {
if (state.user?.type !== "creator") return [];

if (!worksCache) worksCache = Promise.all([api.get("/v1/me/works?limit=200"), __o.i("js/shell.js", "./terms.js")]).then(([r, { KINDS }]) => r.works.map((w) => ({ ...w, kindName: KINDS[w.kind] ?? w.kind }))).catch(() => []);
return worksCache;
}
function paletteExtras(q, works, waiting, teams) {
const extra = [
...(waiting ? [{ group: "Actions", name: waiting === 1 ? "Decide a waiting request" : `Decide ${waiting} waiting requests`, line: "Approvals for your team", href: `${href("settings/team")}?tab=approvals`, icon: "check" }] : []),
...(teams?.teams ?? []).filter((t) => t.id !== teams.active.id).map((t) => ({ group: "Actions", name: `Switch to ${t.name}`, line: `${roleWord(t.role)} on this team`, run: () => switchTo(t.id), icon: "people" })),
{ group: "Actions", name: "Run a tool", line: "Rate a work, check an offer, find a sponsor", href: href("runs"), icon: "studio" },
{ group: "Actions", name: "Take the tour", line: "A short look around the console", run: () => __o.i("js/shell.js", "./tour.js").then((m) => m.startTour(state.user, { force: true })), icon: "sparkle" },

document.documentElement.dataset.theme === "dark"
? { group: "Actions", name: "Switch to Paper", line: "Light theme", run: () => setTheme("light"), icon: "sun" }
: { group: "Actions", name: "Switch to Ink", line: "Dark theme", run: () => setTheme("dark"), icon: "moon" },
{ group: "Actions", name: "Sign out", line: "End this session", run: () => state.signOut(), icon: "logout" },
].filter((x) => x.href !== href("runs") || state.screens.some((r) => r.path === "runs"));
const handle = q.trim().match(/^@[\w.-]{2,}$/);
if (handle && state.screens.some((r) => r.path === "rate") && canRateChannels()) extra.unshift({ group: "Rate", name: `Rate ${handle[0]}`, line: "A YouTube channel, against creators its size", href: `${href("rate")}?handle=${encodeURIComponent(handle[0])}`, icon: "chart" });
if (q.trim().length >= 2) for (const w of works.slice(0, 200)) extra.push({ group: "Works", name: w.title, line: `${w.account.handle}, ${w.kindName}`, href: href(`works/${encodeURIComponent(w.id)}`), icon: "image" });
return extra;
}
const ORDER = ["Rate", "Go to", "Explore", "Works", "Settings", "Actions"];
async function openPalette(initial = "") {
if (!state.user || palette) return;
const sections = settingsFor(state.user, on);
const input = h("input", { class: "cn-palette-input", type: "search", placeholder: canRateChannels() ? "Search tools, works and settings, or type @handle" : "Search tools, works and settings", "aria-label": "Search Orbe", role: "combobox", "aria-expanded": "true", "aria-autocomplete": "list", autocomplete: "off" });
const list = h("div", { class: "cn-palette-list", role: "listbox", id: nextId("pl"), "aria-label": "Results" });
input.setAttribute("aria-controls", list.id);
const foot = h("div", { class: "cn-palette-foot" }, h("span", null, h("kbd", { class: "cn-kbd" }, "↑"), h("kbd", { class: "cn-kbd" }, "↓"), " to move"), h("span", null, h("kbd", { class: "cn-kbd" }, "Enter"), " to open"), h("span", null, h("kbd", { class: "cn-kbd" }, "Esc"), " to close"));


const d = h("dialog", { class: "cn-palette", "aria-label": "Search", "aria-modal": "true" }, h("div", { class: "cn-palette-box" }, icon("search"), input), list, foot);
const scrim = h("div", { class: "cn-scrim", onclick: () => d.close() });
let shown = [];
let at = 0;
let works = [];
let waiting = 0;
let teams = null;

const back = document.activeElement;
let leaving = false;
const pick = (c) => {
leaving = Boolean(c.href && !c.external && !c.run);
d.close();
if (c.run) c.run();
else if (c.external) window.open(c.href, "_blank", "noopener");
else if (c.href) state.go(c.href);
};
const draw = () => {
const all = matchCommands(commandsFor(state.user, state.tabs, sections, paletteExtras(input.value, works, waiting, teams), state.tools), input.value);
const byGroup = ORDER.map((g) => [g, all.filter((c) => c.group === g).slice(0, g === "Works" ? 6 : 8)]).filter(([, cs]) => cs.length);
shown = byGroup.flatMap(([, cs]) => cs);
at = Math.min(at, Math.max(0, shown.length - 1));
let i = 0;
list.replaceChildren(
...(shown.length
? byGroup.map(([g, cs]) =>
h("div", { class: "cn-palette-group", role: "group", "aria-label": g }, h("p", { class: "cn-menu-group" }, g),
cs.map((c) => {
const n = i++;
return h("div", { class: "cn-option", role: "option", id: `${list.id}-${n}`, "aria-selected": String(n === at), onclick: () => pick(c), onmousemove: () => { if (at !== n) { at = n; mark(); } } },
c.tile ? tile(c.tile[0], c.tile[1], h, "s") : h("span", { class: "cn-item-ico" }, icon(c.icon ?? "arrowRight")),
h("span", { class: "cn-item-t" }, c.name),
c.line ? h("span", { class: "cn-item-d" }, c.line) : null,
h("span", { class: "cn-option-go", "aria-hidden": "true" }, icon(c.external ? "external" : "enter")),
);
}),
),
)
: [h("div", { class: "cn-menu-empty" }, h("span", { class: "cn-empty-ico" }, icon("search")), h("p", { class: "cn-item-t" }, "Nothing matches"), h("p", { class: "cn-item-d" }, canRateChannels() ? "Try a tool's name, a work's title, a setting, or @handle." : "Try a tool's name, a work's title or a setting."))]),
);
mark();
};
const mark = () => {
list.querySelectorAll("[role=option]").forEach((o, n) => o.setAttribute("aria-selected", String(n === at)));
if (shown.length) input.setAttribute("aria-activedescendant", `${list.id}-${at}`);
else input.removeAttribute("aria-activedescendant");
list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
};
input.addEventListener("input", () => {
at = 0;
draw();
});
input.addEventListener("keydown", (e) => {
if (e.key === "ArrowDown" || e.key === "ArrowUp") {
e.preventDefault();
if (!shown.length) return;
at = (at + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
mark();
} else if (e.key === "Enter" && shown[at]) {
e.preventDefault();
pick(shown[at]);
} else if (e.key === "Escape") {

e.preventDefault();
d.close();
} else if (e.key === "Tab") {

e.preventDefault();
}
});
d.addEventListener("click", (e) => {
if (e.target === d) d.close();
});
d.addEventListener("close", () => {
d.remove();
scrim.remove();
palette = null;
if (!leaving) refocus(back);
});
palette = d;
document.body.append(scrim, d);
d.show();
input.value = typeof initial === "string" ? initial : "";
input.focus();

const loaded = Promise.all([paletteWorks(), approvalsWaiting(state.user).catch(() => 0), loadTeams()]);
await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
if (palette !== d) return;
draw();
[works, waiting, teams] = await loaded;
if (palette === d) draw();
}

function jumpKey(tab) {
if (tab.items) return null;
const k = tab.name[0].toLowerCase();
return k !== "s" && state.tabs.find((t) => !t.items && t.name[0].toLowerCase() === k) === tab ? k : null;
}
let gAt = 0;
function jump(e) {
if (e.ctrlKey || e.metaKey || e.altKey || !state.user) return false;
const key = e.key.toLowerCase();
if (key === "g" && !gAt) {
gAt = e.timeStamp;
return true;
}
const armed = gAt && e.timeStamp - gAt < 900;
gAt = 0;
if (!armed) return false;
const tab = state.tabs.find((t) => jumpKey(t) === key);
if (tab) state.go(href(tab.path));
else if (key === "s") state.go(href("settings"));
else return false;
return true;
}
document.addEventListener("keydown", (e) => {
const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
if (!typing && !palette && !document.querySelector("dialog[open]") && jump(e)) {
e.preventDefault();
return;
}
if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
e.preventDefault();
if (palette) palette.close();
else openPalette();
} else if (palette && !palette.contains(document.activeElement)) {

if (e.key === "Escape") palette.close();
else palette.querySelector("input").focus();
} else if (e.key === "/" && !typing && !palette) {
e.preventDefault();

const own = document.querySelector("main input[type=search]");
if (own?.offsetParent) own.focus();
else openPalette();
}
});
});
__o.d("js/terms.js", function (__x) {
"use strict";
__o.e(__x, { FORMATS: () => FORMATS, formatName: () => formatName, unitOf: () => unitOf, SHORTFALL: () => SHORTFALL, TAKE_RATE: () => TAKE_RATE, BRAND_TERMS: () => BRAND_TERMS, handleOf: () => handleOf, KINDS: () => KINDS, SIZE_WORDS: () => SIZE_WORDS, SIZE_RANGES: () => SIZE_RANGES, sizeWords: () => sizeWords, CONSENTS: () => CONSENTS, SOURCES: () => SOURCES });


const FORMATS = [
{ format: "integration", kind: "youtube", name: "Integrated sponsorship", unit: "views" },
{ format: "dedicated", kind: "youtube", name: "Dedicated video", unit: "views" },
{ format: "newsletter_slot", kind: "substack", name: "Newsletter sponsor slot", unit: "opens" },
{ format: "dedicated", kind: "substack", name: "Dedicated send", unit: "opens" },
{ format: "podcast_read", kind: "podcast", name: "Host-read podcast spot", unit: "downloads" },
{ format: "stream_segment", kind: "twitch", name: "Sponsored stream segment", unit: "viewer-hours" },
];
const formatName = (format, kind) => FORMATS.find((f) => f.format === format && (!kind || f.kind === kind))?.name ?? format.replaceAll("_", " ");
const unitOf = (format, kind) => FORMATS.find((f) => f.format === format && f.kind === kind)?.unit ?? "units";

const SHORTFALL = { toleranceBps: 500, floorBps: 5000, makeGoodDays: 30 };

const TAKE_RATE = { networkBps: 1500, directBps: 500, payer: "brand" };

const BRAND_TERMS =
"You pay each sponsorship in advance, before the creator starts. The money is held until delivery is verified from the creator's own accounts; the creator is then paid, and any shortfall against an agreed guarantee is made good or refunded as the offer says. Orbe's fee is shown on every offer. You and the creator are each responsible for disclosing the sponsorship as the law requires where it is seen; Orbe checks what it can read and tells you both.";

const handleOf = (handle, kind) => {
const bare = String(handle ?? "").replace(/^@+/, "");
return kind === "youtube" || kind === "twitch" ? `@${bare}` : bare;
};
const KINDS = { youtube: "YouTube", substack: "Newsletter", twitch: "Twitch", podcast: "Podcast", photography: "Photography" };

const SIZE_WORDS = { seed: "Smallest", rise: "Small", low: "Lower middle", mid: "Middle", high: "Large", top: "Top", unknown: "Not public" };

const SIZE_RANGES = {
youtube: { unit: "subscribers", seed: "Under 10k", rise: "10k to 100k", low: "100k to 250k", mid: "250k to 1M", high: "1M to 5M", top: "Over 5M" },
substack: { unit: "subscribers", seed: "Under 1k", rise: "1k to 10k", low: "10k to 50k", mid: "50k to 250k", top: "Over 250k" },
twitch: { unit: "followers", seed: "Under 1k", rise: "1k to 10k", low: "10k to 100k", mid: "100k to 1M", top: "Over 1M" },
podcast: { unit: "followers", seed: "Under 1k", rise: "1k to 5k", low: "5k to 25k", mid: "25k to 100k", top: "Over 100k" },
};

const sizeWords = (band, kind) => {
const word = SIZE_WORDS[band] ?? "Not public";
const r = SIZE_RANGES[kind];
return r?.[band] ? `${word}, ${r[band]} ${r.unit}` : word;
};

const CONSENTS = {
connect: {
name: "Read what you connect",
grants: "Orbe reads the accounts you connect (YouTube Analytics, AdSense, Patreon, Stripe) and the exports you upload.",
revoking: "Deletes every connection and everything read through them: connected revenue, connected figures and snapshots. Reports built on them are withdrawn.",
},
rate_public: {
name: "Keep your rating on file",
grants: "Orbe keeps your rating and each work's rating, so your record and card can show them.",
revoking: "Deletes your stored ratings, your works' ratings and your personal bests.",
},
verified_profile: {
name: "A public profile",
grants: "You may publish your profile and its card, with your rating, at a link you can share.",
revoking: "Unpublishes your profile. Your card and share link stop working.",
},
benchmarks: {
name: "Count me in benchmarks",
grants: "Your figures count, without your name, in the benchmarks that rate creators your size.",
revoking: "Takes you out of every season not yet published. Published seasons are anonymous and cannot be unpicked.",
},
listing: {
name: "List my business",
grants: "You may list your business for vetted buyers to see, and answer their introductions.",
revoking: "Withdraws your listings and closes their open introductions.",
},
share_with_buyer: {
name: "Shared with a buyer",
grants: "One buyer may read your full file, because you approved their introduction.",
revoking: "Withdraws your introduction with that buyer and the reports issued to them.",
},
};

const SOURCES = {
youtube_analytics: { name: "YouTube Analytics", what: "Views, watch time and audience for a channel you own. Connecting it is how you claim the channel." },
adsense: { name: "AdSense", what: "Ad earnings, month by month." },
patreon: { name: "Patreon", what: "Members and pledges." },
stripe: { name: "Stripe", what: "Charges and payouts, read only. Orbe never moves money." },
};
});
__o.d("js/theme-switch.js", function (__x) {
"use strict";
__o.e(__x, { theme: () => theme, applyTheme: () => applyTheme, setTheme: () => setTheme });

const KEY = "orbe.theme";
function theme() {
try {
const v = localStorage.getItem(KEY);
return v === "dark" || v === "light" ? v : "system";
} catch {
return "system";
}
}
const system = () => (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");

function applyTheme() {
const t = theme();
document.documentElement.dataset.theme = t === "system" ? system() : t;
}
function setTheme(value) {
try {
if (value === "system") localStorage.removeItem(KEY);
else localStorage.setItem(KEY, value);
} catch {

}
if (value !== "system") document.documentElement.dataset.theme = value;
else applyTheme();
}
window.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => theme() === "system" && applyTheme());
});
__o.d("js/ui.js", function (__x) {
"use strict";
__o.e(__x, { h: () => h, nextId: () => nextId, money: () => money, pounds: () => pounds, count: () => count, pct: () => pct, bps: () => bps, day: () => day, when: () => when, signed: () => signed, words: () => words, plural: () => plural, title: () => title, rows: () => rows, chip: () => chip, loading: () => loading, failure: () => failure, countryCodes: () => countryCodes, notThere: () => notThere, opener: () => opener, refocus: () => refocus, ok: () => ok, soon: () => soon, empty: () => empty, block: () => block, toast: () => toast, announce: () => announce, input: () => input, textarea: () => textarea, select: () => select, field: () => field, check: () => check, form: () => form, action: () => action, actions: () => actions, confirmBox: () => confirmBox, tabs: () => tabs });
const { notBuiltYet } = __o.r("js/api.js");

const PROPS = new Set(["value", "checked", "disabled", "selected", "indeterminate"]);

function h(tag, props, ...kids) {
const el = document.createElement(tag);
for (const [k, v] of Object.entries(props ?? {})) {
if (v === null || v === undefined || v === false) continue;
if (k === "class") el.className = v;
else if (k === "text") el.textContent = v;
else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
else if (PROPS.has(k)) el[k] = v;
else el.setAttribute(k, v === true ? "" : String(v));
}
for (const kid of kids.flat(Infinity)) {
if (kid === null || kid === undefined || kid === false) continue;
el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
}
return el;
}
let uid = 0;
const nextId = (p = "ap") => `${p}-${++uid}`;

function money(m) {
if (!m) return "Not set";
const whole = m.amount % 100 === 0;
return new Intl.NumberFormat("en-GB", { style: "currency", currency: m.currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(m.amount / 100);
}
const pounds = (m) => (m ? m.amount / 100 : "");
const count = (n) => (n === null || n === undefined ? "None yet" : Math.round(n).toLocaleString("en-GB"));
const pct = (x, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const bps = (b) => `${(b / 100).toLocaleString("en-GB")}%`;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
const when = (iso) =>
iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "";

const signed = (r) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(2)}`;

const words = (s) => {
const t = String(s ?? "").replaceAll("_", " ");
return t.charAt(0).toUpperCase() + t.slice(1);
};
let numberFormat = null;
const plural = (n, one, many = `${one}s`) => `${(numberFormat ??= new Intl.NumberFormat("en-GB")).format(n)} ${n === 1 ? one : many}`;


const title = (text, lede) => [h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, text), lede ? h("p", { class: "ap-lede" }, lede) : null].filter(Boolean);

const rows = (pairs) => h("dl", { class: "ap-dl" }, pairs.filter(Boolean).map(([k, v]) => [h("dt", null, k), h("dd", null, v)]));
const chip = (text, tone) => h("span", { class: `ob-chip ap-chip${tone ? ` ap-chip--${tone}` : ""}` }, text);

function loading(el, text = "Loading.") {
el.setAttribute("aria-busy", "true");
el.replaceChildren(
h("div", { class: "ap-loading cn-loading", role: "status" },
h("span", { class: "ob-sr" }, text),
h("span", { class: "cn-skel", "aria-hidden": "true" }, [0, 1, 2, 3].map(() => h("span", { class: "cn-skel-line" }))),
),
);
}

const pathWords = (path) => {
const key = String(path).replace(/\[\d+\]/g, "").split(".").pop() || "";
const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase().trim();
return words.charAt(0).toUpperCase() + words.slice(1);
};

function detailList(details, message) {
if (!Array.isArray(details) || !details.length) return null;
const lines = details.map((d) => d.say ?? (d.path && d.path !== "(body)" ? `${d.label ?? pathWords(d.path)} ${d.message}.` : `${d.message}.`)).filter((line) => line !== message);
return lines.length ? h("ul", { class: "ap-details" }, lines.map((line) => h("li", null, line))) : null;
}

function unloaded(err) {
if (!err || err.code) return null;
const msg = String(err.message ?? "");
if (/dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|NetworkError|Load failed/i.test(msg))
return navigator.onLine === false ? "You are offline. Connect again, then reload to open this part of Orbe." : "This part of Orbe did not load, perhaps because Orbe has just been updated. Reload to get it.";
if (err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError) return "Something went wrong on this screen. Reload to try again.";
return null;
}

function failure(err, retry) {

if (err?.code === "sent_to_owner")
return h("div", { class: "ap-msg ap-msg--wait", role: "status" }, h("p", null, err.message), h("a", { class: "ob-lnk", href: "/orbe-site/demo/app/settings/team?tab=approvals" }, "See the request"));

if (err?.code === "network" || (navigator.onLine === false && unloaded(err))) {
const again = retry ?? (() => location.reload());
const box = h("div", { class: "ap-msg ap-msg--wait", role: "status" },
h("p", null, navigator.onLine === false ? "You are offline. This opens once you are connected again." : err.message),
h("button", { class: "ap-quiet", type: "button", onclick: again }, "Try again"),
);
window.addEventListener("online", () => box.isConnected && again(), { once: true });
return box;
}

const plain = unloaded(err);
if (plain)
return h("div", { class: "ap-msg", role: "alert" }, h("p", null, plain), h("button", { class: "ap-quiet", type: "button", onclick: () => location.reload() }, "Reload"));
return h(
"div",
{ class: "ap-msg", role: "alert" },
h("p", null, err?.message ?? "Something went wrong."),
detailList(err?.details, err?.message),

err?.requestId ? h("details", { class: "ap-ref" }, h("summary", null, "Reference for Orbe"), h("code", null, err.requestId)) : null,

retry && err?.code !== "invalid_request" && err?.status !== 404 ? h("button", { class: "ap-quiet", type: "button", onclick: retry }, "Try again") : null,
);
}

function countryCodes(value) {
const codes = String(value ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
if (codes.some((c) => !/^[A-Z]{2}$/.test(c))) throw new Error("Countries take two-letter codes separated by commas, like GB, IE.");
return codes;
}

function notThere(main, title, line, back) {
document.title = "Not found: Orbe";
main.replaceChildren(
h("h1", { class: "ap-h1", tabindex: "-1", "data-title": "" }, title),
h("p", { class: "ap-lede" }, line),
h("p", null, h("a", { class: "ob-lnk", href: back[1] }, back[0])),
);
}


function opener() {
const a = document.activeElement;
return a && a !== document.body ? a : (document.querySelector("button[aria-busy=true]") ?? a);
}
function refocus(el) {
const to = el?.isConnected && el.getClientRects().length && el !== document.body && el !== document.documentElement ? el : (document.querySelector("main [data-title]") ?? document.querySelector("main"));
to?.focus?.({ preventScroll: true });
}
const ok = (text) => h("p", { class: "ap-ok", role: "status" }, text);

function soon(name, text) {
return h("div", { class: "ap-soon" }, h("span", { class: "ob-chip ob-chip--soon" }, "Coming soon"), h("h3", { class: "ap-h3" }, name), h("p", null, text));
}
const empty = (text, ...more) => h("div", { class: "ap-empty" }, h("p", null, text), ...more);

async function block(el, load, render, opts = {}) {

let slow = 0;
if (el.childElementCount && !el.querySelector(":scope > .cn-loading")) {
el.setAttribute("aria-busy", "true");
slow = setTimeout(() => loading(el, opts.loadingText), 150);
} else loading(el, opts.loadingText);
try {
const data = await load();
clearTimeout(slow);
el.removeAttribute("aria-busy");
el.replaceChildren(...[render(data)].flat(Infinity).filter(Boolean));
} catch (e) {
clearTimeout(slow);
el.removeAttribute("aria-busy");
if (opts.soon && notBuiltYet(e)) el.replaceChildren(soon(opts.soon[0], opts.soon[1]));
else el.replaceChildren(failure(e, () => block(el, load, render, opts)));
}
}

function toast(text, link) {
let region = document.querySelector(".cn-toasts");
if (!region) {
region = h("div", { class: "cn-toasts", "aria-hidden": "true", popover: "manual" });
document.body.append(region);
}

if (region.showPopover) {
if (region.matches(":popover-open")) region.hidePopover();
region.showPopover();
}
const t = h("div", { class: `cn-toast${link ? " cn-toast--link" : ""}` }, h("span", null, text), link ? h("a", { class: "cn-toast-a", href: link.href, tabindex: "-1" }, link.label) : null);
region.append(t);
requestAnimationFrame(() => t.classList.add("is-in"));
let held = false;
t.addEventListener("pointerenter", () => (held = true));
t.addEventListener("pointerleave", () => (held = false));
const leave = () => {
if (held) return setTimeout(leave, 800);
t.classList.remove("is-in");
setTimeout(() => t.remove(), 240);
};
setTimeout(leave, link ? 6000 : 3200);
announce(link ? `${text} ${link.label}.` : text);
}

function announce(text) {
const live = document.querySelector("[data-live]");
if (!live) return;
live.textContent = "";
setTimeout(() => (live.textContent = text), 30);
}

const input = (props) => h("input", { class: "ob-input", ...props });
const textarea = (props) => h("textarea", { class: "ob-input ap-textarea", rows: 3, ...props });
const select = (options, props) => h("select", { class: "ob-input ap-select", ...props }, options.map(([v, label]) => h("option", { value: v, selected: props?.value === v }, label)));
function field(label, control, hint) {
if (!control.id) control.id = nextId("f");
let hintEl = null;
if (hint) {
hintEl = h("p", { class: "ap-hint", id: `${control.id}-hint` }, hint);
control.setAttribute("aria-describedby", hintEl.id);
}
return h("div", { class: "ap-field" }, h("label", { for: control.id }, label), control, hintEl);
}
function check(label, props = {}) {
const box = h("input", { type: "checkbox", ...props });
return h("label", { class: "ap-check" }, box, h("span", null, label));
}

const focusBefore = new WeakMap();
function setBusy(btn, busy) {
if (busy) {
focusBefore.set(btn, document.activeElement);
btn.dataset.label = btn.textContent;
btn.textContent = "Working";
btn.disabled = true;
btn.setAttribute("aria-busy", "true");
} else {
btn.textContent = btn.dataset.label ?? btn.textContent;
btn.disabled = false;
btn.removeAttribute("aria-busy");
const was = focusBefore.get(btn);
focusBefore.delete(btn);
const lost = !document.activeElement || document.activeElement === document.body;
if (lost && was?.isConnected && was !== document.body) was.focus({ preventScroll: true });
}
}

function form(controls, submitLabel, onSubmit, opts = {}) {
const status = h("div", { class: "ap-status", "aria-live": "polite" });
const btn = h("button", { class: opts.primary === false ? "ap-quiet" : "ob-btn ob-btn--s", type: "submit" }, submitLabel);
const f = h("form", { class: "ap-form" }, controls, h("div", { class: "ap-actions" }, btn, opts.extra ?? null), status);
f.addEventListener("submit", async (e) => {
e.preventDefault();
setBusy(btn, true);
status.replaceChildren();
try {
const said = await onSubmit(new FormData(f), f);
if (said) {
status.replaceChildren(ok(said));
announce(said);
}
} catch (err) {
status.replaceChildren(failure(err));
} finally {
if (btn.isConnected) setBusy(btn, false);

setTimeout(() => {
const a = document.activeElement;
if (f.isConnected && (!a || a === document.body)) (btn.disabled ? f.querySelector("input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)") : btn)?.focus({ preventScroll: true });
});
}
});
return f;
}

function action(label, run, opts = {}) {
const btn = h("button", { class: opts.primary ? "ob-btn ob-btn--s" : `ap-quiet${opts.danger ? " ap-quiet--danger" : ""}`, type: "button" }, label);
btn.addEventListener("click", async () => {
if (opts.confirm && !(await confirmBox(opts.confirm, { yes: label, danger: opts.danger }))) return;
const host = btn.closest(".ap-actions") ?? btn.parentElement;
host?.nextElementSibling?.classList.contains("ap-msg") && host.nextElementSibling.remove();
setBusy(btn, true);
try {
const said = await run();
if (said) toast(said);
} catch (err) {
host?.after(failure(err));
} finally {
if (btn.isConnected) setBusy(btn, false);
}
});
return btn;
}
const actions = (...btns) => h("div", { class: "ap-actions" }, btns);

function confirmBox(text, { yes = "Confirm", danger = false, title } = {}) {
return new Promise((resolve) => {
const back = opener();
const no = h("button", { class: "cn-btn cn-btn--ghost", type: "button", value: "no" }, "Cancel");
const go = h("button", { class: `cn-btn ${danger ? "cn-btn--danger" : "cn-btn--primary"}`, type: "button", value: "yes" }, yes);
const d = h("dialog", { class: "cn-confirm", "aria-label": title ?? yes },
title ? h("p", { class: "cn-confirm-t" }, title) : null,
h("p", { class: "cn-confirm-d" }, text),
h("div", { class: "cn-confirm-actions" }, no, go),
);
let answer = false;
no.addEventListener("click", () => d.close());
go.addEventListener("click", () => ((answer = true), d.close()));
d.addEventListener("click", (e) => e.target === d && d.close());
d.addEventListener("close", () => {
d.remove();
refocus(back);
resolve(answer);
});
document.body.append(d);
d.showModal();
(danger ? no : go).focus();
});
}

const remembered = (key) => {
try {
return localStorage.getItem(`orbe.tab.${key}`);
} catch {
return null;
}
};
const remember = (key, id) => {
try {
localStorage.setItem(`orbe.tab.${key}`, id);
} catch {

}
};

function tabs(key, items, initial, opts = {}) {
const address = opts.address === true;
const alias = opts.alias ?? {};
const list = h("div", { class: "ap-tabs", role: "tablist", "aria-label": key });
const panelEl = h("div", { class: "ap-tabpanel", role: "tabpanel", tabindex: "0" });
const buttons = items.map((it) =>
h("button", { class: "ap-tab", type: "button", role: "tab", id: `tab-${key}-${it.id}`, "aria-controls": "", "aria-selected": "false", tabindex: "-1", onclick: () => choose(it.id, "push") }, it.label),
);
list.append(...buttons);
const pid = nextId("tp");
panelEl.id = pid;
for (const b of buttons) b.setAttribute("aria-controls", pid);
let current = null;

const edges = () => {
const max = list.scrollWidth - list.clientWidth;
const at = list.scrollLeft;
const fade = max <= 1 ? "" : at <= 1 ? "end" : at >= max - 1 ? "start" : "both";
if ((list.dataset.fade ?? "") !== fade) list.dataset.fade = fade;
};
const reveal = (b) => {
if (list.scrollWidth <= list.clientWidth) return;
const box = list.getBoundingClientRect();
const r = b.getBoundingClientRect();
const room = 40;
if (r.left < box.left + room) list.scrollLeft -= box.left + room - r.left;
else if (r.right > box.right - room) list.scrollLeft += r.right - (box.right - room);
};
list.addEventListener("scroll", edges, { passive: true });
if (typeof ResizeObserver === "function") new ResizeObserver(() => (edges(), current !== null && reveal(buttons[current]))).observe(list);
const known = (id) => (items.some((x) => x.id === alias[id]) ? alias[id] : items.some((x) => x.id === id) ? id : null);

function choose(id, how) {
const i = Math.max(0, items.findIndex((x) => x.id === id));
if (address && how) {
const u = new URL(location.href);
if (i === 0) u.searchParams.delete("tab");
else u.searchParams.set("tab", items[i].id);
if (u.href !== location.href) history[how === "push" ? "pushState" : "replaceState"](history.state, "", u);
} else if (how) remember(key, items[i].id);
if (current === i) return;
current = i;
buttons.forEach((b, j) => {
b.setAttribute("aria-selected", String(i === j));
b.tabIndex = i === j ? 0 : -1;
});
panelEl.setAttribute("aria-labelledby", buttons[i].id);
reveal(buttons[i]);
panelEl.replaceChildren();
items[i].render(panelEl);
}
list.addEventListener("keydown", (e) => {
const i = buttons.indexOf(document.activeElement);
if (i < 0) return;
const to = e.key === "ArrowRight" ? (i + 1) % buttons.length : e.key === "ArrowLeft" ? (i - 1 + buttons.length) % buttons.length : e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : -1;
if (to < 0) return;
e.preventDefault();
buttons[to].focus();

choose(items[to].id, "replace");
});
const set = h("div", { class: "ap-tabset" }, list, panelEl);
if (address) {

set.dataset.addressTabs = "";
set.addEventListener("orbe:address", () => {
const had = buttons.includes(document.activeElement);
choose(known(new URLSearchParams(location.search).get("tab")) ?? items[0].id);
if (had) buttons[current].focus();
});
const want = known(initial);

choose(want ?? items[0].id, initial && want !== initial ? "replace" : null);
} else choose(initial && items.some((x) => x.id === initial) ? initial : (remembered(key) ?? items[0].id));
return set;
}
});
__o.d("site/mark.js", function (__x) {
"use strict";
__o.e(__x, { PORTAL: () => PORTAL, LOCKUP: () => LOCKUP, portalMarkup: () => portalMarkup, tileMarkup: () => tileMarkup });

const PORTAL = {
text: "M25.78,50.38L25.97,50.28L26.15,50.16L26.36,49.99L26.51,49.84L26.64,49.67L26.75,49.49L26.85,49.30L26.95,49.05L27,48.84L27.04,48.63L27.14,47.47L27.27,46.49L27.41,45.66L27.59,44.83L27.83,43.87L28.12,42.93L28.44,41.99L28.80,41.07L29.09,40.43L29.45,39.66L29.85,38.92L30.27,38.18L30.64,37.58L31.11,36.88L31.52,36.30L32.04,35.63L32.58,34.98L33.24,34.25L33.83,33.64L34.55,32.96L35.19,32.41L35.96,31.79L36.64,31.28L37.33,30.80L38.05,30.35L38.78,29.92L39.53,29.52L40.42,29.09L41.19,28.75L41.98,28.44L42.78,28.16L43.72,27.87L44.54,27.66L45.37,27.47L46.20,27.32L47.04,27.19L47.88,27.10L48.72,27.04L49.57,27L50.42,27L51.26,27.03L52.11,27.10L52.95,27.19L53.79,27.31L54.62,27.47L55.45,27.65L56.26,27.87L57.07,28.12L57.74,28.34L58.53,28.64L59.31,28.97L59.96,29.27L60.71,29.65L61.33,29.98L61.94,30.34L62.66,30.79L63.35,31.27L64.03,31.78L64.70,32.31L65.44,32.95L66.06,33.53L66.56,34.03L67.13,34.65L67.77,35.40L68.01,35.62L68.27,35.80L68.55,35.94L68.86,36.05L69.17,36.10L69.49,36.11L69.81,36.07L89.22,32.33L89.58,32.23L89.78,32.14L89.97,32.03L90.19,31.88L90.39,31.69L90.56,31.49L90.71,31.26L90.83,31.02L90.92,30.76L90.98,30.49L91,30.22L91,11.15L90.97,10.82L90.91,10.56L90.79,10.26L90.66,10.02L90.50,9.80L90.32,9.61L90.11,9.43L89.88,9.29L89.64,9.17L89.39,9.08L89.12,9.02L88.85,9L39.91,9L39.59,9.02L39.27,9.09L39.02,9.19L38.73,9.34L38.56,9.47L38.36,9.64L9.64,38.36L9.47,38.56L9.31,38.78L9.19,39.02L9.09,39.27L9.02,39.59L9,39.91L9,54.88L9.02,55.10L9.08,55.36L9.17,55.62L9.28,55.86L9.43,56.08L9.60,56.29L9.80,56.47L9.97,56.60L10.21,56.74L10.40,56.83L10.66,56.91L10.92,56.96L11.19,56.98L11.46,56.96L11.73,56.91L11.98,56.83ZM32.87,65.35L32.12,64.49L31.91,64.32L31.69,64.17L31.40,64.04L31.09,63.94L30.83,63.90L30.56,63.89L30.24,63.92L10.73,67.68L10.42,67.77L10.08,67.94L9.77,68.16L9.54,68.39L9.32,68.69L9.15,69.03L9.04,69.40L9,69.78L9,88.80L9.01,89.02L9.04,89.23L9.11,89.49L9.19,89.69L9.29,89.88L9.43,90.11L9.57,90.28L9.76,90.47L10.07,90.69L10.41,90.85L10.61,90.92L10.82,90.97L11.20,91L88.80,91L89.12,90.98L89.44,90.91L89.74,90.79L90.02,90.63L90.28,90.43L90.50,90.20L90.69,89.93L90.83,89.64L90.91,89.44L90.96,89.23L90.99,89.02L91,88.80L91,45.17L90.98,44.90L90.91,44.59L90.79,44.28L90.63,44L90.43,43.75L90.20,43.53L89.93,43.34L89.65,43.19L89.44,43.12L89.24,43.07L89.02,43.03L88.81,43.02L88.59,43.03L88.38,43.06L88.12,43.13L87.92,43.21L74.22,49.62L73.94,49.78L73.68,49.97L73.46,50.20L73.27,50.46L73.13,50.75L73.02,51.05L72.96,51.37L72.88,52.39L72.77,53.23L72.64,54.07L72.50,54.76L72.31,55.58L72.09,56.40L71.84,57.21L71.56,58.01L71.25,58.80L70.97,59.44L70.61,60.21L70.29,60.84L69.95,61.45L69.51,62.18L69.05,62.89L68.64,63.47L68.14,64.15L67.60,64.80L67.05,65.44L66.47,66.06L65.86,66.65L65.24,67.23L64.60,67.78L63.93,68.30L63.25,68.80L62.55,69.28L61.83,69.72L61.10,70.15L60.35,70.54L59.58,70.91L58.81,71.25L58.02,71.56L57.22,71.84L56.41,72.09L55.46,72.34L54.63,72.53L53.80,72.68L52.96,72.81L51.98,72.91L51.13,72.97L50.29,73L49.44,72.99L48.60,72.96L47.61,72.88L46.63,72.75L45.80,72.61L44.83,72.41L44.01,72.21L43.19,71.97L42.39,71.70L41.60,71.41L40.69,71.03L39.92,70.67L39.04,70.22L38.30,69.80L37.58,69.36L36.76,68.81L36.08,68.31L35.41,67.78L34.77,67.23L34.04,66.56L33.44,65.97Z",
small: "M26.99,53.69L27.18,53.62L27.38,53.50L27.57,53.36L27.71,53.22L27.83,53.06L27.92,52.90L28.02,52.68L28.07,52.49L28.10,52.14L28.02,50.95L28,49.87L28.03,48.79L28.11,47.85L28.24,46.78L28.42,45.71L28.66,44.66L28.91,43.75L29.15,42.98L29.42,42.21L29.72,41.46L30.05,40.72L30.41,39.99L30.79,39.28L31.20,38.58L31.63,37.89L32.17,37.12L32.74,36.36L33.25,35.74L33.88,35.03L34.54,34.35L35.22,33.70L35.94,33.08L36.68,32.49L37.44,31.94L38.11,31.49L38.92,30.99L39.74,30.54L40.59,30.11L41.45,29.73L42.33,29.38L43.22,29.07L44,28.83L44.91,28.60L45.84,28.40L46.77,28.24L47.70,28.12L48.65,28.04L49.59,28L50.54,28.01L51.48,28.05L52.42,28.13L53.36,28.26L54.29,28.42L55.21,28.63L56.12,28.87L57.02,29.15L57.91,29.47L58.79,29.83L59.52,30.17L60.25,30.53L61.07,30.99L61.77,31.41L62.55,31.93L63.32,32.49L63.95,32.99L64.67,33.61L65.46,34.35L66.12,35.02L66.74,35.73L67.26,36.36L67.83,37.11L68.36,37.89L68.95,38.82L69.12,39.04L69.33,39.22L69.60,39.38L69.89,39.49L70.16,39.53L70.47,39.53L70.78,39.46L89.89,33.25L90.11,33.16L90.32,33.04L90.58,32.81L90.71,32.65L90.81,32.49L90.94,32.16L90.98,31.97L91,31.77L91,10.56L90.98,10.33L90.92,10.10L90.83,9.88L90.71,9.68L90.47,9.41L90.32,9.29L90.15,9.19L89.98,9.11L89.79,9.05L89.60,9.01L89.40,9L39.66,9L39.43,9.02L39.20,9.07L38.98,9.15L38.74,9.29L38.53,9.47L9.47,38.53L9.34,38.68L9.23,38.84L9.14,39.01L9.06,39.24L9.01,39.47L9,39.66L9,57.37L9.05,57.72L9.17,58.05L9.36,58.35L9.58,58.57L9.88,58.76L10.06,58.84L10.24,58.89L10.44,58.93L10.63,58.93L10.83,58.92L11.02,58.88ZM31.09,61.24L30.93,61.02L30.76,60.85L30.54,60.69L30.30,60.57L30.03,60.49L29.80,60.46L29.56,60.47L29.30,60.52L10.07,66.76L9.85,66.86L9.65,66.98L9.47,67.13L9.32,67.31L9.19,67.51L9.08,67.77L9.02,67.99L9,68.23L9,89.44L9.05,89.79L9.11,89.98L9.19,90.15L9.39,90.45L9.65,90.69L9.88,90.83L10.10,90.92L10.37,90.98L10.60,91L89.40,91L89.60,90.99L89.83,90.94L90.05,90.86L90.26,90.75L90.45,90.61L90.59,90.47L90.73,90.29L90.85,90.08L90.96,89.75L91,89.40L91,42.63L90.98,42.43L90.93,42.20L90.85,41.98L90.73,41.78L90.61,41.62L90.45,41.46L90.26,41.32L90.09,41.22L89.79,41.12L89.52,41.07L89.25,41.07L88.94,41.13L73.01,46.31L72.69,46.45L72.43,46.64L72.25,46.84L72.09,47.07L71.98,47.32L71.91,47.62L71.90,47.90L71.97,48.92L72,49.86L71.99,50.81L71.93,51.75L71.84,52.69L71.70,53.62L71.52,54.55L71.31,55.47L71.05,56.38L70.80,57.15L70.53,57.91L70.22,58.66L69.89,59.40L69.47,60.25L69.01,61.07L68.59,61.77L68.14,62.44L67.59,63.21L67.01,63.95L66.39,64.67L65.75,65.36L65.08,66.02L64.37,66.66L63.64,67.26L62.89,67.83L62.11,68.36L61.31,68.87L60.49,69.34L59.65,69.77L58.80,70.17L57.92,70.52L57.03,70.85L56.13,71.13L55.35,71.34L54.43,71.55L53.50,71.72L52.56,71.85L51.62,71.94L50.68,71.99L49.73,72L48.79,71.97L47.85,71.89L46.91,71.78L45.98,71.63L45.05,71.44L44.14,71.20L43.23,70.93L42.34,70.62L41.46,70.28L40.60,69.89L39.75,69.47L38.93,69.01L38.12,68.52L37.34,67.99L36.68,67.51L35.94,66.92L35.23,66.30L34.54,65.65L33.88,64.98L33.26,64.27L32.66,63.54L32.09,62.78L31.56,62Z",
};

const LOCKUP = { oTop: -713, oBottom: 13, oHeight: 726, gap: 420, wordHeight: 755 };
const pathFor = (cut) => PORTAL[cut === "small" ? "small" : "text"];

function portalMarkup({ cut = "text", fill = "currentColor", cls = "", label = "" } = {}) {
const a11y = label ? ` role="img" aria-label="${label}"` : ` aria-hidden="true" focusable="false"`;
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8.5 8.5 83 83"${cls ? ` class="${cls}"` : ""}${a11y}><path fill="${fill}" fill-rule="evenodd" d="${pathFor(cut)}"/></svg>`;
}

function tileMarkup({ bg, fg, cut = "text", radius = 0, label = "Orbe" } = {}) {
const k = cut === "small" ? 0.84 : 0.72, o = 50 - 50 * k;
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${label}"><rect width="100" height="100"${radius ? ` rx="${100 * radius}"` : ""} style="fill:${bg}"/><g transform="translate(${o} ${o}) scale(${k})"><path style="fill:${fg}" fill-rule="evenodd" d="${pathFor(cut)}"/></g></svg>`;
}
});
__o.css("/orbe-site/demo/app/c/app.f15c15a586.css").then(function () { __o.r("js/main.js"); });
