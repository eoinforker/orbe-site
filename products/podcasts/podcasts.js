/*
  Podcasts: the set-up wizard, the sample dashboard, the smart link preview
  and the plausibility check, all on the podcast module's own code
  (site/assets/engine/podcast, built from product/src/podcast). The feed is
  read in the browser; nothing is sent to Orbe.
*/
import { shell, $, $$, esc, count, day, pct, store, copyText, copyLabel, readText, barsList, dayChart, country, nodash, icon, fold, sourcesList } from "../assets/shell.js";
import {
  readFeedDetails, suggestShowId, isShowId, prefixFor, prefixUrl, prefixChain, stepsFor, HOST_HOWTO, hostOf, checkPrefix, txtCode, txtTag,
  sampleDashboard, SAMPLE_LABEL, buildPublicStats, appLinks, chooseApp, landingPage, APP_NAMES, APPS, assessPlausibility, RULES_VERSION, PROVENANCE_METHODS, MIN_REPORTABLE,
} from "../../assets/engine/podcast/browser.js";

shell("podcasts");

const state = { feed: null, feedUrl: "", xml: "", showId: "", host: "", madeUp: false };
const DEVICE_SECRET = (() => {
  let s = store.local.get("orbe-podcast-device-secret");
  if (!s) { s = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""); store.local.set("orbe-podcast-device-secret", s); }
  return s;
})();
const maskEmail = (email) => {
  const [user, domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const mask = (s) => (s.length <= 1 ? s : s[0] + "*".repeat(Math.min(s.length - 1, 8)));
  return `${mask(user)}@${mask(dot > 0 ? domain.slice(0, dot) : domain)}${dot > 0 ? domain.slice(dot) : ""}`;
};

/* ---------- 1. the feed ---------- */
const status = $("[data-feed-status]");
for (const b of $$("[data-copy-prefix], [data-copy-txt], [data-copy-sl]")) b.innerHTML = copyLabel();
$("[data-attach]").innerHTML = icon("upload", { size: 20 });
$("[data-chip-clear]").innerHTML = icon("close", { size: 16 });
$("[data-attach]").addEventListener("click", () => $("[data-xml-file]").click());
$("[data-chip-clear]").addEventListener("click", () => { $("[data-xml-file]").value = ""; $("[data-chip]").classList.add("hide"); $("[data-feed-url]").focus(); });
const reading = (what) => (status.innerHTML = `<span class="state waiting"><span class="arc" aria-hidden="true"></span>${esc(what)}</span>`);
$("[data-paste-open]").addEventListener("click", () => { $("[data-paste]").classList.remove("hide"); $("[data-xml]").focus(); });
$("[data-feed-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("[data-feed-url]").value.trim();
  if (!/^https?:\/\//i.test(url)) return void (status.innerHTML = `<span class="err">Paste the full feed address, starting with https://</span>`);
  reading("Reading your feed");
  try {
    const res = await fetch(url, { headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.5" }, cache: "no-store" });
    if (!res.ok) throw new Error(`The feed answered ${res.status}.`);
    load(await res.text(), url, false);
  } catch (x) {
    const blocked = x instanceof TypeError;
    status.innerHTML = `<span class="err">${blocked ? "Your host does not let browsers read the feed directly (CORS), or the address could not be reached." : esc(x.message)}</span> Paste the feed or upload the file instead: open the address in a new tab, copy everything and paste it below.`;
    $("[data-paste]").classList.remove("hide");
    state.feedUrl = url;
  }
});
$("[data-xml-read]").addEventListener("click", () => load($("[data-xml]").value, state.feedUrl || $("[data-feed-url]").value.trim() || "https://example.invalid/your-feed.xml", false));
$("[data-xml-file]").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  $("[data-chip-name]").textContent = f.name;
  $("[data-chip]").classList.remove("hide");
  reading(`Reading ${f.name}`);
  load(await readText(f), state.feedUrl || $("[data-feed-url]").value.trim() || `https://example.invalid/${f.name}`, false);
});
$("[data-madeup]").addEventListener("click", async () => {
  const xml = await (await fetch("../fixtures/made-up-feed.xml")).text();
  $("[data-feed-url]").value = "https://example.invalid/long-table/feed.xml";
  load(xml, "https://example.invalid/long-table/feed.xml", true);
});

function load(xml, feedUrl, madeUp) {
  let feed;
  try {
    feed = readFeedDetails(xml);
  } catch (x) {
    status.innerHTML = `<span class="err">That is not a feed we can read: ${esc(nodash(x?.message ?? "unknown error"))}</span>`;
    return;
  }
  Object.assign(state, { feed, feedUrl, xml, madeUp });
  $("[data-xml]").value = xml.length < 400_000 ? xml : "";
  const saved = store.local.json("orbe-podcast-shows") ?? {};
  state.showId = saved[feedUrl] || suggestShowId(feed.title.replace(/\(made up\)/i, ""), Math.random);
  saved[feedUrl] = state.showId;
  store.local.put("orbe-podcast-shows", saved);
  const newest = [...feed.enclosures].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  state.host = (newest[0] && hostOf(newest[0].url)) || "";
  status.innerHTML = `<span class="ok">Read ${esc(feed.title)}: ${feed.enclosures.length} episodes with audio.</span>${madeUp ? " A made-up feed, for trying the tools." : ""}`;
  renderShow();
  renderPrefix();
  renderDashboard();
  renderSmartLink();
}

function renderShow() {
  const f = state.feed;
  const newest = [...f.enclosures].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const chains = newest.slice(0, 5).map((e) => prefixChain(e.url));
  const others = [...new Set(chains.flatMap((c) => c.others))];
  const closed = [...new Set(chains.flatMap((c) => c.closed))];
  $("[data-show]").innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h3 class="h3">${esc(f.title)}</h3><p class="small">${esc(f.categories.join(", ") || "No categories")}${f.ownerName ? ` · ${esc(f.ownerName)}` : ""}</p></div>
      ${state.madeUp ? '<span class="tag">Made up</span>' : ""}
    </div>
    <dl class="dl">
      <dt>Episodes with audio</dt><dd>${count(f.enclosures.length)}</dd>
      <dt>Host we detect</dt><dd>${esc(state.host || "Not recognised")}</dd>
      <dt>Other measurement in the feed</dt><dd>${esc(others.join(", ") || "None")}</dd>
    </dl>
    ${closed.length ? `<p class="note warn">Your feed still sends listeners through ${esc(closed.join(" and "))}, which has closed. Removing it avoids failed downloads.</p>` : ""}
    ${others.length ? `<p class="small">Prefixes chain, so ${esc(others.join(" and "))} can stay. Put Orbe's in front.</p>` : ""}
    <div>${newest.slice(0, 3).map(epRow).join("")}</div>
    ${newest.length > 3 ? fold(`All ${count(newest.length)} episodes`, "", `<div>${newest.slice(3, 40).map(epRow).join("")}</div>${newest.length > 40 ? `<p class="small">and ${newest.length - 40} older.</p>` : ""}`) : ""}`;
}

const epRow = (e) => `<div class="ep"><span class="t">${esc(e.title)}</span><span class="small">${esc(day(e.publishedAt))}</span><span class="m">${e.durationSec ? `${Math.round(e.durationSec / 60)} min · ` : ""}${e.bytes ? `${(e.bytes / 1e6).toFixed(1)} MB · ` : ""}${esc(e.url.replace(/^https?:\/\//, "").slice(0, 70))}</span></div>`;

/* ---------- 2. prefix, txt and check ---------- */
const hostSel = $("[data-host]");
hostSel.innerHTML = HOST_HOWTO.map((h) => `<option value="${esc(h.host)}">${esc(h.host)}</option>`).join("") + `<option value="">Another host</option>`;
hostSel.addEventListener("change", () => { state.host = hostSel.value; renderPrefix(); });
$("[data-showid]").addEventListener("input", (e) => {
  const v = e.target.value.trim().toLowerCase();
  e.target.setAttribute("aria-invalid", String(!isShowId(v)));
  if (!isShowId(v)) return;
  state.showId = v;
  const saved = store.local.json("orbe-podcast-shows") ?? {};
  saved[state.feedUrl] = v;
  store.local.put("orbe-podcast-shows", saved);
  renderPrefix(false);
  renderDashboard();
  renderSmartLink();
});
$("[data-copy-prefix]").addEventListener("click", (e) => copyText(e.target, prefixFor(state.showId)));
$("[data-copy-txt]").addEventListener("click", (e) => copyText(e.target, $("[data-txt]").textContent));

function renderPrefix(setInput = true) {
  if (setInput) $("[data-showid]").value = state.showId;
  hostSel.value = HOST_HOWTO.some((h) => h.host === state.host) ? state.host : "";
  const steps = stepsFor(state.host || "your host", state.showId, state.feedUrl);
  $("[data-prefix]").textContent = steps.prefix;
  $("[data-steps]").innerHTML = steps.steps.map((s) => `<li>${esc(nodash(s))}</li>`).join("");
  $("[data-steps-n]").textContent = `${steps.steps.length} steps for ${state.host || "your host"}`;
  const how = HOST_HOWTO.find((h) => h.host === state.host);
  $("[data-confirmed]").textContent = how?.supportsPrefix === "no"
    ? "Without a prefix setting, Orbe estimates from public signals and can read your host's export. The rest of this page still works."
    : `These steps for ${state.host || "your host"} have not yet been checked against the host's live dashboard. Hosts move settings; if the menu has moved, search the settings for "prefix".`;
  const ep = [...(state.feed?.enclosures ?? [])].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))[0];
  const original = ep?.url ?? "https://media.example.com/your-show/episode-1.mp3";
  $("[data-example]").innerHTML = `${esc(original)}<br><span style="color:var(--ink)">${esc(prefixUrl(state.showId, original))}</span>`;
  $("[data-txt]").textContent = txtTag(txtCode(DEVICE_SECRET, "this-device", state.feedUrl || "https://example.invalid/feed.xml"));
  $("[data-owner]").textContent = state.feed?.ownerEmail ? ` (${maskEmail(state.feed.ownerEmail)})` : state.feed ? " (your feed has none, so this route is closed)" : "";
}

$("[data-check]").addEventListener("click", async () => {
  const out = $("[data-check-out]");
  if (!state.feed) return void (out.innerHTML = `<p class="err">Read your feed first.</p>`);
  let feed = state.feed;
  if (/^https?:\/\//.test(state.feedUrl) && !state.madeUp && !$("[data-xml]").value) {
    try { feed = readFeedDetails(await (await fetch(state.feedUrl, { cache: "no-store" })).text()); } catch { /* fall back to what we have */ }
  } else if ($("[data-xml]").value && $("[data-xml]").value !== state.xml) {
    try { feed = readFeedDetails($("[data-xml]").value); } catch { /* keep the last good read */ }
  }
  const c = checkPrefix(feed, state.showId, new Date());
  const tone = c.status === "live" ? "good" : c.status === "partial" ? "warn" : c.status === "wrong_show" ? "bad" : "";
  out.innerHTML = `<div class="stack" style="margin-top:12px"><p><span class="tag ${tone}">${esc({ live: "Live", partial: "Partly live", absent: "Not found yet", wrong_show: "Wrong show id", no_episodes: "No episodes" }[c.status])}</span></p>
    <p>${esc(nodash(c.message))}</p><p class="small">Checked the ${c.checked} newest episodes on ${esc(day(c.checkedAt))}; ${c.withPrefix} carry your prefix.${c.otherPrefixes.length ? ` Also counting: ${esc(c.otherPrefixes.join(", "))}.` : ""}</p>
    ${c.status !== "live" ? `<p class="small">Updated your host? Paste the refreshed feed in step 1 (or read it again), then check.</p>` : ""}</div>`;
});

/* ---------- 3. dashboard on sample data ---------- */
$("[data-sample-label]").innerHTML = `<b>${esc(SAMPLE_LABEL.split(".")[0])}.</b> ${esc(SAMPLE_LABEL.split(".").slice(1).join(".").trim())}`;
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
function renderDashboard() {
  const s = sampleDashboard({ feed: state.feed, feedUrl: state.feedUrl, showId: state.showId, through: yesterday() });
  const d = s.dashboard;
  const byDay = d.downloads.byDay;
  const total = d.downloads.total;
  const last7 = byDay.slice(-7).reduce((a, x) => a + x.downloads, 0);
  const apps = Object.entries(d.downloads.byApp).sort((a, b) => b[1] - a[1]);
  const countries = Object.entries(d.downloads.byCountry).sort((a, b) => b[1] - a[1]);
  const rows = [...d.downloads.byEpisode].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).filter((r) => r.downloads > 0);
  const promo = d.promos[0];
  const pub = buildPublicStats(d, true);
  const pl = d.plausibility;
  $("[data-dash-for]").textContent = `${state.feed.title}, last ${byDay.length} days`;
  $("[data-dash]").innerHTML = `
    <div class="panel stack primary">
      <div class="kpis">
        <div class="kpi"><div class="k">Downloads, ${byDay.length} days</div><div class="v">${count(total)}</div><div class="s">${esc(d.downloadsLabel)}</div></div>
        <div class="kpi"><div class="k">Last 7 days</div><div class="v">${count(last7)}</div><div class="s">${count(last7 / 7)} a day</div></div>
        <div class="kpi"><div class="k">Smart link clicks</div><div class="v">${count(d.links.total)}</div><div class="s">one per listener a day</div></div>
        <div class="kpi"><div class="k">Best chart position</div><div class="v">${d.charts.best[0] ? `No. ${d.charts.best[0].best}` : "None"}</div><div class="s">${esc(d.charts.best[0]?.chart ?? "")}</div></div>
      </div>
      <div>
        <div class="section-head" style="margin-bottom:6px"><h3 class="h3">Downloads by day</h3><span class="small">${esc(d.downloadsLabel)}</span></div>
        ${dayChart(byDay.map((x) => ({ label: x.day, value: x.downloads })))}
        <details class="table-view"><summary>Show as a table</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th class="r">Downloads</th></tr></thead><tbody>${byDay.map((x) => `<tr><td>${esc(day(x.day))}</td><td class="r">${count(x.downloads)}</td></tr>`).join("")}</tbody></table></div></details>
      </div>
    </div>
    ${fold("By episode", `${rows.length} episodes`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Episode</th><th>Out</th><th class="r">${byDay.length} days</th><th class="r">First 7 days</th><th class="r">First 30 days</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.title)}</td><td style="white-space:nowrap">${esc(day(r.publishedAt))}</td><td class="r">${count(r.downloads)}</td><td class="r">${r.downloads_7d === null ? '<span class="small">before</span>' : count(r.downloads_7d)}</td><td class="r">${r.downloads_30d === null ? '<span class="small">before</span>' : count(r.downloads_30d)}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="small">"Before" means the episode came out before measuring began, so its first week or month was not counted.</p>`)}
    ${fold("By app and by country", `${apps[0] ? `${esc(apps[0][0])} leads` : ""}`, `<div class="grid two"><div><p class="label" style="margin-bottom:10px">By app</p>${barsList(apps.slice(0, 8))}</div><div><p class="label" style="margin-bottom:10px">By country</p>${barsList(countries.slice(0, 8), { label: country })}</div></div>`)}
    ${fold("Charts and ratings", d.charts.best[0] ? `best No. ${d.charts.best[0].best}` : "", `
        ${d.charts.best.map((b) => `<dl class="dl"><dt>${esc(b.chart)}</dt><dd>No. ${b.best}</dd><dt>Best on</dt><dd>${esc(day(b.on))}</dd><dt>Latest</dt><dd>No. ${b.latest}, ${esc(day(b.latestOn))}</dd></dl>`).join("") || '<p class="small">Not in a tracked chart yet.</p>'}
        <ul class="reasons">${d.charts.moments.slice(-4).reverse().map((m) => `<li><span>${esc(day(m.date))}: ${esc(m.line)}</span></li>`).join("")}</ul>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ratings</th><th class="r">Average</th><th class="r">Ratings</th><th class="r">Change</th></tr></thead><tbody>${d.ratings.map((r) => `<tr><td>${esc(r.platform === "apple" ? "Apple Podcasts" : "Spotify")}${r.country ? ` (${esc(r.country.toUpperCase())})` : ""}</td><td class="r">${r.latest.average.toFixed(2)}</td><td class="r">${count(r.latest.count)}</td><td class="r">+${count(r.countChange)}</td></tr>`).join("")}</tbody></table></div>`)}
    ${fold("Smart link clicks", `${count(d.links.total)}`, `<div class="grid two"><div><p class="label" style="margin-bottom:10px">By app</p>${barsList(Object.entries(d.links.byApp).sort((a, b) => b[1] - a[1]), { label: (k) => APP_NAMES[k] ?? k })}</div><div><p class="label" style="margin-bottom:10px">Where the clicks came from</p>${barsList(Object.entries(d.links.bySource).sort((a, b) => b[1] - a[1]))}</div></div>`)}
    ${fold("Promo attribution", promo.status === "reported" ? `${count(promo.converted)} new listeners` : "", promo.status === "reported"
          ? `<p class="small">A cross-promo in another show. Estimated listeners who heard the promo, then tried this show for the first time within ${promo.windowDays} days.</p>
             <dl class="dl"><dt>Heard the promo</dt><dd>${count(promo.exposed)}</dd><dt>Already listening</dt><dd>${count(promo.alreadyListening)}</dd><dt>New listeners won</dt><dd>${count(promo.converted)}</dd><dt>Conversion</dt><dd>${pct(promo.conversionRate, 1)}</dd></dl>
             <p class="small">${esc(promo.note)} Shown only when both counts reach ${MIN_REPORTABLE}.</p>`
          : `<p>${esc(promo.note)}</p>`)}
    ${fold("How it was counted", "sources, exclusions, plausibility", `
        <ul class="fits">${d.tiers.map((t) => `<li><span class="tag ${t.available ? "good" : ""}">${t.available ? "On" : "Off"}</span><span><b style="font-weight:500">${esc(t.label)}.</b> ${esc(nodash(t.note))}</span></li>`).join("")}</ul>
        <p class="small">Of ${count(s.requests)} sample requests: ${count(s.excluded.bot)} from bots and feed readers, ${count(s.excluded.notGet)} that were not downloads (HEAD), ${count(s.excluded.tooSmall)} asking for under a minute of audio, ${count(s.excluded.duplicate)} repeats by the same listener on the same day. IAB-style rules, published.</p>
        ${pl ? `<p class="small">Plausibility of the host's figure: <span class="tag ${pl.verdict.startsWith("consistent") ? "good" : "warn"}">${esc(pl.verdict.replace(/_/g, " "))}</span> against ${esc(pl.signalsUsed.join(", "))}.</p>` : ""}`)}
    ${pub.status === "shown" ? fold("Your optional public page", "if you opt in", `<p class="small">Rounded, weekly, shares not counts. ${esc(pub.label)}.</p>
      <dl class="dl"><dt>Downloads, 30 days</dt><dd>About ${count(pub.downloads30d)}</dd><dt>Top apps</dt><dd>${esc(pub.appShares.slice(0, 3).map((a) => `${a.name} ${pct(a.share)}`).join(", "))}</dd><dt>Top countries</dt><dd>${esc(pub.countryShares.slice(0, 3).map((a) => `${country(a.name)} ${pct(a.share)}`).join(", "))}</dd></dl>`) : ""}`;
}

/* ---------- 4. smart link ---------- */
for (const sel of ["[data-sl-apple]", "[data-sl-spotify]", "[data-sl-youtube]"]) $(sel).addEventListener("input", renderSmartLink);
$("[data-copy-sl]").addEventListener("click", (e) => copyText(e.target, `https://orbe.vc/l/${state.showId}`));
const DEVICES = [
  ["iPhone, Apple Podcasts installed", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" }],
  ["Android phone", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" }],
  ["Windows laptop", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" }],
  ["Mac", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15" }],
  ["Taps a link ending ?app=spotify", { app: "spotify", userAgent: "Mozilla/5.0 (Linux; Android 14)" }],
  ["Chose Overcast last time on this phone", { cookieApp: "overcast", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X)" }],
];
function renderSmartLink() {
  const apps = {};
  const sp = $("[data-sl-spotify]").value.trim();
  const yt = $("[data-sl-youtube]").value.trim();
  if (/^https:\/\//.test(sp)) apps.spotify = sp;
  if (/^https:\/\//.test(yt)) apps.youtube = yt;
  const appleId = $("[data-sl-apple]").value.replace(/\D/g, "") || undefined;
  const link = { showId: state.showId, title: state.feed?.title ?? "Your show", feedUrl: state.feedUrl || "https://example.invalid/feed.xml", appleId, apps };
  const links = appLinks(link);
  $("[data-sl-url]").textContent = `orbe.vc/l/${state.showId}`;
  $("[data-sl-apps]").innerHTML = APPS.filter((k) => links[k]).map((k) => `<tr><td>${esc(APP_NAMES[k])}</td><td class="mono" style="overflow-wrap:anywhere;font-size:12.5px">${esc(links[k])}</td></tr>`).join("");
  $("[data-sl-cases]").innerHTML = DEVICES.map(([who, input]) => {
    const c = chooseApp(link, input);
    return `<tr><td>${esc(who)}</td><td>${c.kind === "redirect" ? `Straight to ${esc(APP_NAMES[c.app])}` : "The page listing every app"}</td></tr>`;
  }).join("") + (appleId ? "" : `<tr><td colspan="2" class="small">Add your Apple Podcasts id and Apple devices go straight to Apple Podcasts.</td></tr>`);
  const page = landingPage(link, `/l/${state.showId}`).replace("</head>", "<style>a{pointer-events:none}</style></head>");
  $("[data-sl-frame]").srcdoc = page;
}

/* ---------- 5. plausibility ---------- */
const form = $("[data-pl-form]");
const EXAMPLES = {
  ok: { claim: 21000, measured: 18900, days: 35, coverage: "live", op3: "", op3weeks: "", indexCount: 48, ratings: 160, chart: 64, videos: "", episodes: "", daily: "", dailyTotal: "" },
  bad: { claim: 310000, measured: "", days: "", coverage: "live", op3: 52000, op3weeks: 8, indexCount: 22, ratings: 4, chart: "", videos: "900, 1100, 760, 1300", episodes: "2026-09-02, 9000, 8200\n2026-09-09, 11000, 15000\n2026-09-16, 10000, 14800", daily: Array(21).fill(10000).join(", "), dailyTotal: 230000 },
};
for (const b of $$("[data-pl-ex]")) b.addEventListener("click", () => { fill(EXAMPLES[b.dataset.plEx]); form.requestSubmit(); });
$("[data-pl-clear]").addEventListener("click", () => { form.reset(); $("[data-pl-out]").innerHTML = ""; });
function fill(v) { for (const [k, x] of Object.entries(v)) if (form.elements[k]) form.elements[k].value = x; form.elements.dead.checked = false; }
const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? undefined : Number(v));
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = form.elements;
  const claimN = num(f.claim.value);
  const episodes = f.episodes.value.split(/\n+/).map((l) => l.split(/[,;\t]+/).map((x) => x.trim())).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p[0])).map((p, i) => ({ guid: `claimed-${i + 1}`, publishedAt: `${p[0]}T06:00:00.000Z`, downloads_7d: num(p[1]), downloads_30d: num(p[2]) }));
  const dailyVals = f.daily.value.split(/[\s,;]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  const daily = {};
  dailyVals.forEach((n, i) => { daily[new Date(Date.now() - (dailyVals.length - i) * 864e5).toISOString().slice(0, 10)] = n; });
  const claim = claimN === undefined && !episodes.length && !dailyVals.length ? null : { basis: "claimed", monthlyDownloads: claimN, episodes: episodes.length ? episodes : undefined, daily: dailyVals.length ? daily : undefined, dailyTotal: num(f.dailyTotal.value) };
  const measured = num(f.measured.value) !== undefined ? { monthlyDownloads: num(f.measured.value), daysMeasured: num(f.days.value) ?? 0, prefixCoverage: f.coverage.value } : null;
  const op3 = num(f.op3.value) !== undefined ? { asof: new Date().toISOString(), monthlyDownloads: num(f.op3.value), weeklyDownloads: [], weeklyAvgDownloads: num(f.op3.value) / 4.3, numWeeks: num(f.op3weeks.value) ?? 0 } : null;
  const index = num(f.indexCount.value) !== undefined || f.dead.checked ? { id: 0, title: state.feed?.title ?? "", url: state.feedUrl, episodeCount: num(f.indexCount.value), dead: f.dead.checked ? 1 : 0 } : null;
  const videos = f.videos.value.split(/[\s,;]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0).map((views, i) => ({ episodeGuid: `v${i}`, videoWorkId: `v${i}`, videoTitle: "", views, daysApart: 0, similarity: 1, firstFrameCount: false }));
  const p = assessPlausibility({ claim, measured, op3, index, feed: state.feed, videos, bestChart: num(f.chart.value) ? { rank: num(f.chart.value), chart: "a public chart" } : null, ratings: num(f.ratings.value) !== undefined ? { count: num(f.ratings.value) } : null, now: new Date() });
  const SIGNAL = {
    "Measured by Orbe": { kind: "engine", provenance: "Counted at Orbe's prefix with IAB-style rules. Typed into this form here; read live once the API is deployed." },
    "OP3 public counts": { kind: "public", provenance: "OP3, the open podcast prefix: public counts, typed into this form." },
    "Claimed daily series": { kind: "typed", provenance: "The claim as given, typed into this form." },
    "Podcast Index": { kind: "public", provenance: "The public Podcast Index listing, typed into this form." },
    "YouTube views of video episodes": { kind: "public", provenance: "Public YouTube view counts, typed into this form." },
    "Chart positions": { kind: "public", provenance: "A public chart position, typed into this form." },
    "Public ratings": { kind: "public", provenance: "Ratings shown publicly on Apple Podcasts and Spotify, typed into this form." },
  };
  const VERDICT = { consistent: ["Consistent", "good"], consistent_with_notes: ["Consistent, with notes", "good"], questions: ["Questions to ask", "warn"], inconsistent: ["Inconsistent", "bad"], not_enough_signal: ["Not enough signal", ""] };
  const SEV = { info: "", low: "", medium: "warn", high: "bad" };
  $("[data-pl-out]").innerHTML = `<div class="panel stack">
      <p><span class="tag ${VERDICT[p.verdict][1]}" style="font-size:17px">${VERDICT[p.verdict][0]}</span></p>
      ${fold("Signals compared", `${p.signalsUsed.length || "none"}`, p.signalsUsed.length ? sourcesList(p.signalsUsed.map((u) => ({ ...(SIGNAL[u] ?? { kind: "typed", provenance: "Typed into this form." }), label: u }))) : `<p class="small">Add a claim and at least one signal to compare it with.</p>`)}
      <p class="small">Rules ${esc(p.rulesVersion)}, every threshold provisional.</p>
      ${p.estimate ? `<p class="note">Public estimate: ${count(p.estimate.monthlyLow)} to ${count(p.estimate.monthlyHigh)} downloads a month, from ${esc(p.estimate.basis)}. ${esc(PROVENANCE_METHODS.estimated)}.</p>` : ""}
    </div>
    ${p.flags.length ? `<ul class="flags">${p.flags.map((fl) => `<li><details class="fold"><summary>${icon("caret", { size: 16, className: "caret" })}<span><span class="tag ${SEV[fl.severity]}">${esc({ high: "High", medium: "Medium", low: "Low", info: "Note" }[fl.severity] ?? fl.severity)}</span> ${esc(nodash(fl.reason))}</span></summary><div class="fold-body stack">${fl.innocent ? `<p class="small"><b style="font-weight:500">An innocent reading:</b> ${esc(nodash(fl.innocent))}</p>` : ""}<p class="small">${Object.entries(fl.evidence).map(([k, v]) => `${esc(k.replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase())}: ${esc(typeof v === "number" ? count(v) : v)}`).join(" · ")}</p></div></details></li>`).join("")}</ul>` : `<div class="panel"><p class="small" style="margin:0">No flags. ${p.verdict === "not_enough_signal" ? "Add a claim and at least one signal to compare it with." : "The claim sits within what the signals allow."}</p></div>`}`;
});

/* Start with the made-up show so the dashboard and smart link have something to show. */
(async () => {
  const xml = await (await fetch("../fixtures/made-up-feed.xml")).text();
  load(xml, "https://example.invalid/long-table/feed.xml", true);
  status.textContent = "Showing a made-up show until you read your own feed. We read the feed from your browser; if your host blocks that (a browser rule called CORS), paste the feed or upload the file.";
  $("[data-feed-url]").value = "";
})();
void RULES_VERSION;

/* Smart link and the plausibility check start folded; a link to either opens it. */
const openSection = (id) => { const d = document.getElementById(id)?.querySelector("details[data-sec]"); if (d) d.open = true; };
for (const a of document.querySelectorAll('nav a[href^="#"]')) a.addEventListener("click", () => openSection(a.getAttribute("href").slice(1)));
addEventListener("hashchange", () => openSection(location.hash.slice(1)));
if (location.hash) openSection(location.hash.slice(1));

