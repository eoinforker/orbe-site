/*
  Rights, from the creator's side: the same engine (site/assets/engine/rights),
  the same record format and the same canUse, held by the creator for their own
  deals. Each deal is a grant the creator issues on a work they own; what they
  owe the brand rides in the grant's note, so the record carries both halves.
  The creator, the works and the brands are made up. Nothing leaves the browser.
*/
import { $, $$, esc, day, download } from "../assets/shell.js";
import { createRecord, append, verifyChain, currentState, canUse, grantStatus, expiring, conflicts, exportJson, expiryCalendar, timeMs, CHANNELS } from "../../assets/engine/rights/browser.js";

/* ---------------------------------------------------------------- the made-up creator and her deals */
const NOW = "2026-10-20T12:00:00Z";
const ME = "creator:rosa-penhallow";
const OWED = "Deliverables: ";
const NAMES = {
  [ME]: "Rosa Penhallow",
  "brand:harbour-oats": "Harbour Oats",
  "brand:brackenfold-outdoor": "Brackenfold Outdoor",
  "brand:quillon-cycles": "Quillon Cycles",
  "brand:mosswell-tea": "Mosswell Tea",
  "brand:tallow-thyme": "Tallow and Thyme",
};
const CH_WORDS = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", pinterest: "Pinterest", x: "X", snapchat: "Snapchat", web: "Website", email: "Email", retail: "In store", ooh: "Outdoor", tv: "TV", print: "Print" };
const GBP = (pounds) => ({ amount: pounds * 100, currency: "GBP" });

function demo() {
  const E = [];
  let n = 0;
  const ev = (date, actor, type, data) => E.push({ at: `${date}T10:${String(n++ % 60).padStart(2, "0")}:00Z`, actor, type, data });
  const work = (date, id, kind, title) => ev(date, ME, "work.registered", { work: { id, creator: ME, kind, title, created: date } });
  const deal = (date, id, brand, workId, owed, o) => ev(date, ME, "grant.issued", { grant: { id, brand, work: workId, territory: ["GB"], fee: null, whitelisting: false, ads: false, note: OWED + owed, ...o } });

  work("2026-03-28", "wh-tent", "video", "Packing a tent in ninety seconds");
  deal("2026-03-30", "wh-01", "brand:brackenfold-outdoor", "wh-tent", "1 YouTube integration, 60 seconds. Delivered.", { channels: ["youtube", "instagram"], media: "paid", start: "2026-04-01", end: "2026-09-30", fee: GBP(2000), whitelisting: true, ads: true });
  work("2026-05-26", "wh-camp", "video", "Wild camping, one pan breakfast");
  deal("2026-05-28", "wh-02", "brand:harbour-oats", "wh-camp", "1 TikTok and 1 Reel by 15 Jun. Delivered.", { channels: ["instagram", "tiktok"], media: "both", territory: ["GB", "IE"], start: "2026-06-01", end: "2027-05-31", fee: GBP(1200), whitelisting: true });
  work("2026-07-25", "wh-coast", "video", "Ride to the coast, golden hour");
  deal("2026-07-28", "wh-03", "brand:quillon-cycles", "wh-coast", "1 YouTube video and 3 Shorts. 2 Shorts still to post.", { channels: ["youtube", "tiktok", "web"], media: "both", territory: ["WW"], start: "2026-08-01", end: "2026-11-05", fee: GBP(1500), ads: true });
  work("2026-08-26", "wh-tailgate", "photo", "Tea on the tailgate, set of four");
  deal("2026-08-28", "wh-04", "brand:mosswell-tea", "wh-tailgate", "4 photos and 1 Story. Delivered.", { channels: ["instagram", "pinterest", "web"], media: "organic", start: "2026-09-01", end: "2027-02-28", note: `${OWED}4 photos and 1 Story. Delivered. Gifted product, no fee.` });
  work("2026-10-08", "wh-bake", "video", "Autumn bake along");
  deal("2026-10-10", "wh-05", "brand:tallow-thyme", "wh-bake", "1 Reel, due 28 Oct.", { channels: ["instagram", "tiktok"], media: "paid", start: "2026-11-01", end: "2027-04-30", fee: GBP(900), whitelisting: true });
  ev("2026-10-12", ME, "usage.reported", { usage: { id: "seen-tent-ig", brand: "brand:brackenfold-outdoor", work: "wh-tent", channel: "instagram", use: "paid", from: "2026-10-01", until: null, where: "Spotted as a paid ad on Instagram, after the right ended" } });

  let r = createRecord("rosa-penhallow-deals", "Rosa Penhallow's deals (made up)");
  for (const e of E) {
    const res = append(r, e);
    if (!res.ok) throw new Error(`Demo event refused: ${res.reason}`);
    r = res.record;
  }
  return r;
}

