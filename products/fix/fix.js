/*
  Orbe Fix in the browser. The diagnosis, the rule-based titles, the checks
  and the lift judgement are Orbe Fix's own code, compiled from
  product/src/fix to site/assets/engine/fix. Models and the swap on YouTube
  need the API, so this page offers only plain edits of your own title.
  Nothing leaves the browser.
*/
import { shell, $, esc, count, money } from "../assets/shell.js";
import { diagnose, rulesTitles, checkOption, sealBaseline, judgeLift, BASELINE_RULE, FIX_VERSION, LIFT_MIN } from "../../assets/engine/fix/browser.js";

shell("fix");

const DAY = 864e5;
const NOW = Date.parse("2026-10-18T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const EXAMPLE = { title: "I rebuilt my studio for £500 | Studio Diaries", audience: 50000, views: 900, age: 2.8, minutes: 15, ctr: 2.1, typical: 4.8 };
const LIFT_EXAMPLE = { at: 2.8, v0: 900, now: 7.8, v1: 2400 };

/* ================================================================ the check */
const form = $("[data-form]");
const out = $("[data-out]");

function scale(p25, p75, views) {
  const max = Math.max(p75 * 1.4, views * 1.1, 1);
  const at = (x) => `${Math.min(100, (x / max) * 100).toFixed(2)}%`;
  return `<div class="scale" role="img" aria-label="Middle range for creators your size ${count(p25)} to ${count(p75)} views; this upload has ${count(views)}">
    <span class="scale-band" style="left:${at(p25)};width:calc(${at(p75)} - ${at(p25)})"></span>
    <span class="scale-mark" style="left:${at(views)}"><span>This upload</span></span>
  </div><div class="scale-ends"><span>0</span><span>${count(Math.round(max))} views</span></div>`;
}

const ISSUE = { empty: "empty", too_long: "over 100 characters", same_as_current: "the same as now", new_number: "adds a number the video does not", off_topic: "drifts off the subject", shouting: "shouts in capitals", not_https: "not a secure image" };

function check(v, sample = false) {
  const work = { id: "typed", kind: "youtube", title: v.title, publishedAt: iso(NOW - v.age * DAY), durationSec: Math.round(v.minutes * 60), metrics: { views: v.views } };
  const ctr = v.ctr > 0 && v.typical > 0 ? { work: v.ctr / 100, typical: v.typical / 100 } : undefined;
  const d = diagnose({ work, audience: v.audience, now: NOW, ctr });
  const head = sample ? `<div class="sample"><span><b>A made-up upload:</b> ${count(v.audience)} subscribers, ${count(v.views)} views at ${v.age} days. Shown until you check your own.</span></div>` : "";
  if (!d.expected) return void (out.innerHTML = `${head}<p class="note warn">${esc(d.why)}</p>`);
  const behind = d.status === "underperforming";
  const word = behind ? ["Behind", "bad"] : ["On track", "good"];
  const target = { both: "The title and the thumbnail", title: "The title", thumbnail: "The thumbnail" }[d.target] ?? "";
  let options = "";
  if (behind) {
    const titles = v.title ? rulesTitles(v.title) : [];
    const rows = titles.map((t, i) => {
      const c = checkOption({ id: `t${i}`, kind: "title", title: t, source: { provider: "rules", model: null } }, { title: v.title });
      return `<li><span class="opt">${esc(t)}</span> <span class="tag ${c.ok ? "good" : "warn"}">${c.ok ? "Passes the checks" : `Held back: ${esc(c.issues.map((k) => ISSUE[k]).join(", "))}`}</span></li>`;
    }).join("");
    options = `<div class="panel stack">
      <p class="label">What to change: ${esc(target.toLowerCase())}</p>
      ${rows ? `<p class="small">Plain edits of your own title, checked against it:</p><ul class="opts">${rows}</ul>` : `<p class="small">${v.title ? "Your title is already short and clear, so there is no plain edit to offer." : "Add the title to see plain edits of it."}</p>`}
      <p class="small">With the API, a router of models writes more titles and new thumbnails in your style, each checked the same way, and nothing goes up until you approve it.</p>
    </div>`;
  }
  out.innerHTML = `${head}<div class="panel stack">
      <div class="verdict-row"><p class="small">This upload is</p><p class="verdict"><span class="tag ${word[1]} tag-l">${word[0]}</span></p></div>
      <p class="small">Creators your size at ${d.ageDays.toFixed(1)} days, middle half</p>
      <p class="big num big-m">${count(d.expected.p25)} to ${count(d.expected.p75)}</p>
      ${scale(d.expected.p25, d.expected.p75, v.views)}
      <p class="small">${esc(d.why)}</p>
    </div>${options}`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-err]");
  err.textContent = "";
  const f = form.elements;
  const v = { title: f.title.value.trim(), audience: Number(f.audience.value), views: Number(f.views.value), age: Number(f.age.value), minutes: Number(f.minutes.value) || 0, ctr: Number(f.ctr.value) || 0, typical: Number(f.typical.value) || 0 };
  if (!(v.audience > 0)) return void (err.textContent = "Add your subscribers.");
  if (!(f.views.value !== "" && v.views >= 0)) return void (err.textContent = "Add the views so far.");
  if (!(v.age > 0)) return void (err.textContent = "Add how many days since it went out.");
  check(v);
});

