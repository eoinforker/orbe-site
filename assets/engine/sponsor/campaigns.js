/*
  Brands and their campaigns. A brand writes a brief (budget, audience,
  formats, dates, KPIs); the campaign is that brief plus its state and trail.
  Offers, bookings and the report all hang off the campaign id.
*/
import { id as newId } from "../core/util.js";
import { JURISDICTIONS } from "./disclosure.js";
import { FORMAT_SPECS, SPONSOR_FORMATS } from "./formats.js";
import { assertIso, assertPence, entry, fail } from "./util.js";
/** The terms a brand accepts before sending an offer. Kept beside the rules so the copy cannot drift from them. */
export const BRAND_TERMS = "You pay each sponsorship in advance to Orbe's payments partner, which holds the money. Orbe never holds it. The creator is paid when delivery is verified from their own accounts, and any shortfall against an agreed guarantee is made good or refunded as the offer says. Orbe's fee is shown on every offer. You and the creator are each responsible for disclosing the sponsorship as the law requires where it is seen; Orbe checks what it can read and tells you both.";
/** The longest publishing window a brief may ask for. PROVISIONAL product limit. */
export const MAX_WINDOW_DAYS = 180;
export function validateBrief(b, at) {
    if (!b.title.trim())
        fail("invalid_brief", "A brief needs a title");
    if (!b.product.trim())
        fail("invalid_brief", "Say what is being promoted");
    assertPence(b.budget.amount, "budget");
    if (b.budget.amount <= 0)
        fail("invalid_brief", "The budget must be more than zero");
    if (b.formats.length === 0)
        fail("invalid_brief", "Choose at least one format");
    for (const f of b.formats)
        if (!SPONSOR_FORMATS.includes(f))
            fail("invalid_brief", `Unknown format ${f}`);
    const kinds = b.kinds.length ? b.kinds : [...new Set(FORMAT_SPECS.map((s) => s.kind))];
    if (!b.formats.some((f) => FORMAT_SPECS.some((s) => s.format === f && kinds.includes(s.kind)))) {
        fail("invalid_brief", "None of the chosen formats exists for the chosen kinds");
    }
    assertIso(b.window.start, "window start");
    assertIso(b.window.end, "window end");
    if (Date.parse(b.window.end) <= Date.parse(b.window.start))
        fail("invalid_brief", "The window must end after it starts");
    if (Date.parse(b.window.end) <= Date.parse(at))
        fail("invalid_brief", "The window has already ended");
    if ((Date.parse(b.window.end) - Date.parse(b.window.start)) / 864e5 > MAX_WINDOW_DAYS)
        fail("invalid_brief", `A window can be at most ${MAX_WINDOW_DAYS} days`);
    const { minAudience, maxAudience } = b.audience;
    if (minAudience !== undefined && maxAudience !== undefined && minAudience > maxAudience)
        fail("invalid_brief", "Minimum audience is above the maximum");
    for (const c of b.audience.countries)
        if (!/^[A-Z]{2}$/.test(c))
            fail("invalid_brief", `Countries are two-letter codes, got ${c}`);
    for (const j of b.jurisdictions)
        if (!JURISDICTIONS.includes(j))
            fail("invalid_brief", `Unknown jurisdiction ${j}`);
    for (const k of b.kpis) {
        if (k.key === "cost_per_thousand") {
            assertPence(k.max.amount, "KPI cost");
            if (k.max.currency !== b.budget.currency)
                fail("invalid_brief", "KPI cost must be in the budget's currency");
        }
        if (k.key === "units_at" && (!(k.min > 0) || ![1, 7, 30].includes(k.day)))
            fail("invalid_brief", "A delivery KPI needs a positive target at 1, 7 or 30 days");
        if (k.key === "audience_in" && (!(k.minShare > 0 && k.minShare <= 1) || k.countries.length === 0))
            fail("invalid_brief", "An audience KPI needs countries and a share between 0 and 1");
    }
}
/** UK and US rules apply to most of Orbe's creators; a brief with no countries gets both. */
export function defaultJurisdictions(countries) {
    if (countries.length === 0)
        return ["UK", "US"];
    const out = [];
    if (countries.includes("GB"))
        out.push("UK");
    if (countries.includes("US"))
        out.push("US");
    return out.length ? out : ["UK", "US"];
}
export function createCampaign(brand, brief, at, actor) {
    if (!brand.termsAcceptedAt)
        fail("terms_not_accepted", "Accept the brand terms first");
    const b = { ...brief, jurisdictions: brief.jurisdictions.length ? brief.jurisdictions : defaultJurisdictions(brief.audience.countries) };
    validateBrief(b, at);
    const id = newId("cmp");
    return { id, brandId: brand.id, brief: b, state: "draft", createdAt: at, audit: [entry(at, actor, "campaign.created", id, { budget: b.budget.amount, currency: b.budget.currency })] };
}
const MOVES = { draft: ["open", "cancelled"], open: ["closed", "cancelled"], closed: [], cancelled: [] };
export function moveCampaign(c, to, at, actor) {
    if (!MOVES[c.state].includes(to))
        fail("invalid_transition", `A campaign cannot go from ${c.state} to ${to}`);
    if (to === "open")
        validateBrief(c.brief, at);
    return { ...c, state: to, audit: [...c.audit, entry(at, actor, `campaign.${to}`, c.id)] };
}
export function updateBrief(c, brief, at, actor) {
    if (c.state !== "draft" && c.state !== "open")
        fail("invalid_transition", "A closed campaign cannot change");
    validateBrief(brief, at);
    if (brief.budget.currency !== c.brief.budget.currency)
        fail("invalid_brief", "The budget currency cannot change once set");
    return { ...c, brief, audit: [...c.audit, entry(at, actor, "campaign.updated", c.id)] };
}
