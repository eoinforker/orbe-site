/*
  A small rights checker for "Who owns my video after a brand deal?". The
  creator types what their deal lets the brand do and what the brand wants
  to do; the page writes that into an Orbe Rights Record (the rights engine,
  site/assets/engine/rights, the same code the API runs) and asks it the
  brand's question with canUse. Nothing leaves the browser.
*/
import { $, $$, esc, day } from "../products/assets/shell.js";
import { createRecord, append, currentState, canUse, grantStatus } from "../assets/engine/rights/browser.js";

const CHANNELS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["facebook", "Facebook"], ["web", "Their website"], ["email", "Their emails"], ["tv", "TV"], ["ooh", "Billboards and screens"]];
const PLACES = [["GB", "the United Kingdom"], ["IE", "Ireland"], ["US", "the United States"], ["FR", "France"], ["DE", "Germany"], ["WW", "everywhere"]];
const USES = [["organic", "Post or repost it, unpaid"], ["paid", "Put paid media behind it"], ["whitelisting", "Run ads from your handle (whitelisting)"], ["ad", "Cut it into their own ads"]];
const name = (list, k) => list.find(([v]) => v === k)?.[1] ?? k;
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (days) => iso(new Date(Date.now() + days * 864e5));
const opts = (list, pick) => list.map(([v, t]) => `<option value="${v}"${v === pick ? " selected" : ""}>${esc(t)}</option>`).join("");
const listWords = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function mountRightsCheck(host) {
  host.innerHTML = `<div class="split lead rc">
    <article class="ob-win pr-in" data-pair="note" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">your_deal.txt</h3><span class="ob-win-ctl"><span class="ob-win-tag">On this device</span></span></div>
    <form class="ob-win-body stack" novalidate>
      <fieldset class="rc-set"><legend class="label">What your deal lets the brand do</legend>
        <div class="rc-boxes">${CHANNELS.map(([v, t]) => `<label class="rc-box"><input type="checkbox" name="ch" value="${v}"${v === "instagram" || v === "tiktok" ? " checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
        <div class="fields cols2">
          <label class="field"><span>Kind of use</span><select class="ob-input" name="media"><option value="organic" selected>Organic posts only</option><option value="paid">Paid use only</option><option value="both">Organic and paid</option></select></label>
          <label class="field"><span>Where</span><select class="ob-input" name="where">${opts(PLACES.map(([v, t]) => [v, t[0].toUpperCase() + t.slice(1)]), "GB")}</select></label>
        </div>
        <div class="rc-boxes rc-extra">
          <label class="rc-box"><input type="checkbox" name="wl"><span>Whitelisting allowed</span></label>
          <label class="rc-box"><input type="checkbox" name="ads"><span>Use in their own ads allowed</span></label>
        </div>
        <div class="fields cols2">
          <label class="field"><span>From</span><input class="ob-input" type="date" name="start" value="${plus(-30)}"></label>
          <label class="field"><span>Until (last day)</span><input class="ob-input" type="date" name="end" value="${plus(45)}"></label>
        </div>
      </fieldset>
      <fieldset class="rc-set"><legend class="label">What the brand wants to do</legend>
        <div class="fields cols2">
          <label class="field"><span>Use</span><select class="ob-input" name="use">${opts(USES, "paid")}</select></label>
          <label class="field"><span>On</span><select class="ob-input" name="qch">${opts(CHANNELS, "instagram")}</select></label>
          <label class="field"><span>In</span><select class="ob-input" name="qwhere">${opts(PLACES.map(([v, t]) => [v, t[0].toUpperCase() + t.slice(1)]), "GB")}</select></label>
          <label class="field"><span>On the date</span><input class="ob-input" type="date" name="at" value="${plus(0)}"></label>
        </div>
      </fieldset>
      <div class="btns"><button class="ob-btn" type="submit"><span class="ob-orb" aria-hidden="true"></span>Can they?</button></div>
      <p class="err" role="alert" data-err></p>
    </form></article>
    <article class="ob-win pr-out" data-pair="rec" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">can_they_use_it.txt</h3><span class="ob-win-ctl"><span class="ob-win-tag">Rights engine</span></span></div>
    <div class="ob-win-body stack" data-out aria-live="polite"></div></article>
  </div>`;
  const form = $("form", host);
  const out = $("[data-out]", host);
  const f = form.elements;

  /* An organic-only licence cannot allow whitelisting or ads: the record refuses it, so the page does too. */
  const media = () => { const off = f.media.value === "organic"; for (const k of ["wl", "ads"]) { f[k].disabled = off; if (off) f[k].checked = false; } };
  f.media.addEventListener("change", media);
  media();

  const run = (sample) => {
    const err = $("[data-err]", form);
    err.textContent = "";
    const channels = $$("input[name=ch]:checked", form).map((x) => x.value);
    if (!channels.length) return void (err.textContent = "Tick at least one place your deal covers.");
    if (!f.start.value || !f.end.value || f.end.value < f.start.value) return void (err.textContent = "Add the dates, with the last day on or after the first.");
    if (!f.at.value) return void (err.textContent = "Add the date the brand wants to use it.");
    const now = new Date().toISOString();
    let r = createRecord("your-deal-record", "Your deal");
    for (const e of [
      { at: now, actor: "creator:you", type: "work.registered", data: { work: { id: "your-video", creator: "creator:you", kind: "video", title: "Your video", created: f.start.value } } },
      { at: now, actor: "creator:you", type: "grant.issued", data: { grant: { id: "your-deal", brand: "brand:the-brand", work: "your-video", channels, media: f.media.value, territory: [f.where.value], start: f.start.value, end: f.end.value, fee: null, whitelisting: f.wl.checked, ads: f.ads.checked } } },
    ]) {
      const res = append(r, e);
      if (!res.ok) return void (err.textContent = res.reason);
      r = res.record;
    }
    const state = currentState(r.events);
    const g = state.grants["your-deal"];
    const q = { brand: "brand:the-brand", work: "your-video", channel: f.qch.value, use: f.use.value, territory: f.qwhere.value, at: f.at.value };
    const a = canUse(state, q);
    const st = grantStatus(g, `${f.at.value}T12:00:00Z`);
    const covers = listWords(channels.map((c) => name(CHANNELS, c)));
    let why;
    if (a.allowed) why = `Yes. Your deal covers this until ${day(g.end)}${st.kind === "expiring" ? `, which is ${st.days} ${st.days === 1 ? "day" : "days"} away. If they want more time, that is a renewal, and you can charge for it` : ""}.`;
    else if (a.code === "channel") why = `Not on ${name(CHANNELS, q.channel)}. Your deal covers ${covers} only.`;
    else if (a.code === "use") why = g.media === "organic" ? "Not this. Your deal is for organic posts only: no paid media, no whitelisting and no ads. Any of those is a new licence, with a new fee." : g.media === "paid" && q.use === "organic" ? "Not as an organic post. Your deal covers paid use only." : q.use === "whitelisting" ? "Not from your handle. Your deal does not allow whitelisting." : "Not in their own ads. Your deal does not allow that.";
    else if (a.code === "territory") why = `Not in ${name(PLACES, q.territory)}. Your deal covers ${name(PLACES, g.territory[0])} only.`;
    else if (a.code === "not-started") why = `Not yet. Your deal starts ${day(g.start)}.`;
    else if (a.code === "expired") why = `Not any more. Your deal ended ${day(g.end)}. Using it now needs a renewal, and you can charge for it.`;
    else why = a.reason;
    const owners = state.works["your-video"].owners;
    out.innerHTML = `<div class="panel stack">
        ${sample ? `<div class="sample"><span><b>An example deal:</b> organic posts on Instagram and TikTok in the UK, and the brand wants to put paid media behind it. Shown until you check your own.</span></div>` : ""}
        <div class="verdict-row"><p class="small">Can the brand do this?</p><p class="verdict"><span class="tag ${a.allowed ? "good" : "bad"} tag-l">${a.allowed ? "Yes" : "No"}</span></p></div>
        <p>${esc(why)}</p>
      </div>
      <div class="panel stack">
        <p class="label">Who owns the video</p>
        <p class="small">${owners.length === 1 && owners[0].party === "creator:you" ? "You, all of it. In this record the deal is a licence: permission to use, not a sale. That stays true unless you sign a contract that assigns your copyright." : "Shared, as your record says."}</p>
        <p class="small">Checked by the Orbe Rights Record, the same code the API will run. Record fingerprint <code class="mono">${esc(r.events.at(-1).hash.slice(0, 12))}</code>, a SHA-256 hash of the events: change one term and it changes.</p>
      </div>`;
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); run(false); });
  run(true);
}
