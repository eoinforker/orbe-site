/* Diligence: real Orbe Verified reports from the record module's labelled fixtures (site/assets/engine/record). */
import { shell, $, esc, segmented, download, liveStrip, nodash } from "../assets/shell.js";
import { buildReport, renderHtml, textToString, cleanCreator, suspiciousCreator, messyCreator, FIXTURE_NOW, FIXTURE_BUYER } from "../../assets/engine/record/browser.js";

shell("diligence");
$("[data-live]").innerHTML = liveStrip({
  live: "The verified record, every cross-check, the flags and the report renderer: the record module's own code, run on made-up records.",
  local: "Reports are generated on this device from labelled fixtures. Download or print one to see the file a buyer gets.",
  api: "Reports on a real creator's verified record, read from their connected sources with their consent, shared with one named buyer at a time.",
});

const CASES = {
  clean: { make: cleanCreator, who: "Juniper Vale, a made-up YouTube creator: AdSense, YouTube Analytics and Stripe connected, with payouts, and invoices paid through Stripe." },
  suspicious: { make: suspiciousCreator, who: "Nova Reyes, a made-up creator built to fail checks: payouts above charges, YouTube estimates 40% above AdSense, a sponsor paying half its invoices, a 40% audience jump in three days, views without engagement, 14% monthly churn." },
  messy: { make: messyCreator, who: "Ollie Marsh, a made-up newsletter: a stale Substack export, Stripe connected late without payouts, AdSense gaps, a dollar invoice with no rate, a repeated and a double-entered invoice." },
};
// The report's own type is from the legacy faces; on this site it uses the Masthead faces.
const fonts = new URL("../../assets/fonts/", import.meta.url).href;
const SITE_TYPE = `<style>
@font-face{font-family:"Schibsted Grotesk";src:url("${fonts}SchibstedGrotesk-Latin-VF.woff2") format("woff2");font-weight:400 900}
@font-face{font-family:"Newsreader";src:url("${fonts}Newsreader-Latin-VF.woff2") format("woff2");font-weight:300 700}
@font-face{font-family:"Commit Mono";src:url("${fonts}CommitMono-Latin-VF.woff2") format("woff2");font-weight:400 600}
:root{--serif:"Newsreader",Georgia,serif!important;--sans:"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif!important;--mono:"Commit Mono",ui-monospace,Menlo,monospace!important}
</style>`;

let html = "";
let current = "clean";
const frame = $("[data-frame]");
function show(key) {
  current = key;
  const c = CASES[key];
  const r = buildReport(c.make(), { kind: "buyer", buyerId: FIXTURE_BUYER }, { clock: () => new Date(FIXTURE_NOW) });
  if (!r.ok) {
    $("[data-summary]").innerHTML = `<p class="err">${esc(nodash(r.refusal?.message ?? "The report was refused."))}</p>`;
    return;
  }
  const rep = r.report;
  html = renderHtml(rep);
  $("[data-who]").innerHTML = `<b>Made up.</b> ${esc(c.who)}`;
  const tone = rep.verdict.status === "verified" ? "good" : rep.verdict.status === "partly_verified" ? "bad" : "warn";
  const TONE = { good: ["good", "Good"], concern: ["warn", "Ask"], note: ["", "Note"] };
  $("[data-summary]").innerHTML = `
    <p><span class="tag ${tone}" style="font-size:15px;padding:6px 14px">${esc(rep.verdict.label)}</span></p>
    <p style="font-size:18px">${esc(nodash(textToString(rep.verdict.summary)))}</p>
    <ul class="fits">${rep.keyPoints.slice(0, 6).map((k) => `<li><span class="tag ${(TONE[k.tone] ?? TONE.note)[0]}">${(TONE[k.tone] ?? TONE.note)[1]}</span><span>${esc(nodash(textToString(k.text)))}</span></li>`).join("")}</ul>
    <p class="small">The full report follows: scroll inside it, or open it as a full page. Every number in it links to the figure index and on to the source read it came from.</p>`;
  frame.srcdoc = html.replace("</head>", `${SITE_TYPE}</head>`);
}
segmented($("[data-pick]"), show);
$("[data-download]").addEventListener("click", () => download(`orbe-verified-made-up-${current}.html`, html, "text/html"));
$("[data-open]").addEventListener("click", () => { const u = URL.createObjectURL(new Blob([html.replace("</head>", `${SITE_TYPE}</head>`)], { type: "text/html" })); open(u, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(u), 60000); });
$("[data-print]").addEventListener("click", () => { try { frame.contentWindow.print(); } catch { download(`orbe-verified-made-up-${current}.html`, html, "text/html"); } });
show("clean");
