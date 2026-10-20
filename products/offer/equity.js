/*
  Equity mode for the fair offer check: "Paid partly in equity?"

  The cash part is judged against the fair range for the creator's size, by
  the same sponsor engine and the same reading as the check itself
  (fair.js). The equity part is arithmetic, not a valuation: what the grant
  would be worth under three made-up outcomes (the company fails, a modest
  exit, a strong exit), after a stated dilution assumption, set against the
  gap between the cash and the fair range. Every assumption is on the page
  and can be changed. No market statistics are used or implied.

  mountEquity(host, { size }) draws it. size() returns the creator's size
  ({ kind, audience, units, placement }) from elsewhere on the page, or
  null to draw the size fields inside the widget. Nothing leaves the browser.
*/
import { $, $$, esc, count, money, icon } from "../assets/shell.js";
import { fairRange, judge, scale, gbp, sizeFields, EXAMPLE, parseUnits } from "./fair.js";

export const DISCLAIMER = "Illustrative only. Not financial, legal or tax advice. Most startup equity is worth nothing. Speak to an adviser before you sign.";

/* Made-up starting points by stage, for illustration. They are not market figures: change any of them. */
export const STAGES = {
  "pre-seed": { name: "Pre-seed", rounds: 3, modest: 3, strong: 15 },
  seed: { name: "Seed", rounds: 2, modest: 2.5, strong: 10 },
  "series-a": { name: "Series A", rounds: 1, modest: 2, strong: 5 },
};
export const DILUTION = 20; // per cent of the company issued as new shares in each later round: an assumption, editable

/* The example the widget opens on. Made up. */
export const EQ_EXAMPLE = { cash: 250, mode: "pct", pct: 0.02, valuation: 6000000, shares: 1200, price: 1, vest: 24, cliff: 6, stage: "seed" };

/*
  The arithmetic. Money in pence. Returns the paper value today, the share of
  it kept after dilution, each outcome's value fully vested and at the cliff,
  and the gap the equity has to cover.
*/
export function equityCheck({ cash, fair, mode, pct, valuation, shares, price, vest, cliff, rounds, dilution, modest, strong }) {
  const paper = mode === "shares" ? shares * price : (pct / 100) * valuation; // pence
  const kept = Math.pow(1 - dilution / 100, rounds);
  const atCliff = vest > 0 ? Math.min(1, cliff / vest) : 1;
  const outcome = (key, multiple) => {
    const full = Math.round(paper * multiple * kept);
    return { key, multiple, full, cliff: Math.round(full * atCliff) };
  };
  const mid = Math.round((fair.low + fair.high) / 2);
  return {
    paper: Math.round(paper),
    kept,
    stakeAfter: mode === "pct" ? pct * kept : null,
    atCliff,
    gapLow: Math.max(0, fair.low - cash),
    gapMid: Math.max(0, mid - cash),
    mid,
    outcomes: [outcome("fails", 0), outcome("modest", modest), outcome("strong", strong)],
  };
}

const num = (v) => (Number.isFinite(v) ? v : NaN);
const pctText = (x) => `${x.toLocaleString("en-GB", { maximumSignificantDigits: 3 })}%`;
const times = (x) => `${x.toLocaleString("en-GB", { maximumFractionDigits: 2 })}×`;
const months = (n) => `${n} ${n === 1 ? "month" : "months"}`;

