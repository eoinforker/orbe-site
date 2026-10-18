/*
  Creator exports for the rating: the CSV a creator downloads from YouTube
  Studio, Substack, Spotify for Creators or their podcast host, read into an
  AccountSnapshot whose works carry the rating's own metric keys
  (rating/kinds.ts). Runs in the browser engine as well as in Node, so a
  creator can be rated from a file that never leaves their device.

  Every column alias below is our reading of exports seen in help pages and
  forums, not checked against a live account: each format carries
  `confirmed: false` until someone has, and unknown columns are reported,
  never guessed. Counts that cannot be tied to an age are left out:
  - YouTube views, likes and comments are lifetime counts at the export date,
    which is exactly what the rating's maturity curve expects.
  - Podcast downloads must be windowed (first 7 or 30 days). A lifetime
    count is used only for an episode still inside the window on the export
    date, where lifetime and "so far in the window" are the same number.
  Uploaded, so provenance basis "uploaded": the creator's own file.
*/
import { cellNumber, mapColumns, normaliseHeader, parseCsv } from "./csv.js";
import { parseLooseDate } from "./dates.js";
import { InvalidInputError } from "./errors.js";
import { accountIdFor, workIdFor } from "./ids.js";
import { createSubstackExport, detectExport } from "./substack.js";
export const EXPORT_FORMATS = [
    { format: "youtube_studio", kind: "youtube", label: "YouTube Studio", where: "Analytics, Advanced mode, Content tab, then Export current view as CSV (the Table data file). Add Likes and Comments added as columns first if you can.", confirmed: false },
    { format: "substack_posts", kind: "substack", label: "Substack", where: "Dashboard, Stats, Emails, then Export, or posts.csv from Settings, Export your data.", confirmed: false },
    { format: "spotify_for_creators", kind: "podcast", label: "Spotify for Creators", where: "Analytics for your show, Episodes, then Download or Export as CSV.", confirmed: false },
    { format: "podcast_host", kind: "podcast", label: "Podcast host", where: "Your host's episode downloads export (Buzzsprout, Transistor, Captivate, Libsyn and others), ideally with first 7 and 30 day columns.", confirmed: false },
];
const YOUTUBE_COLUMNS = {
    id: ["content", "video", "video id", "id"],
    title: ["video title", "title"],
    date: ["video publish time", "publish time", "published", "publish date", "date"],
    duration: ["duration", "duration (seconds)", "length"],
    views: ["views"],
    likes: ["likes"],
    comments: ["comments added", "comments"],
};
const SPOTIFY_COLUMNS = {
    title: ["episode", "episode title", "episode name", "title", "name"],
    date: ["release date", "published", "publish date", "date", "released"],
    duration: ["duration", "length", "duration (seconds)"],
    d7: ["plays first 7 days", "streams first 7 days", "first 7 days", "7 day plays", "plays (7 days)"],
    d30: ["plays first 30 days", "streams first 30 days", "first 30 days", "30 day plays", "plays (30 days)"],
    total: ["plays", "streams", "streams and downloads", "starts", "total plays", "all time plays"],
    completion: ["average completion", "completion", "completion rate", "average consumption", "consumption"],
};
const HOST_COLUMNS = {
    title: ["episode title", "episode", "title", "name"],
    date: ["published", "publish date", "release date", "date", "published at", "pub date"],
    duration: ["duration", "length", "duration (seconds)"],
    d7: ["downloads 7 days", "7 day downloads", "first 7 days", "downloads first 7 days", "downloads_7d", "7 days", "day 7"],
    d30: ["downloads 30 days", "30 day downloads", "first 30 days", "downloads first 30 days", "downloads_30d", "30 days", "day 30"],
    total: ["downloads", "total downloads", "all time downloads", "lifetime downloads", "total"],
    completion: ["average completion", "completion", "completion rate", "consumption"],
};
const has = (header, names) => {
    const norm = header.map(normaliseHeader);
    return names.some((n) => norm.includes(normaliseHeader(n)));
};
/** Which creator export a header is, or null. */
export function detectCreatorExport(header) {
    if (has(header, ["video title", "video publish time"]))
        return "youtube_studio";
    if (has(header, ["downloads", "total downloads", "downloads 7 days", "7 day downloads", "downloads_7d", "downloads first 7 days", "lifetime downloads"]))
        return "podcast_host";
    if (has(header, ["plays", "streams", "streams and downloads", "starts", "plays first 7 days", "streams first 7 days"]))
        return "spotify_for_creators";
    if (detectExport(header) === "posts")
        return "substack_posts";
    return null;
}
/** "1:02:03", "12:30", "754" or "754.0" into seconds; 0 when unknown. */
export function durationSeconds(cell) {
    const t = (cell ?? "").trim();
    if (!t)
        return 0;
    if (/^\d+(\.\d+)?$/.test(t))
        return Math.round(Number(t));
    const parts = t.split(":").map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n)))
        return 0;
    return parts.reduce((a, n) => a * 60 + n, 0);
}
const DAY = 864e5;
function base(kind, opts, label) {
    const title = opts.title?.trim() || `My ${label} export`;
    const platformId = `upload:${title.toLowerCase()}`;
    const provenance = { source: kind === "youtube" ? "youtube_analytics" : kind === "substack" ? "substack_export" : "podcast_host", accountId: platformId, checkedAt: opts.exportedAt, basis: "uploaded" };
    const account = { id: accountIdFor(kind, platformId), creatorId: null, kind, platformId, handle: title, title, audience: Math.max(0, Math.round(opts.audience || 0)) };
    return { snapshot: { account, works: [], provenance }, provenance };
}
function readYouTube(table, opts) {
    const col = mapColumns(table.header, YOUTUBE_COLUMNS);
    const { snapshot } = base("youtube", opts, "YouTube");
    const warnings = [];
    let skipped = 0;
    if (col.views < 0)
        throw new InvalidInputError("This YouTube Studio export has no Views column", "youtube_analytics");
    if (col.likes < 0 || col.comments < 0)
        warnings.push("No Likes or Comments added column, so the Engagement part is set aside and the rest reweighted. Add both columns in Studio's Advanced mode to include it.");
    for (const { line, cells } of table.rows) {
        const id = col.id >= 0 ? (cells[col.id] ?? "").trim() : "";
        if (/^total$/i.test(id) || /^total$/i.test((cells[col.title] ?? "").trim()))
            continue;
        const title = (cells[col.title] ?? "").trim() || id;
        const date = col.date >= 0 ? parseLooseDate(cells[col.date] ?? "", opts.dateOrder) : null;
        const views = cellNumber(cells[col.views]);
        if (!title || !date || views === null) {
            skipped++;
            warnings.push(`Line ${line}: no ${!title ? "title" : !date ? "readable publish date" : "views"}, left out`);
            continue;
        }
        const metrics = { views };
        const likes = col.likes >= 0 ? cellNumber(cells[col.likes]) : null;
        const comments = col.comments >= 0 ? cellNumber(cells[col.comments]) : null;
        if (likes !== null)
            metrics.likes = likes;
        if (comments !== null)
            metrics.comments = comments;
        snapshot.works.push(work("youtube", snapshot, id || `${title}|${date}`, title, date, durationSeconds(cells[col.duration]), metrics));
    }
    return done("youtube_studio", snapshot, skipped, warnings);
}
function readPodcast(table, opts, format) {
    const col = mapColumns(table.header, format === "podcast_host" ? HOST_COLUMNS : SPOTIFY_COLUMNS);
    const label = format === "podcast_host" ? "podcast host" : "Spotify for Creators";
    const { snapshot } = base("podcast", opts, label);
    const warnings = [];
    let skipped = 0;
    let lifetimeOnly = 0;
    const unit = format === "podcast_host" ? "downloads" : "plays";
    if (col.d7 < 0 && col.d30 < 0 && col.total < 0)
        throw new InvalidInputError(`This export has no ${unit} column we recognise`, "podcast_host");
    const exported = Date.parse(opts.exportedAt);
    for (const { line, cells } of table.rows) {
        const title = (cells[col.title] ?? "").trim();
        if (/^total$/i.test(title))
            continue;
        const date = col.date >= 0 ? parseLooseDate(cells[col.date] ?? "", opts.dateOrder) : null;
        if (!title || !date) {
            skipped++;
            warnings.push(`Line ${line}: no ${!title ? "title" : "readable release date"}, left out`);
            continue;
        }
        const age = (exported - Date.parse(`${date}T00:00:00Z`)) / DAY;
        const metrics = {};
        const d7 = col.d7 >= 0 ? cellNumber(cells[col.d7]) : null;
        const d30 = col.d30 >= 0 ? cellNumber(cells[col.d30]) : null;
        const total = col.total >= 0 ? cellNumber(cells[col.total]) : null;
        if (d7 !== null)
            metrics.downloads_7d = d7;
        else if (total !== null && age <= 7)
            metrics.downloads_7d = total;
        if (d30 !== null)
            metrics.downloads_30d = d30;
        else if (total !== null && age <= 30)
            metrics.downloads_30d = total;
        const completion = col.completion >= 0 ? cellNumber(cells[col.completion]) : null;
        if (completion !== null)
            metrics.completion = completion > 1 ? completion / 100 : completion;
        if (metrics.downloads_7d === undefined && metrics.downloads_30d === undefined) {
            if (total !== null)
                lifetimeOnly++;
            else
                warnings.push(`Line ${line}: no ${unit} figure, left out`);
            skipped++;
            continue;
        }
        snapshot.works.push(work("podcast", snapshot, `${title}|${date}`, title, date, durationSeconds(cells[col.duration]), metrics));
    }
    if (lifetimeOnly) {
        warnings.push(`${lifetimeOnly} episodes are older than 30 days and the file gives only all-time ${unit}, which cannot be tied to a first week or month, so they are left out. An export with first 7 and 30 day columns rates every episode.`);
    }
    if (format === "spotify_for_creators")
        warnings.push("Spotify counts plays and starts on Spotify only, not downloads in other apps. The rating treats them as this show's downloads for Spotify's share of listening.");
    return done(format, snapshot, skipped, warnings);
}
async function readSubstack(text, opts) {
    const read = await createSubstackExport({ clock: () => new Date(opts.exportedAt) }).readUpload({ content: text, platformAccountId: "upload.substack.com" });
    const { snapshot } = base("substack", opts, "Substack");
    const warnings = read.warnings.filter((w) => !/audience comes from the subscriber export/.test(w));
    for (const w of read.snapshot?.works ?? []) {
        const m = w.metrics;
        const metrics = {};
        if (m.recipients !== undefined)
            metrics.recipients = m.recipients;
        if (m.opens !== undefined)
            metrics.opens = m.opens;
        if (m.clicks !== undefined)
            metrics.clicks = m.clicks;
        if (m.newPaidSubscribers !== undefined)
            metrics.new_paid = m.newPaidSubscribers;
        if (m.newFreeSubscribers !== undefined)
            metrics.new_free = m.newFreeSubscribers;
        snapshot.works.push(work("substack", snapshot, w.platformId ?? `${w.title}|${w.publishedAt}`, w.title, w.publishedAt.slice(0, 10), 0, metrics));
    }
    const skipped = warnings.filter((w) => /^Line \d+/.test(w)).length;
    return done("substack_posts", snapshot, skipped, warnings);
}
function work(kind, snapshot, key, title, date, durationSec, metrics) {
    return { id: workIdFor(kind, `${snapshot.account.platformId}|${key}`), accountId: snapshot.account.id, kind, title, publishedAt: `${date}T12:00:00.000Z`, durationSec, metrics, platformId: key };
}
function done(format, snapshot, skipped, warnings) {
    const info = EXPORT_FORMATS.find((f) => f.format === format);
    if (!snapshot.account.audience)
        warnings.push("No audience given, so parts measured against your followers or subscribers cannot be judged fairly. Add it and rate again.");
    return { format, label: info.label, kind: info.kind, snapshot, used: snapshot.works.length, skipped, warnings };
}
/** Reads a creator's own export into a snapshot for the rating. Throws InvalidInputError when the file is not one we know. */
export async function readCreatorExport(text, opts) {
    if (!Number.isFinite(Date.parse(opts.exportedAt)))
        throw new InvalidInputError("The export date is not a date");
    const table = parseCsv(text);
    const format = opts.format ?? detectCreatorExport(table.header);
    if (!format)
        throw new InvalidInputError("We do not recognise this file. It should be a YouTube Studio, Substack, Spotify for Creators or podcast host export with a header row.");
    if (format === "youtube_studio")
        return readYouTube(table, opts);
    if (format === "substack_posts")
        return readSubstack(text, opts);
    return readPodcast(table, opts, format);
}
