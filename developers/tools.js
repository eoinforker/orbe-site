/* GENERATED from product/src/mcp/tools.ts by product/src/mcp/build.ts, with its types stripped. Do not edit: edit tools.ts and run the build. */
/*
  The Orbe tools an agent can call. Each is a thin wrapper over an engine
  function that already exists (rate, explain, the priors, the sponsorship
  price suggestion, the indicative valuation and its fees, the podcast
  plausibility model): it checks the input against its JSON Schema, shapes
  it into what the engine takes, and labels what comes back. No new maths.

  The engine is passed in rather than imported, and this file has only type
  imports, so the same code runs in two places: the MCP server on Node
  (engine.ts hands it the TypeScript modules) and the developers page in the
  browser (a type-stripped copy, site/developers/tools.js, handed the compiled
  modules in site/assets/engine). build.ts writes that copy; a test fails if
  the two drift.

  Every figure an agent passes in is the caller's own, so every result says
  so: typed figures are not read at source. Every result carries the label
  "Independently calculated by Orbe." and the model version.
*/

                                                                                     
                                                          
                                                         
                                                            
                                                          
                                                            

                      
                              
                                    
                                
                              
                                
  

/** The JSON Schema subset the tools use, checked by validate() below. */
                      
                           
                 
                       
                                                       
                                      
                      
                                          
                 
                    
                    
                   
                   
                            
                     
                     
                   
                  
                    
                       
  

                                                      

                                                                                                                                              

                       
               
                
                      
                      
                           
                                                                                            
                                   
  

                         
                                                                      
                                                    

                       
                    
                                         
                                                 
                                   
  

/** Word for word on every result. */
export const ATTRIBUTION = "Independently calculated by Orbe.";

/** On every result built from figures the caller typed. */
export const SUPPLIED_NOTE = "Built from figures you supplied. Orbe did not read them at source, so they are not verified.";

const READ_ONLY = (title        )              => ({ title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });

/* ---------------------------------------------------------------- validation */

const typeOf = (v         )         => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
};

const matchesType = (want        , v         )          => {
  const got = typeOf(v);
  if (want === "number") return got === "number" || got === "integer";
  return got === want;
};

/** Checks a value against the schema subset above. Returns the problems found; empty means valid. */
export function validate(schema        , value         , path = "", issues          = [])          {
  const at = path || "(arguments)";
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(t, value))) {
      issues.push({ path: at, message: `must be ${types.join(" or ")}, got ${typeOf(value)}` });
      return issues;
    }
  }
  if (schema.enum && !schema.enum.includes(value          )) issues.push({ path: at, message: `must be one of ${schema.enum.join(", ")}` });
  if (typeof value === "number") {
    if (!Number.isFinite(value)) issues.push({ path: at, message: "must be a finite number" });
    if (schema.minimum !== undefined && value < schema.minimum) issues.push({ path: at, message: `must be at least ${schema.minimum}` });
    if (schema.maximum !== undefined && value > schema.maximum) issues.push({ path: at, message: `must be at most ${schema.maximum}` });
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) issues.push({ path: at, message: `must be more than ${schema.exclusiveMinimum}` });
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) issues.push({ path: at, message: `must have at least ${schema.minLength} characters` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) issues.push({ path: at, message: `must have at most ${schema.maxLength} characters` });
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) issues.push({ path: at, message: `must match ${schema.pattern}` });
    if (schema.format === "date-time" && !(/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)))) issues.push({ path: at, message: "must be a date and time like 2026-10-18T12:00:00Z" });
    if (schema.format === "date" && !(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)))) issues.push({ path: at, message: "must be a date like 2026-10-18" });
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) issues.push({ path: at, message: `must have at least ${schema.minItems} items` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push({ path: at, message: `must have at most ${schema.maxItems} items` });
    if (schema.items) value.forEach((v, i) => validate(schema.items , v, `${path}[${i}]`, issues));
  }
  if (typeOf(value) === "object") {
    const obj = value                           ;
    for (const key of schema.required ?? []) if (obj[key] === undefined) issues.push({ path: path ? `${path}.${key}` : key, message: "is required" });
    for (const [key, v] of Object.entries(obj)) {
      const sub = path ? `${path}.${key}` : key;
      const prop = schema.properties?.[key];
      if (prop) validate(prop, v, sub, issues);
      else if (schema.additionalProperties === false) issues.push({ path: sub, message: "is not an input this tool takes" });
      else if (typeof schema.additionalProperties === "object") validate(schema.additionalProperties, v, sub, issues);
    }
  }
  return issues;
}

/* ---------------------------------------------------------------- shared schema parts */

const KINDS         = ["youtube", "substack", "twitch", "podcast", "photography"];
const BANDS = ["Great", "Good", "Average", "Subpar", "Poor"]         ;

const kindSchema = (what        )         => ({
  type: "string",
  enum: KINDS,
  description: `${what} youtube (a channel), substack (a newsletter), twitch (a stream channel), podcast, or photography (a portfolio).`,
});

const nowSchema         = {
  type: "string",
  format: "date-time",
  description: "The moment to compute at, ISO 8601. Defaults to now. Pass it to get the same answer every time.",
};