/* ---------------------------------------------------------------- state and words */
const view = { record: null, state: null };
const nameOf = (p) => NAMES[p] ?? p.split(":")[1].split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const chWord = (c) => CH_WORDS[c] ?? c.replace(/^other:/, "");
const money = (fee) => (fee ? new Intl.NumberFormat("en-GB", { style: "currency", currency: fee.currency, maximumFractionDigits: fee.amount % 100 ? 2 : 0 }).format(fee.amount / 100) : "None");
const dateOf = (s) => (s.length === 10 ? day(s) : day(new Date(timeMs(s)).toISOString()));
const today = NOW.slice(0, 10);
const owedOf = (g) => (g.note?.startsWith(OWED) ? g.note.slice(OWED.length) : g.note ?? "Nothing written down");
const slug = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const useWords = (g) => {
  const m = { organic: "Organic", paid: "Paid", both: "Organic and paid" }[g.media];
  const extra = [g.whitelisting && "whitelisting", g.ads && "ads"].filter(Boolean);
  return `${m}${extra.length ? `, ${extra.join(" and ")}` : ""}`;
};
const where = (g) => (g.territory.includes("WW") ? "worldwide" : g.territory.join(", "));
const CH_RE = new RegExp(`\\b(${CHANNELS.join("|")})\\b`, "g");
const plain = (s) => s
  .replace(/\b(brand|agency|creator|team):[a-z0-9-]+/g, (p) => nameOf(p))
  .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?/g, (t) => dateOf(t))
  .replace(CH_RE, (c) => chWord(c))
  .replace(/Grant (wh-[a-z0-9-]+)/g, "Deal $1")
  .replace(/\bgrant (wh-[a-z0-9-]+)/g, "deal $1");

function refresh() {
  view.state = currentState(view.record.events);
  table();
  fillCheck();
  fillAdd();
  check();
}

/* ---------------------------------------------------------------- your deals */
function chip(st) {
  switch (st.kind) {
    case "live": return `<span class="st st-live">In force</span>`;
    case "expiring": return `<span class="st st-soon">Ends in ${st.days} day${st.days === 1 ? "" : "s"}</span>`;
    case "expired": return `<span class="st st-expired">Ended</span>`;
    case "revoked": return `<span class="st st-revoked">Revoked</span>`;
    case "upcoming": return `<span class="st st-upcoming">Starts in ${st.days} day${st.days === 1 ? "" : "s"}</span>`;
  }
}

function table() {
  const run = new Map(conflicts(view.state, NOW).map((c) => [c.check.grant ?? "", c]));
  const all = Object.values(view.state.grants)
    .map((g) => ({ g, st: grantStatus(g, NOW), w: view.state.works[g.work], run: run.get(g.id) }))
    .sort((a, b) => timeMs(a.g.end, "end") - timeMs(b.g.end, "end"));
  $("[data-cr-count]").textContent = all.length;
  $("[data-cr-body]").innerHTML = all.map(({ g, st, w, run }) => `<tr${st.kind === "expired" || st.kind === "revoked" ? ' class="is-off"' : ""}>
    <td class="c-who" data-label="Brand and work"><b>${esc(nameOf(g.brand))}</b><span class="sub-l">${esc(w?.title ?? g.work)}</span></td>
    <td data-label="You owe">${esc(owedOf(g))}</td>
    <td data-label="They may use">${esc(useWords(g))}<span class="sub-l">${esc(g.channels.map(chWord).join(", "))}, ${esc(where(g))}</span></td>
    <td data-label="Until" class="c-when">${esc(dateOf(g.end))}<span class="sub-l">from ${esc(dateOf(g.start))}</span></td>
    <td data-label="Fee" class="r fig">${esc(money(g.fee))}</td>
    <td data-label="Status" class="c-st">${chip(st)}${run ? `<span class="flag">Still in use</span><span class="sub-l">${esc(run.usage.where ?? "Seen in use")}.</span>` : ""}</td>
  </tr>`).join("");
  const k = (kind) => all.filter((r) => r.st.kind === kind).length;
  const soon = expiring(all.map((r) => r.g), NOW, 30).length;
  const running = all.filter((r) => r.run).length;
  $("[data-cr-tally]").innerHTML = `<b>${k("live") + k("expiring")}</b> in force, <b>${soon}</b> ending within 30 days, <b>${k("upcoming")}</b> not started, <b>${k("expired")}</b> ended.${running ? ` <span class="flag-say"><b>${running}</b> brand still using your work after its right ended.</span>` : ""}`;
}

/* ---------------------------------------------------------------- Is this brand still allowed? */
const checkForm = $("[data-cr-check]");
const workOptions = () => Object.values(view.state.works).map((w) => `<option value="${esc(w.id)}">${esc(w.title)}</option>`).join("");

