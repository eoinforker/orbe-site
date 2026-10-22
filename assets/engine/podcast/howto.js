/*
  Step by step: adding the Orbe prefix in each major host. Every host
  that supports third-party measurement (Podtrac, OP3, Chartable when it
  ran) has a field for it, under names like "analytics prefix", "tracking
  prefix" or "measurement URL". The "where" lines are our best knowledge of
  each host's settings and are marked unconfirmed until someone checks them
  against the live dashboard: hosts move settings without notice, so each
  carries `confirmed` and the copy tells creators to search for "prefix" if
  the menu has moved.
*/
import { prefixFor } from "./prefix.js";
export const HOST_HOWTO = [
    { host: "Buzzsprout", supportsPrefix: "yes", where: "Podcast Settings, then the analytics or statistics prefix field in the advanced settings.", confirmed: false },
    { host: "Libsyn", supportsPrefix: "yes", where: "Settings for the show, then the advanced or tracking options, then the prefix field.", confirmed: false },
    { host: "Transistor", supportsPrefix: "yes", where: "Your show's Settings, then the analytics prefix field.", confirmed: false },
    { host: "Captivate", supportsPrefix: "yes", where: "Show settings, then the tracking prefixes section.", confirmed: false },
    { host: "Simplecast", supportsPrefix: "yes", where: "Show settings, then the advanced section, then the prefix or measurement URL field.", confirmed: false },
    { host: "Megaphone", supportsPrefix: "yes", where: "The podcast's settings, then tracking URL prefixes. Networks may need an admin.", confirmed: false },
    { host: "Podbean", supportsPrefix: "yes", where: "Settings, then the advanced or third-party analytics section, then the prefix field.", confirmed: false },
    { host: "Acast", supportsPrefix: "on_request", where: "Acast handles prefixes through its support team or your account manager; ask them to add it.", confirmed: false },
    { host: "RSS.com", supportsPrefix: "yes", where: "Podcast settings, then the analytics prefix field.", confirmed: false },
    { host: "Spreaker", supportsPrefix: "yes", where: "Show settings, then the advanced or distribution section, then the prefix field.", confirmed: false },
    { host: "Omny Studio", supportsPrefix: "yes", where: "The program's settings, then the analytics or network section, then the prefix field.", confirmed: false },
    { host: "ART19", supportsPrefix: "on_request", where: "Ask ART19 support or your network to add the prefix to the show.", confirmed: false },
    {
        host: "Spotify for Creators",
        supportsPrefix: "no",
        where: "We know of no prefix setting. Spotify's own dashboard and a CSV export are the routes, and Orbe's public estimates fill in.",
        confirmed: false,
    },
];
/** The steps a creator sees, with their own prefix filled in. */
export function stepsFor(host, showId, feedUrl) {
    const prefix = prefixFor(showId);
    const h = HOST_HOWTO.find((x) => x.host.toLowerCase() === host.toLowerCase());
    const common = [
        `Copy your prefix: ${prefix}`,
        "Paste it into the prefix field exactly as it is, with the slash at the end. If another prefix (OP3, Podtrac) is already there, add Orbe's in front of it: prefixes chain.",
        "Save. Your host adds it to every episode's file URL in your feed; it changes nothing for listeners.",
        `Come back to Orbe and press "Check my feed". We read your public feed${feedUrl ? ` (${feedUrl})` : ""} and look for the prefix on your newest episodes. Hosts can take up to an hour to refresh the feed.`,
    ];
    if (!h)
        return { host, prefix, steps: ["Open your host's settings and search for \"prefix\", \"analytics prefix\" or \"tracking\".", ...common], confirmed: false };
    if (h.supportsPrefix === "no")
        return { host: h.host, prefix, steps: [h.where], confirmed: h.confirmed };
    const first = h.supportsPrefix === "on_request" ? h.where : `In ${h.host}: ${h.where} If it has moved, search the settings for "prefix".`;
    return { host: h.host, prefix, steps: [first, ...common], confirmed: h.confirmed };
}
export function routeFor(host) {
    const h = host ? HOST_HOWTO.find((x) => x.host.toLowerCase() === host.toLowerCase()) : undefined;
    if (!h)
        return { host: host ?? "your host", supportsPrefix: "unknown", route: "prefix", confirmed: false, why: "We could not tell your host from your feed, so the steps say how to find its prefix setting." };
    if (h.supportsPrefix === "no") {
        return {
            host: h.host,
            supportsPrefix: "no",
            route: "export",
            confirmed: h.confirmed,
            why: `${h.host} has no prefix setting that we know of, so Orbe cannot count downloads itself. Upload the analytics export ${h.host} gives you instead.`,
        };
    }
    return {
        host: h.host,
        supportsPrefix: h.supportsPrefix,
        route: "prefix",
        confirmed: h.confirmed,
        why: h.supportsPrefix === "on_request" ? `${h.host} adds prefixes on request.` : `${h.host} lets you add a measurement prefix in its settings.`,
    };
}
