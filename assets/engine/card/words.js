export const WORDS = {
    youtube: { platform: "YouTube", label: "YouTube channel", peers: "channels", audience: "subscribers", work: "upload", works: "uploads", one: "channel" },
    substack: { platform: "Substack", label: "Substack newsletter", peers: "newsletters", audience: "subscribers", work: "issue", works: "issues", one: "newsletter" },
    twitch: { platform: "Twitch", label: "Twitch channel", peers: "streamers", audience: "followers", work: "stream", works: "streams", one: "streamer" },
    podcast: { platform: "Podcast", label: "Podcast", peers: "shows", audience: "followers", work: "episode", works: "episodes", one: "show" },
    photography: { platform: "Photography", label: "Photographer", peers: "photographers", audience: "followers", work: "photo set", works: "photo sets", one: "photographer" },
};
/** Falls back to neutral words for a kind the card has not met, so a new kind still draws. */
export const wordsFor = (kind) => WORDS[kind] ?? { platform: "Creator", label: "Creator", peers: "creators", audience: "followers", work: "piece of work", works: "pieces of work", one: "creator" };
/**
  "Against newsletters with 10k to 50k subscribers." The rating's size band
  labels read "10k to 50k", "Under 10k" or "Over 5M".
*/
export function againstLine(kind, sizeBand) {
    const w = wordsFor(kind);
    const band = sizeBand.trim();
    if (!band)
        return `Against ${w.peers} your size.`;
    const under = /^under\s+(.+)$/i.exec(band);
    if (under)
        return `Against ${w.peers} under ${under[1]} ${w.audience}.`;
    const over = /^over\s+(.+)$/i.exec(band);
    if (over)
        return `Against ${w.peers} over ${over[1]} ${w.audience}.`;
    // A band that already names its audience ("250k to 1M subscribers") is not doubled.
    const named = band.toLowerCase().endsWith(w.audience) ? band : `${band} ${w.audience}`;
    return `Against ${w.peers} with ${named}.`;
}
