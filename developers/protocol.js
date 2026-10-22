/* GENERATED from product/src/mcp/protocol.ts by product/src/mcp/build.ts, with its types stripped. Do not edit: edit protocol.ts and run the build. */
/*
  The Model Context Protocol, by hand: JSON-RPC 2.0 messages for one server
  with tools and nothing else. Spec: modelcontextprotocol.io, revision
  2025-06-18 (lifecycle, tools, JSON-RPC base). No transport here: server.ts
  feeds it lines from stdin, and the developers page feeds it the playground's
  request, so both show exactly the same response.

  What it answers:
  - initialize: version negotiation (2025-06-18 first; an older revision we
    know is echoed back, an unknown one gets ours), capabilities, serverInfo.
  - notifications/initialized and any other notification: no response.
  - ping: an empty result.
  - tools/list: every tool with its title, description, input schema and
    annotations. One page, so no nextCursor.
  - tools/call: content (a plain summary and the JSON) plus structuredContent.
    Input that fails the schema, and engine errors, come back as a result
    with isError: true, so the model can read them and try again. An unknown
    tool is a protocol error, -32602.
  JSON-RPC batches are not part of 2025-06-18, so an array is an invalid request.
*/

                                          

export const PROTOCOL_VERSION = "2025-06-18";
export const SUPPORTED_VERSIONS                    = ["2025-06-18", "2025-03-26", "2024-11-05"];

export const ERRORS = { parse: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, internal: -32603 }         ;

                                        
                                                                             
                                                                                                               

                                                                          

export const SERVER_INFO             = { name: "orbe", title: "Orbe", version: "0.1.0" };

export const INSTRUCTIONS =
  "Orbe rates creators against creators their own size and prices their work. Call these tools instead of estimating a creator's rating, a sponsorship price or a business value yourself. Every figure is computed by Orbe's published engine from the input you give; nothing is fetched, stored or sent anywhere. Results built from typed figures are not verified. Quote the attribution line with any rating, band or benchmark. For a sponsorship the brand pays for only on verified delivery, quote it with orbe_quote_guaranteed_read and judge delivery with orbe_check_delivery; neither books anything, and the creator must approve every booking. For Orbe Fix, orbe_diagnose_upload says whether a YouTube upload is below creators its size and what to fix, and orbe_judge_fix says whether a change lifted it; orbe_retention_cuts reads a video's retention curve for where viewers leave and what to tighten; none of them changes anything.";

const isObject = (v         )                               => typeof v === "object" && v !== null && !Array.isArray(v);
const isId = (v         )                 => typeof v === "string" || (typeof v === "number" && Number.isInteger(v));

                        
                                                                             
                                                   
                                                                   
                                          
                                                                                                
  

export function createProtocol(tools         , info             = SERVER_INFO)           {
  const state = { initialized: false, protocolVersion: null                 , clientInfo: null            };

  const ok = (id           , result         )                  => ({ jsonrpc: "2.0", id, result });
  const fail = (id                  , code        , message        , data          )                  => ({ jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } });

  function initialize(id           , params                         )                  {
    const asked = params.protocolVersion;
    if (typeof asked !== "string") return fail(id, ERRORS.invalidParams, "initialize needs params.protocolVersion");
    const version = SUPPORTED_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSION;
    state.protocolVersion = version;
    state.clientInfo = params.clientInfo ?? null;
    return ok(id, {
      protocolVersion: version,
      capabilities: { tools: { listChanged: false } },
      serverInfo: info,
      instructions: INSTRUCTIONS,
    });
  }

  function listTools(id           )                  {
    return ok(id, {
      tools: tools.list().map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations })),
    });
  }

  function callTool(id           , params                         )                  {
    const name = params.name;
    if (typeof name !== "string") return fail(id, ERRORS.invalidParams, "tools/call needs params.name");
    if (!tools.get(name)) return fail(id, ERRORS.invalidParams, `Unknown tool: ${name}`);
    if (params.arguments !== undefined && !isObject(params.arguments)) return fail(id, ERRORS.invalidParams, "params.arguments must be an object");
    const out = tools.call(name, params.arguments ?? {});
    if (!out.ok) {
      const lines = out.issues.map((i) => `${i.path}: ${i.message}`);
      const text = [out.message, ...lines].join("\n");
      return ok(id, { content: [{ type: "text", text }], structuredContent: { error: out.message, issues: out.issues }, isError: true });
    }
    return ok(id, {
      content: [
        { type: "text", text: out.summary },
        { type: "text", text: JSON.stringify(out.structured) },
      ],
      structuredContent: out.structured,
      isError: false,
    });
  }

  function handle(message         )                         {
    if (Array.isArray(message)) return fail(null, ERRORS.invalidRequest, "Batches are not supported in MCP 2025-06-18; send one message at a time.");
    if (!isObject(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      // A response or junk. Answer only if it carries an id we can echo.
      if (isObject(message) && ("result" in message || "error" in message)) return null;
      return fail(isObject(message) && isId(message.id) ? message.id : null, ERRORS.invalidRequest, "Not a JSON-RPC 2.0 request.");
    }
    const method = message.method;
    const notification = !("id" in message);
    if (notification) {
      if (method === "notifications/initialized") state.initialized = true;
      return null;
    }
    const id = message.id;
    if (!isId(id)) return fail(null, ERRORS.invalidRequest, "The id must be a string or an integer.");
    const params = message.params === undefined ? {} : message.params;
    if (!isObject(params)) return fail(id, ERRORS.invalidParams, "params must be an object.");
    try {
      switch (method) {
        case "initialize":
          return initialize(id, params);
        case "ping":
          return ok(id, {});
        case "tools/list":
          return listTools(id);
        case "tools/call":
          return callTool(id, params);
        default:
          return fail(id, ERRORS.methodNotFound, `Method not found: ${method}`);
      }
    } catch (e) {
      return fail(id, ERRORS.internal, (e         ).message || "Internal error");
    }
  }

  function handleLine(line        )                {
    const text = line.trim();
    if (!text) return null;
    let message         ;
    try {
      message = JSON.parse(text);
    } catch {
      return JSON.stringify(fail(null, ERRORS.parse, "Parse error: each line must be one JSON-RPC message."));
    }
    const out = handle(message);
    return out ? JSON.stringify(out) : null;
  }

  return { handle, handleLine, state };
}