$("[data-example]").addEventListener("click", () => {
  const f = form.elements;
  for (const [k, val] of Object.entries(EXAMPLE)) f[k].value = val;
  form.requestSubmit();
});

/* ================================================================ the lift */
const lift = $("[data-lift]");
const liftOut = $("[data-lift-out]");

function judge(v) {
  const publishedAt = iso(NOW - v.now * DAY);
  const madeAt = iso(NOW - (v.now - v.at) * DAY);
  const baseline = sealBaseline({ fixId: "typed", workId: "typed", madeAt, publishedAt, viewsAtChange: v.v0, rule: BASELINE_RULE, version: FIX_VERSION });
  const r = judgeLift(baseline, iso(NOW), v.v1);
  const word = { lifted: ["Kept", "good"], no_lift: ["Goes back", "warn"], too_soon: ["Too soon", "warn"], tampered: ["Cannot judge", "bad"] }[r.status];
  const nums = r.expectedGain === null ? "" : `<p class="small">Views since the change</p><p class="big num big-m">${count(r.actualGain)}</p><p class="small">against ${count(r.expectedGain)} expected without it. Kept at ${Math.round(LIFT_MIN * 100)}% more or better.</p>`;
  liftOut.innerHTML = `<div class="panel stack">
      <div class="verdict-row"><p class="small">The change</p><p class="verdict"><span class="tag ${word[1]} tag-l">${word[0]}</span></p></div>
      ${nums}
      <p class="small">${esc(r.text)}${r.fee ? ` Fee ${esc(money(r.fee))}, provisional.` : ""}</p>
      <p class="small seal">Sealed baseline <code>${esc(baseline.seal.slice(0, 16))}</code></p>
    </div>`;
}

lift.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("[data-lift-err]");
  err.textContent = "";
  const f = lift.elements;
  const v = { at: Number(f.at.value), v0: Number(f.v0.value), now: Number(f.now.value), v1: Number(f.v1.value) };
  if (!(v.at > 0) || !(v.now > v.at)) return void (err.textContent = "Days old now must be after the change.");
  if (!(v.v1 >= v.v0)) return void (err.textContent = "Views now cannot be below the views at the change.");
  judge(v);
});

$("[data-lift-example]").addEventListener("click", () => {
  const f = lift.elements;
  for (const [k, val] of Object.entries(LIFT_EXAMPLE)) f[k].value = val;
  lift.requestSubmit();
});