const audienceSchema         = {
  type: "integer",
  minimum: 0,
  maximum: 1_000_000_000,
  description: "The audience in the platform's own sense: subscribers for YouTube and Substack, followers for Twitch, podcasts and photography. It picks the size band.",
};

const worksSchema         = {
  type: "array",
  minItems: 1,
  maxItems: 200,
  description:
    "Recent works, any order. Metric keys by kind: youtube views, likes, comments; substack recipients, opens, clicks, new_paid, new_free; twitch avg_viewers, peak_viewers, hours_watched, new_followers; podcast downloads_7d, downloads_30d, completion (0 to 1); photography views, saves, licences, licence_revenue (minor units). Leave a metric out when unknown: missing means unknown, never zero.",
  items: {
    type: "object",
    required: ["publishedAt", "metrics"],
    additionalProperties: false,
    properties: {
      id: { type: "string", maxLength: 200, description: "Your id for the work, echoed back on its work rating." },
      title: { type: "string", maxLength: 300, description: "The work's title, for your own reading." },
      publishedAt: { type: "string", format: "date-time", description: "When it was published, ISO 8601." },
      durationSec: { type: "number", minimum: 0, description: "Length in seconds for video, audio and streams. On YouTube it separates Shorts (180 seconds or less) from long-form. 0 when it does not apply." },
      metrics: { type: "object", additionalProperties: { type: "number", minimum: 0 }, description: "The work's numbers so far, keyed as listed above." },
    },
  },
};

const ratingInSchema         = {
  type: "object",
  required: ["band"],
  additionalProperties: false,
  description: "The creator's Orbe Rating, if known (from orbe_rate). Its band nudges a rate card price up or down, provisionally.",
  properties: {
    band: { type: "string", enum: BANDS                       , description: "The rating band." },
    rating: { type: "number", minimum: -6, maximum: 6, description: "The rating itself, -6 to +6." },
  },
};

const deliverySchema         = {
  type: "array",
  minItems: 1,
  maxItems: 50,
  items: { type: "number", minimum: 0 },
  description:
    "What each recent work delivered at the format's price window, newest first: YouTube views at 30 days, Substack unique opens at 7 days, podcast downloads at 30 days, Twitch average viewers per stream.",
};

const currencySchema         = {
  type: "string",
  enum: ["USD", "GBP", "EUR"],
  description: "The currency for prices. The rate cards are in US dollars; for GBP or EUR also give usdRate.",
};

const usdRateSchema         = {
  type: "number",
  exclusiveMinimum: 0,
  maximum: 1000,
  description: "How much of your currency one US dollar buys, e.g. 0.79 for GBP. Needed for GBP or EUR. Orbe does not guess exchange rates.",
};

/* ---------------------------------------------------------------- the tools */