export function mountEquity(host, { size = null, idPrefix = "eq" } = {}) {
  const own = !size;
  host.innerHTML = `<div class="split lead eq">
    <article class="ob-win pr-in" data-pair="note" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">cash_and_equity.txt</h3><span class="ob-win-ctl"><span class="ob-win-tag">On this device</span></span></div>
    <form class="ob-win-body stack" novalidate>
      ${own ? `<div class="stack" data-size></div>` : `<p class="small" data-size-say></p>`}
      <label class="field"><span>The cash part, in pounds</span><input class="ob-input" type="number" min="0" step="1" inputmode="decimal" name="cash"></label>
      <label class="field"><span>How the equity is offered</span><select class="ob-input" name="mode"><option value="pct">A percentage of the company</option><option value="shares">A number of shares at a price</option></select></label>
      <div class="fields cols2" data-mode="pct">
        <label class="field"><span>Percentage offered</span><input class="ob-input" type="number" min="0" max="100" step="any" inputmode="decimal" name="pct"></label>
        <label class="field"><span>Company valuation today, in pounds</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" name="valuation"></label>
      </div>
      <div class="fields cols2 hide" data-mode="shares">
        <label class="field"><span>Number of shares</span><input class="ob-input" type="number" min="0" step="1" inputmode="numeric" name="shares"></label>
        <label class="field"><span>Price per share, in pounds</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" name="price"></label>
      </div>
      <div class="fields cols2">
        <label class="field"><span>Vesting period, months</span><input class="ob-input" type="number" min="0" step="1" inputmode="numeric" name="vest"></label>
        <label class="field"><span>Cliff, months</span><input class="ob-input" type="number" min="0" step="1" inputmode="numeric" name="cliff"></label>
      </div>
      <label class="field"><span>Company stage</span><select class="ob-input" name="stage">${Object.entries(STAGES).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join("")}</select></label>
      <details class="fold eq-assume" data-assume><summary>The assumptions, all editable</summary>
        <div class="fold-body stack">
          <p class="small">Made up for illustration, not market data. Picking a stage resets them to that stage's starting points.</p>
          <div class="fields cols2">
            <label class="field"><span>Funding rounds before any sale</span><input class="ob-input" type="number" min="0" max="10" step="1" inputmode="numeric" name="rounds"></label>
            <label class="field"><span>New shares in each round, % of the company</span><input class="ob-input" type="number" min="0" max="90" step="any" inputmode="decimal" name="dilution"></label>
            <label class="field"><span>Modest exit, × today's valuation</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" name="modest"></label>
            <label class="field"><span>Strong exit, × today's valuation</span><input class="ob-input" type="number" min="0" step="any" inputmode="decimal" name="strong"></label>
          </div>
        </div>
      </details>
      <div class="btns"><button class="ob-btn" type="submit"><span class="ob-orb" aria-hidden="true"></span>Check the mix</button><button class="ob-btn ob-btn--light ob-btn--s" type="button" data-example>Made-up example</button></div>
      <p class="err" role="alert" data-err></p>
    </form></article>
    <article class="ob-win pr-out" data-pair="spon" data-head="light"><div class="ob-win-bar"><h3 class="ob-win-title">what_the_equity_must_do.txt</h3><span class="ob-win-ctl"><span class="ob-win-tag">Illustrative</span></span></div>
    <div class="ob-win-body stack" data-eq-out aria-live="polite"></div></article>
  </div>`;

  const form = $("form", host);
  const out = $("[data-eq-out]", host);
  const f = form.elements;
  const sizer = own ? sizeFields(form, { compact: true }) : null;
  const sum = $("[data-assume] > summary", host);
  sum.insertAdjacentHTML("afterbegin", icon("caret", { size: 16, className: "caret" }));

  const setMode = () => { for (const el of $$("[data-mode]", form)) el.classList.toggle("hide", el.dataset.mode !== f.mode.value); };
  const setStage = () => { const s = STAGES[f.stage.value]; f.rounds.value = s.rounds; f.dilution.value = DILUTION; f.modest.value = s.modest; f.strong.value = s.strong; };
  f.mode.addEventListener("change", setMode);
  f.stage.addEventListener("change", setStage);

  const fill = (x) => {
    f.cash.value = x.cash; f.mode.value = x.mode; f.pct.value = x.pct; f.valuation.value = x.valuation;
    f.shares.value = x.shares; f.price.value = x.price; f.vest.value = x.vest; f.cliff.value = x.cliff; f.stage.value = x.stage;
    setMode(); setStage();
  };

  /* The creator's size: from the widget's own fields, from the page, or the made-up channel. */
  const sizeNow = () => {
    if (own) return sizer.read();
    const s = size();
    return s && !s.error ? { ...s, from: "page" } : { kind: EXAMPLE.kind, audience: EXAMPLE.audience, units: parseUnits(EXAMPLE.units), placement: EXAMPLE.placement, from: "example" };
  };

  const read = () => {
    const z = sizeNow();
    if (z.error) return { error: z.error };
    const v = (k) => num(Number(f[k].value));
    const x = {
      cash: v("cash"), mode: f.mode.value, pct: v("pct"), valuation: v("valuation"), shares: v("shares"), price: v("price"),
      vest: v("vest"), cliff: v("cliff"), stage: f.stage.value, rounds: v("rounds"), dilution: v("dilution"), modest: v("modest"), strong: v("strong"),
    };
    if (!(x.cash >= 0) || f.cash.value === "") return { error: "Add the cash part in pounds (0 if there is none)." };
    if (x.mode === "pct" && !(x.pct > 0 && x.pct <= 100)) return { error: "Add the percentage offered, above 0 and up to 100." };
    if (x.mode === "pct" && !(x.valuation > 0)) return { error: "Add the company's valuation today. Ask them for it if you do not know." };
    if (x.mode === "shares" && !(x.shares > 0 && x.price > 0)) return { error: "Add the number of shares and the price per share." };
    if (!(x.vest >= 0) || !(x.cliff >= 0) || x.cliff > x.vest) return { error: "Add the vesting period and the cliff, in months. The cliff cannot be longer than the period." };
    if (!(x.rounds >= 0) || !(x.dilution >= 0 && x.dilution < 100) || !(x.modest >= 0) || !(x.strong >= 0)) return { error: "Check the assumptions: rounds 0 or more, new shares under 100%, exits 0 or more." };
    return { z, x };
  };

  const draw = (z, x, sample) => {
    const { item, s } = fairRange(z);
    if (!s || s.status !== "suggested") { out.innerHTML = `<p class="note warn">${esc(s?.reason ?? "No fair range for this placement yet.")}</p>`; return; }
    const cash = Math.round(x.cash * 100);
    const j = judge(cash, s, item.name, z.kind);
    const r = equityCheck({ ...x, cash, fair: { low: s.low.amount, high: s.high.amount }, valuation: x.valuation * 100, price: x.price * 100 });
    const st = STAGES[x.stage];
    const words = { fails: ["The company fails", "Worth nothing. Made up, but the usual ending."], modest: ["A modest exit", `Made up: the company sells for ${times(x.modest)} today's valuation.`], strong: ["A strong exit", `Made up: the company sells for ${times(x.strong)} today's valuation.`] };
    const covers = (v) => (r.gapLow === 0 ? "" : v === 0 ? `<span class="tag bad">You are ${esc(money(gbp(r.gapLow)))} short of a fair price</span>` : v >= r.gapMid ? `<span class="tag">Would cover the gap to the middle</span>` : v >= r.gapLow ? `<span class="tag">Would cover the gap to the bottom</span>` : `<span class="tag">Would not cover the gap</span>`);
    const sizeSay = z.from === "example" ? `<p class="small">Judged for the made-up channel (${count(z.audience)} subscribers). Fill in your numbers in the check above to judge it for your size.</p>` : "";
    const cashWord = j.verdict === "low" ? "below" : j.verdict === "strong" ? "above" : "inside";
    out.innerHTML = `<p class="note warn eq-warn"><b>${esc(DISCLAIMER)}</b></p>
      <div class="panel stack">
        ${sample ? `<div class="sample"><span><b>An example deal:</b> ${esc(money(gbp(cash)))} cash plus ${pctText(x.pct)} of a ${esc(st.name.toLowerCase())} company valued at ${esc(money(gbp(x.valuation * 100)))}. Shown until you check your own.</span></div>` : ""}
        ${sizeSay}
        <div class="verdict-row"><p class="small">On the cash alone, this offer is</p><p class="verdict v-${j.verdict}"><span class="tag ${j.tag} tag-l">${j.word}</span></p></div>
        <p class="small">Fair cash range, ${esc(item.name.toLowerCase())}</p>
        <p class="big num big-m">${esc(money(s.low))} to ${esc(money(s.high))}</p>
        ${scale(s.low.amount, s.high.amount, cash, "Cash")}
        <p class="small">The cash part, ${esc(money(gbp(cash)))}, is ${cashWord} your fair range. ${j.verdict === "low" ? "Judge the cash on its own: rent is not paid in shares." : "The equity is on top of a fair cash price."}</p>
      </div>
      <div class="panel stack">
        <p class="label">What the equity has to make up</p>
        ${r.gapLow === 0
          ? `<p class="small">Nothing: the cash already reaches your fair range. Treat the equity as a bonus that may never pay.</p>`
          : `<div class="eq-gap"><div><span class="small">To the bottom of your range</span><b class="big-s num">${esc(money(gbp(r.gapLow)))}</b></div><div><span class="small">To the middle</span><b class="big-s num">${esc(money(gbp(r.gapMid)))}</b></div></div>
             <p class="small">That is what you give up in cash today. The equity pays, if ever, years from now, and only if the company is sold or lists.</p>`}
      </div>
      <div class="panel stack">
        <p class="label">The equity under three made-up outcomes</p>
        <p class="small">On paper today: <b>${esc(money(gbp(r.paper)))}</b>, at the company's own valuation. You cannot sell it, and nobody has to buy it.</p>
        <div class="tbl-wrap"><table class="tbl eq-tbl"><caption class="sr">Illustrative value of the equity under three made-up outcomes</caption>
          <thead><tr><th scope="col">Outcome</th><th scope="col" class="r">Fully vested</th><th scope="col" class="r">If it ends at the cliff</th></tr></thead>
          <tbody>${r.outcomes.map((o) => `<tr><th scope="row"><span class="eq-o">${esc(words[o.key][0])}</span><span class="small">${esc(words[o.key][1])}</span>${covers(o.full)}</th><td class="r num" data-k="Fully vested">${esc(money(gbp(o.full)))}</td><td class="r num" data-k="If it ends at the cliff">${esc(money(gbp(o.cliff)))}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>
      <details class="fold eq-how"><summary>How this is worked out</summary><div class="fold-body stack">
        <p class="small"><b>Dilution.</b> We assume ${x.rounds === 0 ? "no more funding rounds before a sale" : `${x.rounds} more funding ${x.rounds === 1 ? "round" : "rounds"} before a sale, each issuing new shares equal to ${pctText(x.dilution)} of the company`}. So you keep ${pctText(r.kept * 100)} of the slice you are offered today${r.stakeAfter !== null ? `: ${pctText(x.pct)} becomes about ${pctText(r.stakeAfter)}` : ""}.</p>
        <p class="small"><b>Value.</b> Paper value today × the exit multiple × the share kept after dilution. The failure outcome is zero.</p>
        <p class="small"><b>Vesting.</b> ${x.cliff > 0 ? `Nothing is yours until month ${x.cliff}; then ${pctText(r.atCliff * 100)} of the grant` : "It starts vesting at once"}${x.vest > x.cliff ? `, and the rest month by month until month ${x.vest}` : ""}. If the partnership ends at the cliff, you keep only that part.</p>
        <p class="small"><b>Not counted.</b> Investors with preferred shares are often paid back first in a sale, which can leave ordinary shares and options with less than this, or nothing. Options may carry an exercise price you pay to buy the shares. Tax can fall due when equity vests, when you exercise or when you sell. Years of waiting are not priced in.</p>
        <p class="small"><b>Ask the company.</b> What percentage of the fully diluted shares is this? Is it shares or options, and at what exercise price? What did the last round price a share at? Are there preferences ahead of mine? What happens to unvested equity if the deal ends early?</p>
      </div></details>`;
    $(".eq-how > summary", out).insertAdjacentHTML("afterbegin", icon("caret", { size: 16, className: "caret" }));
  };

  const run = (sample = false) => {
    const err = $("[data-err]", form);
    err.textContent = "";
    const got = read();
    if (got.error) return void (err.textContent = got.error);
    if (!own) $("[data-size-say]", form).textContent = got.z.from === "page" ? "Your size comes from the check above." : "Your size comes from the check above. Until you fill it in, the made-up channel stands in.";
    draw(got.z, got.x, sample);
  };

  form.addEventListener("submit", (e) => { e.preventDefault(); run(false); });
  $("[data-example]", form).addEventListener("click", () => { if (own) sizer.fill(EXAMPLE); fill(EQ_EXAMPLE); run(true); });
  if (own) sizer.fill(EXAMPLE);
  fill(EQ_EXAMPLE);
  run(true);
  return { refresh: () => run(false) };
}
