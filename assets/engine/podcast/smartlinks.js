/*
  Smart links: one link per show, orbe.vc/l/<show>, that sends a listener
  to the app they use. The choice, in order: an explicit ?app=; the app the
  listener chose last time on this device (a functional cookie holding only
  the app's name); Apple Podcasts on Apple devices when the show is there;
  otherwise a plain landing page listing every app. Clicks are counted with
  the same daily-salted listener hash as downloads, never an IP.
*/
import { platformOf } from "./useragents.js";
export const APPS = [
    "apple",
    "spotify",
    "youtube",
    "overcast",
    "pocketcasts",
    "castro",
    "podcastaddict",
    "castbox",
    "amazon",
    "iheart",
    "antennapod",
    "goodpods",
    "fountain",
    "rss",
];
export const APP_NAMES = {
    apple: "Apple Podcasts",
    spotify: "Spotify",
    youtube: "YouTube",
    overcast: "Overcast",
    pocketcasts: "Pocket Casts",
    castro: "Castro",
    podcastaddict: "Podcast Addict",
    castbox: "Castbox",
    amazon: "Amazon Music",
    iheart: "iHeartRadio",
    antennapod: "AntennaPod",
    goodpods: "Goodpods",
    fountain: "Fountain",
    rss: "RSS feed",
};
export const isAppKey = (s) => !!s && APPS.includes(s);
/**
  Links apps let anyone build from an Apple id or a feed URL. These are the
  apps' public subscribe URL patterns as we know them; check each before
  launch, since apps change them without notice.
*/
export function appLinks(link) {
    const out = {};
    if (link.appleId && /^\d+$/.test(link.appleId)) {
        out.apple = `https://podcasts.apple.com/podcast/id${link.appleId}`;
        out.overcast = `https://overcast.fm/itunes${link.appleId}`;
        out.pocketcasts = `https://pca.st/itunes/${link.appleId}`;
        out.castro = `https://castro.fm/itunes/${link.appleId}`;
    }
    const feed = encodeURIComponent(link.feedUrl);
    out.podcastaddict = `https://podcastaddict.com/feed/${feed}`;
    out.antennapod = `https://antennapod.org/deeplink/subscribe?url=${feed}`;
    out.rss = link.feedUrl;
    // The creator's own links win over derived ones.
    return { ...out, ...link.apps };
}
export function chooseApp(link, input) {
    const links = appLinks(link);
    const pick = (k) => (isAppKey(k) && links[k] ? { kind: "redirect", app: k, url: links[k] } : null);
    const explicit = pick(input.app) ?? pick(input.cookieApp);
    if (explicit)
        return explicit;
    const platform = platformOf(input.userAgent);
    if ((platform === "ios" || platform === "mac" || platform === "watch") && links.apple)
        return { kind: "redirect", app: "apple", url: links.apple };
    return { kind: "landing" };
}
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/**
  A plain landing page: the show's name and artwork and a button per app.
  No scripts, no trackers, no external requests beyond the artwork.
  Each button goes back through the link with ?app=, so the choice is
  counted and remembered.
*/
export function landingPage(link, selfPath) {
    const links = appLinks(link);
    const buttons = APPS.filter((k) => links[k])
        .map((k) => `<li><a href="${esc(selfPath)}?app=${k}">${esc(APP_NAMES[k])}</a></li>`)
        .join("\n      ");
    const art = link.artworkUrl && /^https:\/\//.test(link.artworkUrl) ? `<img src="${esc(link.artworkUrl)}" alt="" width="160" height="160">` : "";
    return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(link.title)}: listen</title>
  <style>
    :root { color-scheme: light dark; --bg: #fafaf7; --fg: #1b1b18; --line: #d9d8d2; }
    @media (prefers-color-scheme: dark) { :root { --bg: #151513; --fg: #f1f0ea; --line: #3a3a36; } }
    body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
    main { max-width: 26rem; margin: 0 auto; padding: 2rem 16px; text-align: center; }
    img { border-radius: 12px; }
    ul { list-style: none; padding: 0; }
    li a { display: block; margin: .5rem 0; padding: .75rem 1rem; border: 1px solid var(--line); border-radius: 10px; color: inherit; text-decoration: none; }
    small { opacity: .7; }
  </style>
</head>
<body>
  <main>
    ${art}
    <h1>${esc(link.title)}</h1>
    <p>Choose where to listen.</p>
    <ul>
      ${buttons}
    </ul>
    <p><small>Your choice is remembered on this device. Orbe counts clicks without keeping IP addresses.</small></p>
  </main>
</body>
</html>`;
}
/** Where a click came from: an explicit ?s= tag, else the referring site's host, else "direct". */
export function clickSource(sourceParam, referer, ownHost) {
    const tag = sourceParam?.trim().toLowerCase();
    if (tag && /^[a-z0-9][a-z0-9._-]{0,39}$/.test(tag))
        return tag;
    if (referer) {
        try {
            const h = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
            if (h && h !== ownHost)
                return h;
        }
        catch {
            // Not a URL: treat as direct.
        }
    }
    return "direct";
}
