/*
  What this module needs from a public feed beyond ingest's parseFeed:
  enclosure sizes (for the one-minute rule), the owner's email (for the
  magic link), podcast:txt values (for the ownership code), categories and
  artwork. Built on ingest's own XML reader, which never expands entities.
*/
import { child, childrenNamed, childText, parseFeed, parseXml } from "../ingest/browser.js";
const text = (el) => {
    const t = el?.text.trim();
    return t ? t : undefined;
};
export function readFeedDetails(xml) {
    const feed = parseFeed(xml);
    const channel = child(parseXml(xml), "channel");
    const owner = child(channel, "itunes:owner");
    const categories = [];
    for (const c of childrenNamed(channel, "itunes:category")) {
        if (c.attrs.text)
            categories.push(c.attrs.text);
        for (const sub of childrenNamed(c, "itunes:category"))
            if (sub.attrs.text)
                categories.push(`${c.attrs.text} / ${sub.attrs.text}`);
    }
    const byGuid = new Map(feed.episodes.map((e) => [e.guid, e]));
    const enclosures = [];
    for (const item of childrenNamed(channel, "item")) {
        const enc = child(item, "enclosure");
        const url = enc?.attrs.url;
        if (!url)
            continue;
        const title = childText(item, "title") ?? childText(item, "itunes:title") ?? "Untitled episode";
        const guid = childText(item, "guid") ?? url ?? `${title}|${childText(item, "pubDate") ?? ""}`;
        const ep = byGuid.get(guid);
        if (!ep || enclosures.some((e) => e.guid === guid))
            continue;
        const e = { guid, title: ep.title, publishedAt: ep.publishedAt, url };
        const bytes = Number(enc.attrs.length);
        if (Number.isFinite(bytes) && bytes > 1000)
            e.bytes = bytes;
        if (enc.attrs.type)
            e.type = enc.attrs.type;
        if (ep.durationSec)
            e.durationSec = ep.durationSec;
        enclosures.push(e);
    }
    const details = {
        ...feed,
        txt: childrenNamed(channel, "podcast:txt")
            .map((t) => ({ purpose: t.attrs.purpose, value: t.text.trim() }))
            .filter((t) => t.value),
        categories,
        enclosures,
    };
    const email = text(child(owner, "itunes:email"));
    const name = text(child(owner, "itunes:name"));
    if (email)
        details.ownerEmail = email;
    if (name)
        details.ownerName = name;
    const image = child(channel, "itunes:image")?.attrs.href ?? childText(child(channel, "image"), "url");
    if (image)
        details.imageUrl = image;
    return details;
}
