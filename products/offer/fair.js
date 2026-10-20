/*
  The fair offer check's working, shared by the Fair offer check page
  (offer.js), its equity mode (equity.js) and the answer pages
  (site/answers/). The fair range is the sponsor engine's own price
  suggestion (site/assets/engine/sponsor), with the same rate cards and the
  same example 0.75 pounds per dollar as Sponsorships. The verdict, counter
  and reply are this file's reading of that range.

  mountFairWidget(host) draws a small, self-contained check: the form, the
  verdict, the range line and the reply, with a made-up example on show
  until the person checks their own. Nothing leaves the browser.
*/
import { $, esc, count, money, copyText, copyLabel } from "../assets/shell.js";
import { inventoryFromStats, specsForKind } from "../../assets/engine/sponsor/browser.js";

export const FX = 0.75; // pounds per dollar: the example rate Sponsorships uses, stated on the page
export const AUD = { youtube: "Subscribers", substack: "Subscribers", podcast: "Followers", twitch: "Followers" };
export const NOUN = { youtube: "upload", substack: "issue", podcast: "episode", twitch: "stream" };
export const KINDS = [["youtube", "YouTube channel"], ["substack", "Newsletter"], ["podcast", "Podcast"], ["twitch", "Twitch streams"]];

export const parseUnits = (text) => String(text ?? "").split(/[\s,;]+/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
export const a = (w) => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;
export const up10 = (pence) => Math.ceil(pence / 1000) * 1000;
export const gbp = (amount) => ({ amount, currency: "GBP" });
const fx = (m, to) => (m.currency === to ? m : m.currency === "USD" && to === "GBP" ? { amount: Math.round(m.amount * FX), currency: "GBP" } : null);

/* The labels that change with the kind of work. */
export function kindWords(kind) {
  const spec = specsForKind(kind)[0];
  const what = spec.quantity === "hour" ? "Average viewers per stream" : `${spec.unit[0].toUpperCase()}${spec.unit.slice(1)} at ${spec.priceWindow} days`;
  return {
    units: `${what}, recent ${NOUN[kind]}s`,
    audience: AUD[kind],
    offer: spec.quantity === "hour" ? "Their offer per hour, in pounds" : "Their offer, in pounds",
    placements: specsForKind(kind).map((s) => [s.format, s.name]),
  };
}

/* The fair range for one placement, from the sponsor engine. */
export function fairRange({ kind, audience, units, placement }) {
  const { inventory } = inventoryFromStats({ kind, audience, units, price: null, currency: "GBP", fx, rating: null, at: new Date().toISOString() });
  const item = inventory.items.find((i) => i.format === placement) ?? inventory.items[0];
  return { item, s: item?.suggestion };
}

/* low, fair or strong, and what to say back */
export function judge(offer, s, placementName, kind) {
  const low = s.low.amount, high = s.high.amount, mid = (low + high) / 2;
  const deliver = `about ${count(s.expected.units)} ${s.expected.unit} at ${s.expected.day} ${s.expected.day === 1 ? "day" : "days"}`;
  const per = s.per === "hour" ? " an hour" : "";
  if (offer < low) {
    const counter = up10(mid);
    return {
      verdict: "low", word: "Low", tag: "bad", counter,
      reason: `${money(gbp(offer))} is ${Math.round((1 - offer / low) * 100)}% under the bottom of your fair range for ${deliver}. Ask for the middle of it.`,
      reply: `Thanks for the offer. My recent ${NOUN[kind]}s deliver ${deliver}, so my rate for ${a(placementName.toLowerCase())} is ${money(gbp(counter))}${per}. Happy to talk through the details and dates.`,
    };
  }
  if (offer > high) {
    return {
      verdict: "strong", word: "Strong", tag: "good", counter: null,
      reason: `Above your fair range for ${deliver}. Take it, and get the deliverables and the payment date in writing.`,
      reply: `Thanks, ${money(gbp(offer))}${per} works for me. Could you confirm the deliverables, any usage rights and the payment date in writing?`,
    };
  }
  if (offer < mid) {
    const counter = up10(mid);
    return {
      verdict: "fair", word: "Fair", tag: "warn", counter,
      reason: `Inside your range for ${deliver}, but in its lower half. The middle is a fair ask.`,
      reply: `Thanks for the offer. For ${deliver}, I'd be glad to do ${a(placementName.toLowerCase())} at ${money(gbp(counter))}${per}. Could you confirm the deliverables and payment date?`,
    };
  }
  return {
    verdict: "fair", word: "Fair", tag: "good", counter: null,
    reason: `In the upper half of your fair range for ${deliver}. Take it, or hold the price and ask for a second placement.`,
    reply: `Thanks, ${money(gbp(offer))}${per} works for me. Could you confirm the deliverables, any usage rights and the payment date in writing?`,
  };
}

/* The range as a line, with the offer marked on it. */
export function scale(low, high, offer, word = "Offer") {
  const max = Math.max(high * 1.4, offer * 1.1);
  const at = (x) => `${Math.min(100, (x / max) * 100).toFixed(2)}%`;
  return `<div class="scale" role="img" aria-label="Fair range ${esc(money(gbp(low)))} to ${esc(money(gbp(high)))}; the ${esc(word.toLowerCase())} is ${esc(money(gbp(offer)))}">
    <span class="scale-band" style="left:${at(low)};width:calc(${at(high)} - ${at(low)})"></span>
    <span class="scale-mark" style="left:${at(offer)}"><span>${esc(word)}</span></span>
  </div><div class="scale-ends"><span>£0</span><span>${esc(money(gbp(Math.round(max / 100) * 100)))}</span></div>`;
}

/* The size fields every check needs: kind, audience, recent numbers and placement. Returns a reader and a filler. */
export function sizeFields(form, { compact = false } = {}) {
  const host = $("[data-size]", form);
  host.innerHTML = `<div class="fields cols2">
      <label class="field"><span>Kind of work</span><select class="ob-input" name="kind">${KINDS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select></label>
      <label class="field"><span data-aud-label>Subscribers</span><input class="ob-input" type="number" min="0" inputmode="numeric" name="audience" placeholder="e.g. 85000"></label>
    </div>
    <label class="field"><span data-units-label>Views at 30 days, recent uploads</span><textarea class="ob-input" name="units" rows="2" placeholder="21000, 18000, 25000, 19500, 30000"${compact ? ' style="min-height:72px"' : ""}></textarea><small>One number per work, newest first. At least three.</small></label>
    <label class="field"><span>Placement</span><select class="ob-input" name="placement" data-placement></select></label>`;
  const f = form.elements;
  const kindChanged = () => {
    const w = kindWords(f.kind.value);
    $("[data-units-label]", form).textContent = w.units;
    $("[data-aud-label]", form).textContent = w.audience;
    $("[data-placement]", form).innerHTML = w.placements.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("");
    form.dispatchEvent(new CustomEvent("kindchange", { detail: w }));
  };
  f.kind.addEventListener("change", kindChanged);
  kindChanged();
  return {
    read() {
      const audience = Number(f.audience.value);
      const units = parseUnits(f.units.value);
      if (!(audience > 0)) return { error: "Add your audience size." };
      if (units.length < 3) return { error: "Add at least three works' numbers." };
      return { kind: f.kind.value, audience, units, placement: f.placement.value };
    },
    fill(x) {
      f.kind.value = x.kind;
      kindChanged();
      f.audience.value = x.audience;
      f.units.value = Array.isArray(x.units) ? x.units.join(", ") : x.units;
      f.placement.value = x.placement;
    },
  };
}

export const EXAMPLE = { kind: "youtube", audience: 85000, units: "21000, 18000, 25000, 19500, 30000, 17000, 22500", placement: "integration", offer: 400 };

/* A small fair offer check for pages other than the tool's own: form on one side, the answer on the other. */
export function mountFairWidget(host, { title = "the_offer.txt", out = "is_it_fair.txt", more = null } = {}) {
  host.innerHTML = `<div class="split lead fw">
    <article class="ob-win pr-in" data-pair="note" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">${esc(title)}</h3><span class="ob-win-ctl"><span class="ob-win-tag">On this device</span></span></div>
    <form class="ob-win-body stack" novalidate>
      <div class="stack" data-size></div>
      <label class="field"><span data-offer-label>Their offer, in pounds</span><input class="ob-input" type="number" min="0" step="1" inputmode="decimal" name="offer" placeholder="e.g. 600"></label>
      <div class="btns"><button class="ob-btn" type="submit"><span class="ob-orb" aria-hidden="true"></span>Check it</button><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-example>Made-up example</button></div>
      <p class="err" role="alert" data-err></p>
      <p class="small">The rate cards are in dollars, converted at <b>0.75 pounds per dollar</b>: an example rate, not a live one.</p>
    </form></article>
    <article class="ob-win pr-out" data-pair="spon" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">${esc(out)}</h3><span class="ob-win-ctl"><span class="ob-win-tag">Sponsor engine</span></span></div>
    <div class="ob-win-body stack" data-out aria-live="polite"></div></article>
  </div>`;
  const form = $("form", host);
  const outEl = $("[data-out]", host);
  form.addEventListener("kindchange", (e) => { $("[data-offer-label]", form).textContent = e.detail.offer; });
  const size = sizeFields(form, { compact: true });

  const show = (input, sample) => {
    const { item, s } = fairRange(input);
    if (!s || s.status !== "suggested") { outEl.innerHTML = `<p class="note warn">${esc(s?.reason ?? "No fair range for this placement yet.")}</p>`; return; }
    const offer = Math.round(input.offer * 100);
    const j = judge(offer, s, item.name, input.kind);
    outEl.innerHTML = `<div class="panel stack">
        ${sample ? `<div class="sample"><span><b>A made-up YouTube channel:</b> ${count(input.audience)} subscribers, offered ${esc(money(gbp(offer)))}. Shown until you check your own.</span></div>` : ""}
        <div class="verdict-row"><p class="small">This offer is</p><p class="verdict v-${j.verdict}"><span class="tag ${j.tag} tag-l">${j.word}</span></p></div>
        <p class="small">Fair range, ${esc(item.name.toLowerCase())}${s.per === "hour" ? ", an hour" : ""}</p>
        <p class="big num big-m">${esc(money(s.low))} to ${esc(money(s.high))}</p>
        ${scale(s.low.amount, s.high.amount, offer)}
      </div>
      <div class="panel stack">
        <p class="label">${j.counter ? `Counter at ${esc(money(gbp(j.counter)))}` : "No counter needed"}</p>
        <p class="small">${esc(j.reason)}</p>
        <div class="copy"><code>${esc(j.reply)}</code><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-copy>${copyLabel("Copy reply")}</button></div>
        ${more ? `<p class="small">${more}</p>` : ""}
      </div>`;
    $("[data-copy]", outEl).addEventListener("click", (e) => copyText(e.currentTarget, j.reply));
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("[data-err]", form);
    err.textContent = "";
    const x = size.read();
    if (x.error) return void (err.textContent = x.error);
    const offer = Number(form.elements.offer.value);
    if (!(offer > 0)) return void (err.textContent = "Add the brand's offer in pounds.");
    show({ ...x, offer }, false);
  });
  $("[data-example]", form).addEventListener("click", () => { size.fill(EXAMPLE); form.elements.offer.value = EXAMPLE.offer; form.requestSubmit(); });
  size.fill({ ...EXAMPLE, units: "" });
  form.elements.audience.value = "";
  show({ ...EXAMPLE, units: parseUnits(EXAMPLE.units) }, true);
}
