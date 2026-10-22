/*
  For developers: Orbe's maths as MCP tools for AI agents, and for a brand
  the data API with its keys. Says plainly what is not published yet.
*/
import { on } from "../api.js";
import { tile } from "../catalogue.js";
import { codeBlock, section } from "../console-ui.js";
import { icon } from "../icons.js";
import { h } from "../ui.js";

export const MCP_TOOLS = [
  ["orbe_rate", "A creator's rating against their size band.", "products/rate/", "also"],
  ["orbe_benchmark", "What is typical for a kind and size of creator.", "products/rate/", "also"],
  ["orbe_price_sponsorship", "A price range for each sponsorship format.", "products/sponsorships/", "spon"],
  ["orbe_fair_offer", "Whether an offer is below, within or above that range.", "products/offer/", "spon"],
  ["orbe_value_business", "An indicative value range for a creator business.", "products/selling/", "sell"],
  ["orbe_podcast_plausibility", "Whether a download claim fits public signals.", "products/podcasts/", "pod"],
  ["orbe_explain_rating", "A rating as a plain-English paragraph.", "products/diligence/", "rec"],
  ["orbe_quote_guaranteed_read", "A quote for a read paid only on verified delivery.", "products/sponsorships/", "spon"],
  ["orbe_check_delivery", "Delivered or short against a guarantee.", "products/diligence/", "rec"],
  ["orbe_diagnose_upload", "Whether a work is behind creators its size.", "products/fix/", "fix"],
  ["orbe_judge_fix", "Whether a new title or thumbnail lifted a work.", "products/fix/", "fix"],
];

/** A block of text to copy. Kept for the screens that import it by this name. */
export const snippet = (text, label) => codeBlock(text, label);

export function mcpBody() {
  return [
    h("p", null, "Twelve tools an agent can call instead of guessing: ratings, fair prices, guaranteed-read quotes, delivery checks and where viewers leave a video. Every result is worked out on your machine from the figures the agent passes in; the server reads no accounts and stores nothing."),
    h("p", { class: "cn-banner" }, h("span", null, "Not on npm yet. Until it is published, run it from a copy of Orbe's repository with npm run mcp in product.")),
    codeBlock("claude mcp add orbe -- npx -y orbe-mcp", "Claude Code, once published"),
    codeBlock('{\n  "mcpServers": {\n    "orbe": { "command": "npx", "args": ["-y", "orbe-mcp"] }\n  }\n}', "Any client with an mcpServers block, once published"),
    h("p", { class: "cn-label" }, "Wherever a rating from these tools is shown to a person, show its label with it: Independently calculated by Orbe."),
  ];
}

export async function render(main, ctx) {
  const brand = ctx.user.type === "buyer";
  main.append(
    h("div", { class: "cn-tp" },
      h("header", { class: "cn-tp-head" }, tile("developers/", "pod", h, "l"), h("div", { class: "cn-tp-names" }, h("p", { class: "cn-tp-path" }, h("span", null, "orbe"), " / ", h("b", null, "developers")), h("h1", { class: "cn-tp-title", tabindex: "-1", "data-title": "" }, brand ? "MCP and agents" : "For developers"))),
      h("p", { class: "cn-tp-line" }, "Orbe for agents, over MCP" + (brand && on("brand_data") ? ", and the data API for your own systems." : ". The same maths the console runs, callable from Claude and any MCP client.")),
      h("div", { class: "cn-tags" }, h("span", { class: "cn-tag cn-tag--line" }, "11 tools"), h("span", { class: "cn-tag cn-tag--line" }, "Runs on your machine"), h("span", { class: "cn-tag" }, "Not on npm yet")),
      h("div", { class: "cn-api" },
        h("div", { class: "cn-api-main" },
          section({ title: "MCP server", line: "Install once, then ask your agent." }, ...mcpBody()),
          section({ title: "Tools", line: "What an agent can call." },
            h("div", { class: "cn-mcp-grid" }, MCP_TOOLS.map(([n, d, g, k]) => h("div", { class: "cn-mcp" }, tile(g, k, h, "s"), h("div", null, h("code", null, n), h("p", null, d))))),
          ),
        ),
        h("div", { class: "cn-api-main" },
          brand && on("brand_data")
            ? section({ title: "Data API", line: "Read what your session reads, from your own systems.", actions: h("a", { class: "cn-btn cn-btn--xs", href: "/orbe-site/demo/app/settings/keys" }, icon("key"), "Keys") },
                h("p", null, "Discovery, a creator's public figures, and your roster. Send a key as a bearer token; keys are shown once and stored as hashes."),
                codeBlock('curl https://api.orbe.vc/v1/data/discover?kinds=podcast \\\n  -H "Authorization: Bearer $ORBE_KEY"', "Discovery"),
              )
            : section({ title: "Every tool has an API tab", line: "The same call as HTTP and as an MCP tool." },
                h("p", null, "Open any tool and choose API beside Playground to see its route and its MCP twin."),
                h("div", { class: "cn-links" }, [["Rate a channel", "/orbe-site/demo/app/rate", "products/rate/", "also"], ["Fair offer check", "/orbe-site/demo/app/offer", "products/offer/", "spon"], ["Diligence report", "/orbe-site/demo/app/report", "products/diligence/", "rec"]].map(([t, href, g, k]) => h("a", { class: "cn-link", href }, tile(g, k, h, "s"), h("span", { class: "cn-link-t" }, t), icon("chevronRight")))),
              ),
        ),
      ),
    ),
  );
}