function fillCheck() {
  const fm = checkForm.elements;
  const keep = { work: fm.work.value, brand: fm.brand.value, channel: fm.channel.value };
  $("[data-cr-c-work]").innerHTML = workOptions();
  const brands = [...new Set(Object.values(view.state.grants).map((g) => g.brand))];
  $("[data-cr-c-brand]").innerHTML = brands.map((b) => `<option value="${esc(b)}">${esc(nameOf(b))}</option>`).join("");
  $("[data-cr-c-channel]").innerHTML = CHANNELS.map((c) => `<option value="${c}">${esc(chWord(c))}</option>`).join("");
  const first = !keep.work;
  fm.work.value = keep.work && view.state.works[keep.work] ? keep.work : "wh-tent";
  fm.brand.value = brands.includes(keep.brand) ? keep.brand : "brand:brackenfold-outdoor";
  fm.channel.value = keep.channel || "instagram";
  if (first) fm.use.value = "paid";
  if (!fm.at.value) fm.at.value = today;
}

/* Choosing a work picks the brand it was licensed to, so the first answer is the useful one. */
checkForm.elements.work.addEventListener("change", () => {
  const g = Object.values(view.state.grants).find((x) => x.work === checkForm.elements.work.value);
  if (g) checkForm.elements.brand.value = g.brand;
});

function check() {
  const fm = checkForm.elements;
  const out = $("[data-cr-answer]");
  if (!fm.work.value || !fm.brand.value) { out.innerHTML = `<p class="small">Add a deal first.</p>`; return; }
  if (!fm.at.value) { out.innerHTML = `<p class="small">Choose a date.</p>`; return; }
  const q = { brand: fm.brand.value, work: fm.work.value, channel: fm.channel.value, at: fm.at.value, use: fm.use.value, ...(fm.territory.value ? { territory: fm.territory.value } : {}) };
  const a = canUse(view.state, q);
  const w = view.state.works[q.work];
  const next = a.allowed ? "" : a.code === "expired" || a.code === "revoked" ? " If they are still using it, ask them to take it down or to renew." : " If they want it, they can ask you for it.";
  out.innerHTML = `<div class="ans ${a.allowed ? "yes" : "no"}"><p class="ans-big">${a.allowed ? "Yes, they may" : "No, they may not"}</p><p class="ans-why">${esc(plain(a.reason))}.${esc(next)}</p><p class="small">${esc(nameOf(q.brand))}, ${esc(w?.title ?? q.work)}, ${esc(chWord(q.channel))}, ${esc(day(q.at))}. The same check a brand runs, on your own record.</p></div>`;
}
checkForm.addEventListener("input", check);
checkForm.addEventListener("change", check);
checkForm.addEventListener("submit", (e) => { e.preventDefault(); check(); });

/* ---------------------------------------------------------------- Add a deal */
const addForm = $("[data-cr-add]");
const NEW = "__new";

