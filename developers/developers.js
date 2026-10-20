/*
  The developers page: the tool list and the playground. The playground runs
  tools.js and protocol.js, the MCP server's own code with the types stripped
  (product/src/mcp/build.ts writes them), on the compiled engine in
  ../assets/engine. It builds the JSON-RPC request an MCP client would send,
  hands it to the protocol, and shows the response the server would return.
  Nothing leaves the page: no network calls, nothing stored.
*/
import * as rating from "../assets/engine/rating/browser.js";
import * as ratingFormat from "../assets/engine/rating/format.js";
import * as sponsor from "../assets/engine/sponsor/browser.js";
import * as market from "../assets/engine/market/browser.js";
import * as podcast from "../assets/engine/podcast/browser.js";
import { createTools } from "./tools.js";
import { createProtocol, PROTOCOL_VERSION } from "./protocol.js";

const tools = createTools({ rating, ratingFormat, sponsor, market, podcast });
const protocol = createProtocol(tools);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* The handshake an MCP client makes first; done once so the protocol state matches a real session. */
protocol.handle({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "orbe-playground", version: "1" } } });
protocol.handle({ jsonrpc: "2.0", method: "notifications/initialized" });

/* ---------------------------------------------------------------- the tool list */
const list = tools.list();
/* One line each for the list; the full description is the tool's own, shown in the playground. */
const BLURB = {
  orbe_rate: "Rating, band, sub-scores and a rating per work, against the creator's size band.",
  orbe_benchmark: "Typical figures for a kind and size band, and the provisional rate cards.",
  orbe_price_sponsorship: "A price range per format from what the work delivered, with reasons.",
  orbe_fair_offer: "Below, within or above the range, and a counter when it is low.",
  orbe_value_business: "An indicative value on trailing profit, with Orbe's fees at each end.",
  orbe_podcast_plausibility: "Does a download claim fit the public signals? Flags, never accusations.",
  orbe_explain_rating: "The rating as a paragraph a creator can read.",
};
const titled = (t) => (/[.?]$/.test(t) ? t : `${t}.`);
$("[data-tools]").innerHTML = list
  .map((t) => `<li><code class="dv-name">${esc(t.name)}</code><span class="dv-what"><b>${esc(titled(t.title))}</b> ${esc(BLURB[t.name] ?? "")}</span></li>`)
  .join("");

/* ---------------------------------------------------------------- the playground */
const pick = $("[data-tool]");
const args = $("[data-args]");
const say = $("[data-say]");
const err = $("[data-err]");
const req = $("[data-req]");
const res = $("[data-res]");
const summary = $("[data-summary]");
const ran = $("[data-ran]");
let id = 1;

pick.innerHTML = list.map((t) => `<option value="${esc(t.name)}">${esc(t.name)}: ${esc(t.title)}</option>`).join("");

function load(name) {
  const t = tools.get(name);
  say.textContent = BLURB[name] ?? "";
  $("[data-desc]").textContent = t.description;
  args.value = JSON.stringify(t.example, null, 2);
  run();
}

function request() {
  let parsed;
  try {
    parsed = JSON.parse(args.value || "{}");
  } catch (e) {
    return { error: `That is not valid JSON: ${e.message}` };
  }
  return { message: { jsonrpc: "2.0", id: id++, method: "tools/call", params: { name: pick.value, arguments: parsed } } };
}

function run() {
  const r = request();
  if (r.error) {
    err.textContent = r.error;
    err.hidden = false;
    args.setAttribute("aria-invalid", "true");
    return;
  }
  err.hidden = true;
  args.removeAttribute("aria-invalid");
  const out = protocol.handle(r.message);
  req.textContent = JSON.stringify(r.message, null, 2);
  res.textContent = JSON.stringify(out, null, 2);
  const result = out.result;
  if (out.error) summary.textContent = `JSON-RPC error ${out.error.code}: ${out.error.message}`;
  else summary.textContent = result.isError ? `isError: ${result.content[0].text}` : result.content[0].text;
  summary.classList.toggle("is-error", Boolean(out.error || result.isError));
  ran.textContent = `Ran ${pick.value} in this tab.`;
}

pick.addEventListener("change", () => load(pick.value));
$("[data-run]").addEventListener("click", run);
$("[data-reset]").addEventListener("click", () => load(pick.value));
args.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    run();
  }
});

/* ---------------------------------------------------------------- copy buttons */
const sources = { req: () => req.textContent, res: () => res.textContent, desk: () => $('[data-snip="desk"]').textContent, code: () => $('[data-snip="code"]').textContent };
for (const btn of document.querySelectorAll("[data-copy]")) {
  btn.addEventListener("click", async () => {
    const text = sources[btn.dataset.copy]();
    let done = false;
    try {
      await navigator.clipboard.writeText(text);
      done = true;
    } catch {
      done = false;
    }
    const was = "Copy";
    btn.textContent = done ? "Copied" : "Select and copy";
    setTimeout(() => (btn.textContent = was), 1600);
  });
}

load(list[0].name);