export function createTools(engine        )          {
  const { rating: R, ratingFormat: F, sponsor: S, market: M, podcast: P } = engine;

  const versions                         = {
    model: R.MODEL_VERSION,
    rateCards: S.RATE_CARD_VERSION,
    valuation: M.VALUATION_MODEL_VERSION,
    plausibilityRules: P.RULES_VERSION,
  };

  const envelope = (data                         , supplied = true)                          => ({
    attribution: ATTRIBUTION,
    modelVersion: R.MODEL_VERSION,
    versions,
    ...(supplied ? { inputs: SUPPLIED_NOTE } : {}),
    ...data,
  });

  const nowOf = (a                  )         => new Date(a.now ? Date.parse(a.now) : Date.now()).toISOString();

  /* ---- rating */

                                                                                                                                                                                                       

  function snapshotOf(a          , at        )                  {
    const title = a.title?.trim() || "Your account";
    const accountId = "typed_account";
    const works         = a.works.map((w, i) => ({
      id: w.id ?? `work_${i + 1}`,
      accountId,
      kind: a.kind,
      title: w.title ?? `Work ${i + 1}`,
      publishedAt: new Date(Date.parse(w.publishedAt)).toISOString(),
      durationSec: w.durationSec ?? 0,
      metrics: w.metrics,
    }));
    return {
      account: { id: accountId, creatorId: null, kind: a.kind, platformId: "typed", handle: title, title, audience: a.audience },
      works,
      provenance: { source: "invoice_upload", accountId: "typed", checkedAt: at, basis: "uploaded" },
    };
  }

  function metricIssues(a          )          {
    const spec = R.SPECS[a.kind];
    if (!spec) return [{ path: "kind", message: "has no rating spec" }];
    const known = new Set(spec.metrics.map((m) => m.key));
    const issues          = [];
    a.works.forEach((w, i) => {
      for (const k of Object.keys(w.metrics)) if (!known.has(k)) issues.push({ path: `works[${i}].metrics.${k}`, message: `is not a ${a.kind} metric; use ${[...known].join(", ")}` });
    });
    return issues;
  }

  function rateOf(a          ) {
    const at = nowOf(a);
    return { at, result: R.rate(snapshotOf(a, at), at) };
  }

  function rateTool(a          )              {
    const bad = metricIssues(a);
    if (bad.length) return { ok: false, message: "Some metrics are not ones this kind of creator has.", issues: bad };
    const { at, result } = rateOf(a);
    const spec = R.SPECS[a.kind] ;
    if (!R.isRated(result)) {
      return {
        ok: true,
        summary: `${result.message} ${ATTRIBUTION}`,
        structured: envelope({ status: result.status, kind: a.kind, title: result.title, sizeBand: result.sizeBand, reason: result.reason, have: result.have, need: result.need, message: result.message, computedAt: at }),
      };
    }
    const top = R.topStat(result);
    const d = result.detail;
    const summary = `${result.title} rates ${R.signed(result.rating)}, ${result.band}, where zero is typical for ${spec.peers} with ${result.sizeBand.toLowerCase()} ${spec.audienceNoun}.${top ? ` ${top.line}` : ""} ${ATTRIBUTION}`;
    return {
      ok: true,
      summary,
      structured: envelope({
        status: "rated",
        kind: a.kind,
        title: result.title,
        sizeBand: result.sizeBand,
        rating: result.rating,
        ratingShown: R.signed(result.rating),
        band: result.band,
        scale: "Zero is typical for your kind and size. Most creators sit between -2 and +2; the scale runs from -6 to +6.",
        subScores: result.parts.map((p) => ({ key: p.key, name: p.name, value: p.value, percentile: p.score, what: p.what })),
        topStat: top ? top.line : null,
        focusAreas: R.focusAreas(result),
        format: d.formatName,
        worksCounted: d.works,
        confidence: d.confidence,
        provisionalBenchmarks: d.provisional,
        unavailableParts: d.unavailable,
        workRatings: d.workRatings.map((w) => ({ workId: w.workId, rating: w.rating, multipleOfYourMedian: w.multiple, matured: w.matured })),
        notice: result.attribution.notice,
        maths: result.attribution.maths,
        computedAt: at,
      }),
    };
  }

  function explainTool(a          )              {
    const bad = metricIssues(a);
    if (bad.length) return { ok: false, message: "Some metrics are not ones this kind of creator has.", issues: bad };
    const { at, result } = rateOf(a);
    const text = R.explain(result);
    return {
      ok: true,
      summary: text,
      structured: envelope({
        status: result.status,
        kind: a.kind,
        explanation: text,
        rating: R.isRated(result) ? result.rating : null,
        band: R.isRated(result) ? result.band : null,
        sizeBand: result.sizeBand,
        computedAt: at,
      }),
    };
  }

  /* ---- benchmark */

                                                                                         

  function benchmarkTool(a           )              {
    const spec = R.SPECS[a.kind] ;
    let band = a.sizeBand ? spec.sizeBands.find((b) => b.key === a.sizeBand) : undefined;
    if (a.sizeBand && !band) return { ok: false, message: "Unknown size band.", issues: [{ path: "sizeBand", message: `must be one of ${spec.sizeBands.map((b) => b.key).join(", ")} for ${a.kind}` }] };
    if (!band && a.audience !== undefined) band = spec.sizeBands.find((b) => a.audience  >= b.min && (b.max === undefined || a.audience  < b.max));
    if (!band) return { ok: false, message: "Give an audience or a size band.", issues: [{ path: "audience", message: "or sizeBand is required" }] };
    const formats = a.format ? spec.formats.filter((f) => f.key === a.format) : spec.formats;
    if (!formats.length) return { ok: false, message: "Unknown format.", issues: [{ path: "format", message: `must be one of ${spec.formats.map((f) => f.key).join(", ")} for ${a.kind}` }] };
    const b = band;
    const out = formats.map((f) => ({
      format: f.key,
      name: f.name,
      parts: spec.parts.map((part) => {
        const prior = R.priorFor(R.PROVISIONAL_PRIORS, spec, f.key, b.key, part);
        return {
          key: part.key,
          name: part.name,
          weight: part.weight,
          typical: prior.median,
          typicalShown: F.formatDisplay(part.display, prior.median).value,
          spread: prior.sigma,
          scale: part.scale,
          source: prior.source,
          creatorsMeasured: prior.n,
          what: part.what,
        };
      }),
    }));
    const cards = S.PROVISIONAL_RATE_CARDS.filter((c) => c.kind === a.kind).map((c) => ({
      format: c.format,
      perThousandLow: S.formatMoney({ amount: c.cpmLow, currency: c.currency }),
      perThousandHigh: S.formatMoney({ amount: c.cpmHigh, currency: c.currency }),
      per: c.per,
      note: c.note,
      sources: c.sources,
      provisional: c.provisional,
    }));
    const first = out[0].parts.map((p) => `${p.name} ${p.typicalShown}`).join(", ");
    return {
      ok: true,
      summary: `Typical for ${spec.peers} with ${b.label.toLowerCase()} ${spec.audienceNoun} (${out[0].name}): ${first}. These are provisional benchmarks until enough creators of this kind and size consent to be counted. ${ATTRIBUTION}`,
      structured: envelope(
        {
          kind: a.kind,
          kindName: spec.name,
          sizeBand: { key: b.key, label: b.label },
          sizeBands: spec.sizeBands.map((x) => ({ key: x.key, label: x.label })),
          formats: out,
          rules: { minWorks: spec.minWorks, minAgeDays: spec.minAgeDays, fullWeightWorks: spec.fullWeightWorks, maxWorks: spec.maxWorks },
          sponsorshipRateCards: cards,
          note: "Typical values are the medians every rating is measured against. Provisional ones are Orbe's published starting guesses; measured ones replace them cell by cell from creators who consent to be counted.",
        },
        false,
      ),
    };
  }

  /* ---- sponsorship price */

                                                                                                                                                                                                          

  function fxFor(a                                           )                                                                                       {
    const currency = a.currency ?? "USD";
    if (currency === "USD") return { currency };
    if (a.usdRate === undefined) return { currency, issue: { path: "usdRate", message: `is required for ${currency}: how much ${currency} one US dollar buys` } };
    const rate = a.usdRate;
    return { currency, fx: (m, to) => (m.currency === "USD" && to === currency ? { amount: Math.round(m.amount * rate), currency: to } : m.currency === to ? m : null) };
  }

  function inventoryOf(a           ) {
    const at = nowOf(a);
    const { currency, fx } = fxFor(a);
    const r = a.rating ? { band: a.rating.band, rating: a.rating.rating ?? 0 } : null;
    const { inventory, note } = S.inventoryFromStats({ kind: a.kind, audience: a.audience, units: a.delivery, rating: r, currency, fx, at });
    return { at, currency, inventory, note };
  }

  function priceTool(a           )              {
    const fx = fxFor(a);
    if (fx.issue) return { ok: false, message: "An exchange rate is needed.", issues: [fx.issue] };
    const formats = S.specsForKind(a.kind);
    if (!formats.length) return { ok: false, message: `Orbe has no sponsorship formats for ${a.kind} yet.`, issues: [{ path: "kind", message: `has no sponsorship formats; use ${KINDS.filter((k) => S.specsForKind(k).length).join(", ")}` }] };
    if (a.format && !formats.some((f) => f.format === a.format)) return { ok: false, message: "Unknown format for this kind.", issues: [{ path: "format", message: `must be one of ${formats.map((f) => f.format).join(", ")} for ${a.kind}` }] };
    const { at, inventory, note } = inventoryOf(a);
    const items = inventory.items
      .filter((i) => !a.format || i.format === a.format)
      .map((i) => {
        const s = i.suggestion;
        if (!s || s.status !== "suggested") return { format: i.format, name: i.name, status: "not_enough_data", reason: s && s.status === "not_enough_data" ? s.reason : "No suggestion." };
        return {
          format: i.format,
          name: i.name,
          status: "suggested",
          per: s.per,
          low: s.low,
          high: s.high,
          shown: `${S.formatMoney(s.low)} to ${S.formatMoney(s.high)} per ${s.per}`,
          basis: s.basis,
          expected: s.expected,
          perThousand: s.cpm,
          provisional: s.provisional,
          reasons: s.reasons,
          sources: s.sources,
        };
      });
    const fee = S.DEFAULT_TAKE_RATE;
    const lines = items.map((i) => ("shown" in i ? `${i.name}: ${i.shown}` : `${i.name}: not enough data`)).join("; ");
    return {
      ok: true,
      summary: `Suggested prices. ${lines}. The creator sets their own price. ${ATTRIBUTION}`,
      structured: envelope({
        kind: a.kind,
        items,
        orbeFee: { payer: fee.payer, networkPercent: fee.networkBps / 100, directPercent: fee.directBps / 100, note: "Free for creators: by default the brand pays Orbe's fee on top of the creator's price, and only when the sponsorship completes." },
        typedNote: note,
        computedAt: at,
      }),
    };
  }

  /* ---- fair offer */

                                                                                                                                                 

  function fairOfferTool(a           )              {
    const currency = a.offer.currency ?? a.currency ?? "USD";
    const priced = priceTool({ ...a, currency });
    if (!priced.ok) return priced;
    const item = (priced.structured.items                             )[0];
    const per = item.per === "hour" ? Math.max(a.hours ?? 1, 1) : 1;
    const offer        = { amount: Math.round(a.offer.amount), currency };
    const terms = S.feeTermsFor(a.source ?? "network");
    const funding = S.fundingFor(offer, terms);
    const base = { format: a.format, offer, offerShown: S.formatMoney(offer), suggestion: item, brandPays: funding.total, brandPaysShown: S.formatMoney(funding.total), orbeFee: funding.fee, creatorKeeps: offer };
    if (item.status !== "suggested") {
      return { ok: true, summary: `Orbe cannot judge this offer yet: ${String(item.reason)} ${ATTRIBUTION}`, structured: envelope({ ...base, verdict: "not_enough_data", counter: null }) };
    }
    const low = (item.low         ).amount * per;
    const high = (item.high         ).amount * per;
    const money = (amount        ) => S.formatMoney({ amount, currency });
    const range = `${money(low)} to ${money(high)}`;
    let verdict                                                ;
    let counter               = null;
    let say        ;
    if (offer.amount < low) {
      verdict = "below_range";
      counter = { amount: high, currency };
      say = `The offer of ${money(offer.amount)} is below the suggested range of ${range}. A counter at the top of the range, ${money(high)}, is supported by the reasons given.`;
    } else if (offer.amount <= high) {
      verdict = "within_range";
      say = `The offer of ${money(offer.amount)} sits inside the suggested range of ${range}. Accepting is reasonable; ${money(high)} is the top of the range if the creator wants to ask for more.`;
    } else {
      verdict = "above_range";
      say = `The offer of ${money(offer.amount)} is above the suggested range of ${range}.`;
    }
    const position = high > low ? Math.round(((offer.amount - low) / (high - low)) * 100) / 100 : null;
    return {
      ok: true,
      summary: `${say} The creator keeps all of it; the brand pays Orbe's ${terms.bps / 100}% on top only when it completes. ${ATTRIBUTION}`,
      structured: envelope({ ...base, verdict, range: { low: { amount: low, currency }, high: { amount: high, currency } }, positionInRange: position, counter, counterShown: counter ? money(counter.amount) : null, explanation: say }),
    };
  }

  /* ---- business value */

                                                                                                                                          
                                                                                                                                                                                         

  const monthOf = (m        ) => (m.length === 7 ? `${m}-01` : m);

  function valueTool(a           )              {
    const currency = a.currency ?? "GBP";
    if (a.margin === undefined && !a.costs) return { ok: false, message: "Give a margin or monthly costs.", issues: [{ path: "margin", message: "or costs is required" }] };
    const revenue = a.revenue
      .filter((l) => (l.basis ?? "declared") !== "declared")
      .map((l, i) => ({
        id: `typed_line_${i + 1}`,
        accountId: "typed",
        month: monthOf(l.month),
        stream: (l.stream ?? "other")           ,
        counterparty: l.counterparty,
        gross: { amount: Math.round(l.amount), currency },
        provenance: { source: "invoice_upload"         , accountId: "typed", checkedAt: new Date(0).toISOString(), basis: l.basis                             },
      }));
    const declared = a.revenue.filter((l) => (l.basis ?? "declared") === "declared").map((l) => ({ month: monthOf(l.month), gross: { amount: Math.round(l.amount), currency }, stream: (l.stream ?? "other")           , counterparty: l.counterparty }));
    const costs = a.costs ? { basis: "lines"         , months: a.costs.map((c) => ({ month: monthOf(c.month), amount: { amount: Math.round(c.amount), currency } })) } : { basis: "declared_margin"         , margin: a.margin  };
    let v;
    try {
      v = M.valuate({ kind: a.kind, revenue, declared, costs, faceDependence: a.faceDependence, historyMonths: a.historyMonths });
    } catch (e) {
      return { ok: false, message: (e         ).message, issues: [] };
    }
    let fees                                 = null;
    if (v.range && currency === M.DEFAULT_FEE_SCHEDULE.currency) {
      const at = (price       ) => {
        const seller = M.successFee(price, M.DEFAULT_FEE_SCHEDULE);
        const buyer = M.buyerPremium(price);
        return { salePrice: price, sellerFee: seller.fee, sellerFeeShown: M.formatMoney(seller.fee), effectiveRatePercent: seller.effectiveRateBps / 100, minimumApplied: seller.minimumApplied, buyerPremium: buyer ? buyer.fee : null, buyerPremiumShown: buyer ? M.formatMoney(buyer.fee) : null };
      };
      fees = {
        atLow: at(v.range.low),
        atHigh: at(v.range.high),
        schedule: "Seller's fee 8% to £500k, 5% to £2M, 3% above, £4,000 minimum, paid only on a completed sale; buyer's premium 2%. VAT on top. Escrow is a partner's: Orbe never holds client money.",
        scheduleVersion: M.DEFAULT_FEE_SCHEDULE.version,
      };
    }
    const shown = v.range ? `${M.formatMoney(v.range.low)} to ${M.formatMoney(v.range.high)}` : "no range";
    return {
      ok: true,
      summary: `Indicative value ${shown} (${v.multiples.low}x to ${v.multiples.high}x trailing profit of ${M.formatMoney(v.ttmProfit)}), confidence ${v.confidence}. ${M.INDICATIVE_LABEL} ${ATTRIBUTION}`,
      structured: envelope({
        valuation: v,
        rangeShown: shown,
        fees,
        feesNote: fees ? null : `Fees are shown for GBP, the currency of Orbe's fee schedule.`,
        label: M.INDICATIVE_LABEL,
        notice: R.ESTIMATE_NOTICE,
      }),
    };
  }

  /* ---- podcast plausibility */

                    
                                                                                                                                                                                                                                   
                                                                                                      
                                                         
                                
                       
                                
                            
                                                
                          
                 
    

  function plausibilityTool(a           )              {
    const at = nowOf(a);
    const index = a.publicEpisodeCount !== undefined || a.feedDead !== undefined ? { id: 0, title: "", url: "", episodeCount: a.publicEpisodeCount, dead: a.feedDead ? 1 : 0 } : null;
    const feed = a.feedEpisodeDates?.length ? ({ episodes: a.feedEpisodeDates.map((d) => ({ publishedAt: d })) }                                                                 ) : null;
    const videos = (a.youtubeViews ?? []).map((views, i) => ({ episodeGuid: `episode_${i + 1}`, videoWorkId: `video_${i + 1}`, videoTitle: "", views, daysApart: 0, similarity: 1, firstFrameCount: false }));
    const result = P.assessPlausibility({
      claim: a.claim,
      measured: a.measured ?? null,
      op3: a.op3 ? { asof: at, monthlyDownloads: a.op3.monthlyDownloads, weeklyDownloads: [], weeklyAvgDownloads: 0, numWeeks: a.op3.numWeeks } : null,
      index,
      feed,
      videos,
      bestChart: a.bestChart ?? null,
      ratings: a.ratingsCount !== undefined ? { count: a.ratingsCount } : null,
      now: new Date(at),
    });
    const words                         = {
      consistent: "The claim is consistent with every signal checked.",
      consistent_with_notes: "The claim is consistent, with notes worth reading.",
      questions: "The claim raises questions worth asking the seller.",
      inconsistent: "The claim cannot be squared with at least one signal.",
      not_enough_signal: "There is not enough signal to judge the claim.",
    };
    return {
      ok: true,
      summary: `${words[result.verdict]} ${result.flags.length} ${result.flags.length === 1 ? "flag" : "flags"}; signals used: ${result.signalsUsed.join(", ") || "none"}. The model never accuses: each flag gives an innocent reading where there is one. ${ATTRIBUTION}`,
      structured: envelope({ ...result, verdictShown: words[result.verdict], computedAt: at }),
    };
  }

  /* ---- definitions */

  const rateInput         = {
    type: "object",
    required: ["kind", "audience", "works"],
    additionalProperties: false,
    properties: {
      kind: kindSchema("The kind of creator:"),
      audience: audienceSchema,
      title: { type: "string", maxLength: 200, description: "The account's name, used in the wording only." },
      works: worksSchema,
      now: nowSchema,
    },
  };

  const exampleWorks = [
    [4, 18200, 910, 120], [11, 24600, 1180, 164], [18, 16900, 760, 98], [25, 21300, 1020, 141], [32, 52400, 2610, 388],
    [39, 19800, 930, 117], [46, 17500, 820, 102], [53, 22900, 1100, 150], [60, 20100, 960, 129], [67, 18800, 870, 111],
  ].map(([ago, views, likes, comments], i) => ({
    id: `upload_${i + 1}`,
    publishedAt: new Date(Date.parse("2026-10-18T12:00:00Z") - ago * 86_400_000).toISOString(),
    durationSec: 840,
    metrics: { views, likes, comments },
  }));
  const rateExample = { kind: "youtube", audience: 48000, title: "A made-up channel", works: exampleWorks, now: "2026-10-18T12:00:00Z" };

  const priceInputProps                         = {
    kind: { type: "string", enum: ["youtube", "substack", "twitch", "podcast"], description: "The kind of creator: youtube, substack, twitch or podcast. Photography has no sponsorship formats yet." },
    audience: audienceSchema,
    delivery: deliverySchema,
    rating: ratingInSchema,
    currency: currencySchema,
    usdRate: usdRateSchema,
    now: nowSchema,
  };

  const defs                                                   = [
    {
      name: "orbe_rate",
      title: "Rate a creator against their size band",
      description:
        "The Orbe Rating for a creator's recent works: zero is typical for their kind and size band, positive is better, negative is worse, with five bands (Great, Good, Average, Subpar, Poor), sub-scores as percentiles, the #1 stat, what to work on, and a rating for each work against the creator's own median. Use it when someone asks how a channel, newsletter, stream, podcast or portfolio is doing compared with creators its size. Needs at least 3 works old enough to count.",
      inputSchema: rateInput,
      annotations: READ_ONLY("Rate a creator"),
      example: rateExample,
      run: rateTool                             ,
    },
    {
      name: "orbe_benchmark",
      title: "Typical figures for a kind and size band",
      description:
        "What is typical for creators of one kind and size band: the median and spread for each part of the rating (reach, momentum, hit rate, engagement, cadence and the kind's own parts), the size bands, and the provisional sponsorship rate cards for that kind. Use it to answer 'what is normal for a newsletter with 5,000 subscribers'. Give an audience or a size band key.",
      inputSchema: {
        type: "object",
        required: ["kind"],
        additionalProperties: false,
        properties: {
          kind: kindSchema("The kind of creator:"),
          audience: { ...audienceSchema, description: "The audience number, which picks the size band. Give this or sizeBand." },
          sizeBand: { type: "string", maxLength: 20, description: "A size band key instead of an audience: seed, rise, low, mid, high (YouTube only) or top." },
          format: { type: "string", maxLength: 20, description: "Only this format: short or long for YouTube; all for the other kinds. Defaults to every format." },
        },
      },
      annotations: READ_ONLY("Benchmarks"),
      example: { kind: "substack", audience: 5000 },
      run: benchmarkTool                             ,
    },
    {
      name: "orbe_price_sponsorship",
      title: "Price a sponsorship",
      description:
        "A suggested price range for each sponsorship format a creator can sell (YouTube integration and dedicated video, Substack sponsor slot and dedicated send, podcast host-read spot, Twitch sponsored stream segment per hour), from what their recent works delivered, with the reasons, the rate basis (own history, comparables or a provisional rate card with its sources) and Orbe's fee. The creator always sets their own price.",
      inputSchema: {
        type: "object",
        required: ["kind", "audience", "delivery"],
        additionalProperties: false,
        properties: { ...priceInputProps, format: { type: "string", enum: [...S.SPONSOR_FORMATS], description: "Only this format. Defaults to every format the kind has." } },
      },
      annotations: READ_ONLY("Price a sponsorship"),
      example: { kind: "youtube", audience: 48000, delivery: [21000, 18500, 30200, 16800, 24100, 19900], rating: { band: "Good", rating: 1.1 }, now: "2026-10-18T12:00:00Z" },
      run: priceTool                             ,
    },
    {
      name: "orbe_fair_offer",
      title: "Is this sponsorship offer fair?",
      description:
        "Checks a brand's offer for one sponsorship format against the price Orbe suggests from the creator's own delivery, says whether it is below, within or above the range, and gives a counter at the top of the range when it is low. It also shows what the brand pays with Orbe's fee on top; the creator keeps all of their price.",
      inputSchema: {
        type: "object",
        required: ["kind", "audience", "delivery", "format", "offer"],
        additionalProperties: false,
        properties: {
          ...priceInputProps,
          format: { type: "string", enum: [...S.SPONSOR_FORMATS], description: "The format the offer is for: integration, dedicated, newsletter_slot, podcast_read or stream_segment." },
          offer: {
            type: "object",
            required: ["amount"],
            additionalProperties: false,
            description: "The brand's offer for the whole placement.",
            properties: {
              amount: { type: "integer", minimum: 1, description: "In minor units: cents or pence. $600.00 is 60000." },
              currency: { ...currencySchema, description: "The offer's currency. Defaults to currency, then USD." },
            },
          },
          hours: { type: "number", minimum: 1, maximum: 24, description: "For a stream segment, the hours the offer covers. Defaults to 1." },
          source: { type: "string", enum: ["network", "direct"], description: "network if Orbe matched the brand (15% fee), direct if the creator brought the sponsor (5%). Defaults to network." },
        },
      },
      annotations: READ_ONLY("Check an offer"),
      example: { kind: "youtube", audience: 48000, delivery: [21000, 18500, 30200, 16800, 24100, 19900], format: "integration", offer: { amount: 30000, currency: "USD" }, now: "2026-10-18T12:00:00Z" },
      run: fairOfferTool                             ,
    },
    {
      name: "orbe_value_business",
      title: "Indicative value of a creator business",
      description:
        "An indicative value range for a creator business on a multiple of trailing twelve months' profit, with the factors that moved it (verification, diversification, dependence on the creator, history, growth, concentration, size), its confidence, and the fees Orbe would charge on a completed sale at each end of the range. Indicative only: not advice, not a formal valuation and not an offer. Needs at least 3 months of revenue.",
      inputSchema: {
        type: "object",
        required: ["kind", "revenue", "faceDependence"],
        additionalProperties: false,
        properties: {
          kind: kindSchema("The kind of business:"),
          currency: { type: "string", enum: ["GBP", "USD", "EUR"], description: "The currency of every amount. Defaults to GBP. Fees are shown for GBP." },
          revenue: {
            type: "array",
            minItems: 1,
            maxItems: 600,
            description: "Revenue by month. Several lines for one month are added together.",
            items: {
              type: "object",
              required: ["month", "amount"],
              additionalProperties: false,
              properties: {
                month: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])(-01)?$", description: "The month, like 2026-09 or 2026-09-01." },
                amount: { type: "integer", minimum: 0, description: "Gross revenue in minor units: pence or cents. £1,250.00 is 125000." },
                stream: { type: "string", enum: ["ads", "sponsorship", "subscriptions", "memberships", "products", "licensing", "tips", "other"], description: "Where the money came from. Defaults to other." },
                basis: { type: "string", enum: ["connected", "uploaded", "declared"], description: "How it is known: connected (read from the platform), uploaded (from an invoice or statement) or declared (stated, the default). Only connected and uploaded count as verified." },
                counterparty: { type: "string", maxLength: 200, description: "Who paid, e.g. a sponsor. Used only to measure concentration." },
              },
            },
          },
          margin: { type: "number", minimum: -1, maximum: 1, description: "Profit as a share of revenue, 0 to 1, if costs are not given. A stated margin lowers confidence." },
          costs: {
            type: "array",
            maxItems: 600,
            description: "Monthly costs instead of a margin.",
            items: {
              type: "object",
              required: ["month", "amount"],
              additionalProperties: false,
              properties: { month: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])(-01)?$" }, amount: { type: "integer", minimum: 0, description: "Minor units." } },
            },
          },
          faceDependence: { type: "number", minimum: 0, maximum: 1, description: "How much the business needs the creator personally: 0 not at all, 1 it is them." },
          historyMonths: { type: "integer", minimum: 0, maximum: 600, description: "Months the business has traded, if longer than the revenue given." },
        },
      },
      annotations: READ_ONLY("Value a business"),
      example: {
        kind: "youtube",
        currency: "GBP",
        revenue: ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].flatMap((month, i) => [
          { month, amount: 420000 + i * 6000, stream: "ads", basis: "connected" },
          { month, amount: 180000, stream: "sponsorship", basis: "uploaded", counterparty: "Sponsor A" },
        ]),
        margin: 0.7,
        faceDependence: 0.6,
        historyMonths: 40,
      },
      run: valueTool                             ,
    },
    {
      name: "orbe_podcast_plausibility",
      title: "Is a podcast's download claim plausible?",
      description:
        "Checks a podcast's claimed or host-reported downloads against what can be seen: Orbe's own measurement, OP3's public counts, the claim's internal consistency (a daily series that is too flat or too round, a first week bigger than the first month), the public feed, YouTube views of video episodes, chart positions and public ratings. Returns a verdict, flags with an innocent reading where there is one, and an estimate when OP3 data is given. It never accuses.",
      inputSchema: {
        type: "object",
        required: ["claim"],
        additionalProperties: false,
        properties: {
          claim: {
            type: ["object", "null"],
            required: ["basis"],
            additionalProperties: false,
            description: "What is claimed. null when nothing is claimed.",
            properties: {
              basis: { type: "string", enum: ["claimed", "host"], description: "claimed: typed by the creator or a seller. host: read from their podcast host." },
              monthlyDownloads: { type: "number", minimum: 0, description: "Downloads in the last 30 days, all episodes." },
              daily: { type: "object", additionalProperties: { type: "number", minimum: 0 }, description: "Downloads by day, keyed 2026-10-01." },
              dailyTotal: { type: "number", minimum: 0, description: "A total the claim states for the same days as daily." },
              episodes: {
                type: "array",
                maxItems: 2000,
                items: {
                  type: "object",
                  required: ["guid", "publishedAt"],
                  additionalProperties: false,
                  properties: {
                    guid: { type: "string", maxLength: 300 },
                    publishedAt: { type: "string", format: "date-time" },
                    downloads_7d: { type: "number", minimum: 0 },
                    downloads_30d: { type: "number", minimum: 0 },
                  },
                },
              },
            },
          },
          measured: {
            type: "object",
            required: ["monthlyDownloads", "daysMeasured", "prefixCoverage"],
            additionalProperties: false,
            description: "Orbe's own measurement prefix count, if the show has one.",
            properties: {
              monthlyDownloads: { type: "number", minimum: 0 },
              daysMeasured: { type: "integer", minimum: 0 },
              prefixCoverage: { type: "string", enum: ["live", "partial"], description: "live when every episode goes through the prefix." },
            },
          },
          op3: {
            type: "object",
            required: ["monthlyDownloads", "numWeeks"],
            additionalProperties: false,
            description: "OP3's public counts for the show, if it uses the OP3 prefix.",
            properties: { monthlyDownloads: { type: "number", minimum: 0 }, numWeeks: { type: "integer", minimum: 0, description: "Weeks of OP3 data." } },
          },
          publicEpisodeCount: { type: "integer", minimum: 0, description: "Episodes Podcast Index sees in the public feed." },
          feedDead: { type: "boolean", description: "True if Podcast Index marks the feed dead." },
          feedEpisodeDates: { type: "array", maxItems: 5000, items: { type: "string", format: "date-time" }, description: "Publish dates of the episodes in the public feed." },
          youtubeViews: { type: "array", maxItems: 2000, items: { type: "number", minimum: 0 }, description: "Views of the video versions of episodes on YouTube." },
          bestChart: { type: "object", required: ["rank", "chart"], additionalProperties: false, properties: { rank: { type: "integer", minimum: 1 }, chart: { type: "string", maxLength: 200 } }, description: "Best chart position seen." },
          ratingsCount: { type: "integer", minimum: 0, description: "Public ratings across the podcast apps." },
          now: nowSchema,
        },
      },
      annotations: READ_ONLY("Check a podcast claim"),
      example: {
        claim: { basis: "claimed", monthlyDownloads: 26000 },
        op3: { monthlyDownloads: 11800, numWeeks: 12 },
        publicEpisodeCount: 96,
        ratingsCount: 140,
        now: "2026-10-18T12:00:00Z",
      },
      run: plausibilityTool                             ,
    },
    {
      name: "orbe_explain_rating",
      title: "Explain a rating in plain English",
      description:
        "The Orbe Rating for the same input as orbe_rate, written as a short paragraph a creator can read: what is typical for creators their size, how they compare part by part, their strongest stat and the one to work on, and how sure it is. Use it when someone wants the rating explained rather than the numbers.",
      inputSchema: rateInput,
      annotations: READ_ONLY("Explain a rating"),
      example: rateExample,
      run: explainTool                             ,
    },
  ];

  const byName = new Map(defs.map((d) => [d.name, d]));
  const strip = ({ run: _run, ...def }                            )          => def;

  return {
    versions,
    list: () => defs.map(strip),
    get: (name) => {
      const d = byName.get(name);
      return d ? strip(d) : undefined;
    },
    call(name, args) {
      const d = byName.get(name);
      if (!d) return { ok: false, message: `Unknown tool: ${name}`, issues: [] };
      const input = args === undefined || args === null ? {} : args;
      const issues = validate(d.inputSchema, input);
      if (issues.length) return { ok: false, message: `The input does not match ${name}'s schema.`, issues };
      try {
        return d.run(input         );
      } catch (e) {
        return { ok: false, message: (e         ).message || "The engine could not compute this.", issues: [] };
      }
    },
  };
}