function fillAdd() {
  const fm = addForm.elements;
  const keep = fm.work.value;
  $("[data-cr-a-work]").innerHTML = `${workOptions()}<option value="${NEW}">A new work</option>`;
  fm.work.value = keep && (keep === NEW || view.state.works[keep]) ? keep : NEW;
  $("[data-cr-new]").hidden = fm.work.value !== NEW;
  const box = $("[data-cr-a-channels]");
  if (!box.childElementCount) box.innerHTML = CHANNELS.slice(0, 8).map((c) => `<label class="chip-check"><input type="checkbox" name="channels" value="${c}"${c === "instagram" ? " checked" : ""}>${esc(chWord(c))}</label>`).join("");
  if (!fm.start.value) fm.start.value = today;
  if (!fm.end.value) { const d = new Date(`${today}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 6); fm.end.value = d.toISOString().slice(0, 10); }
}
addForm.elements.work.addEventListener("change", () => { $("[data-cr-new]").hidden = addForm.elements.work.value !== NEW; });

function nextAt() {
  const last = view.record.events.at(-1);
  return new Date(Math.max(timeMs(NOW), last ? timeMs(last.at) + 1000 : 0)).toISOString().replace(/\.\d{3}Z$/, "Z");
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fm = addForm.elements;
  const err = $("[data-cr-add-err]");
  const ok = $("[data-cr-add-ok]");
  err.textContent = "";
  ok.textContent = "";
  for (const el of [fm.brand, fm.title, fm.fee, fm.territory]) el.removeAttribute("aria-invalid");
  const fail = (el, msg) => { el.setAttribute("aria-invalid", "true"); err.textContent = msg; el.focus(); };
  const brandName = fm.brand.value.trim();
  const brandId = slug(brandName);
  if (!brandId) return fail(fm.brand, "Name the brand.");
  const isNew = fm.work.value === NEW;
  const title = fm.title.value.trim();
  if (isNew && !title) return fail(fm.title, "Give the new work a title.");
  const channels = $$("input[name=channels]:checked", addForm).map((i) => i.value);
  const feeText = fm.fee.value.trim().replace(/[£,\s]/g, "");
  if (feeText && !/^\d+(\.\d{1,2})?$/.test(feeText)) return fail(fm.fee, "Write the fee in pounds, like 1200 or 1200.50, or leave it empty for none.");
  const territory = fm.territory.value.toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (!territory.length) return fail(fm.territory, "Name at least one country code, or WW for worldwide.");

  let record = view.record;
  let workId = fm.work.value;
  if (isNew) {
    workId = `wh-${slug(title).slice(0, 40) || "work"}-${Math.random().toString(36).slice(2, 5)}`;
    const res = append(record, { at: nextAt(), actor: ME, type: "work.registered", data: { work: { id: workId, creator: ME, kind: "video", title, created: today } } });
    if (!res.ok) { err.textContent = `Not added. ${plain(res.reason)}.`; return; }
    record = res.record;
  }
  const owed = fm.owed.value.trim();
  const grant = {
    id: `wh-${String(Object.keys(view.state.grants).length + 1).padStart(2, "0")}${Math.random().toString(36).slice(2, 5)}`,
    brand: `brand:${brandId}`, work: workId, channels, media: fm.media.value, territory,
    start: fm.start.value, end: fm.end.value, fee: feeText ? { amount: Math.round(Number(feeText) * 100), currency: "GBP" } : null,
    whitelisting: fm.whitelisting.checked, ads: fm.ads.checked, ...(owed ? { note: OWED + owed } : {}),
  };
  const last = record.events.at(-1);
  const res = append(record, { at: new Date(Math.max(timeMs(NOW), timeMs(last.at) + 1000)).toISOString().replace(/\.\d{3}Z$/, "Z"), actor: ME, type: "grant.issued", data: { grant } });
  if (!res.ok) { err.textContent = `Not added. ${plain(res.reason)}.`; return; }
  NAMES[grant.brand] ??= brandName;
  view.record = res.record;
  refresh();
  ok.textContent = `Added: ${brandName} may use it until ${dateOf(grant.end)}. Event ${res.event.seq}, hash ${res.event.hash.slice(0, 12)}. On this device only.`;
});

/* ---------------------------------------------------------------- your record */
$("[data-cr-verify]").addEventListener("click", () => {
  const v = verifyChain(view.record.events);
  const el = $("[data-cr-verdict]");
  el.className = `verdict ${v.ok ? "is-ok" : "is-bad"}`;
  el.innerHTML = v.ok
    ? `<b>Intact.</b> ${v.length} events, each hash matching. Head <span class="mono">${esc(v.head.slice(0, 16))}</span>.`
    : `<b>Broken at event ${v.seq}.</b> ${esc(v.reason)}.`;
});
$("[data-cr-reset]").addEventListener("click", () => {
  view.record = demo();
  refresh();
  const el = $("[data-cr-verdict]");
  el.className = "verdict";
  el.textContent = "The demo is back as it was written.";
});
$("[data-cr-json]").addEventListener("click", () => download("my_deals.rights.json", exportJson(view.record), "application/json"));
$("[data-cr-ics]").addEventListener("click", () => {
  const titleOf = (g) => `${nameOf(g.brand)} may no longer use ${view.state.works[g.work]?.title ?? g.work} after today`;
  const ics = expiryCalendar(Object.values(view.state.grants).filter((g) => timeMs(g.end, "end") > timeMs(NOW)), { now: NOW, name: "My usage rights, ending", titleOf });
  download("my_deals-expiry.ics", ics, "text/calendar");
});

/* ---------------------------------------------------------------- the two sides: a tab each */
const tabs = $$("[data-tab]");
function pick(which, focus) {
  for (const t of tabs) {
    const on = t.dataset.tab === which;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  }
  for (const v of $$("[data-view]")) v.hidden = v.dataset.view !== which;
}
for (const t of tabs) {
  t.addEventListener("click", () => {
    pick(t.dataset.tab);
    try { history.replaceState(null, "", `#${t.dataset.tab}`); } catch {}
  });
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = tabs.indexOf(t);
    const j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    pick(tabs[j].dataset.tab, true);
    try { history.replaceState(null, "", `#${tabs[j].dataset.tab}`); } catch {}
  });
}
const fromHash = () => (/^#(brand|grants)$/.test(location.hash) ? "brand" : "creator");
addEventListener("hashchange", () => pick(fromHash()));
pick(fromHash());
if (location.hash === "#grants") $("#grants")?.scrollIntoView();

view.record = demo();
refresh();
