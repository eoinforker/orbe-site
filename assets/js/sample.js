/*
  A made-up channel for the home page and for running without an API key.
  It is not a real creator; every number is generated from a fixed seed.
*/
const TITLES = [
    "I rebuilt a 1970s synth from a skip",
    "The cheapest studio that actually sounds good",
    "Why every film score uses this one chord",
    "I lived on a narrowboat for a winter",
    "Making a song in 24 hours with strangers",
    "The sound of London, recorded at 4am",
    "Testing every free reverb so you don't have to",
    "How a £30 microphone fooled a mastering engineer",
    "I asked 100 musicians the same question",
    "Restoring a piano nobody wanted",
    "The forgotten inventor of the drum machine",
    "Building a guitar out of a shipping pallet",
    "What I learned busking for a month",
    "A week with no screens, only tape",
    "Recording birdsong for a whole album",
    "The quietest room in Britain",
    "Can you hear the difference? (blind test)",
    "I made a beat from kitchen sounds",
    "Touring on a budget of £500",
    "The strangest instrument in the museum archive",
    "Mixing a song on headphones only",
    "My first gig, twelve years later",
    "Fixing the worst sounding pub stage",
    "Synth shopping in Tokyo with £200",
    "How sampling actually works",
    "I wrote a song a day for a month",
    "The lost tapes in my dad's loft",
    "Building a home studio in a shed",
    "Every sound in this video is me",
    "Learning cello at 30: month one",
];
function rng(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}
/** Fixed, so the sample reads the same on the server and in the browser. */
export const SAMPLE_NOW = Date.parse("2026-10-18T12:00:00Z");
export function sampleChannel(now = SAMPLE_NOW) {
    const r = rng(7);
    const subs = 412_000;
    const uploads = TITLES.map((title, i) => {
        const ageDays = 3 + i * 6.2 + r() * 2;
        const base = 52_000 * (1 + (TITLES.length - i) / 60);
        const hit = i === 4 ? 4.6 : i === 11 ? 3.1 : i === 1 ? 2.4 : 1;
        const noise = Math.exp((r() - 0.5) * 0.9);
        const grown = 1 - Math.exp(-ageDays / 9);
        const views = Math.round(base * hit * noise * grown);
        return {
            id: `sample-${i}`,
            title,
            publishedAt: new Date(now - ageDays * 864e5).toISOString(),
            durationSec: i % 7 === 3 ? 58 : 600 + Math.round(r() * 900),
            views,
            likes: Math.round(views * (0.034 + r() * 0.018)),
            comments: Math.round(views * (0.0022 + r() * 0.002)),
            thumb: "",
        };
    });
    return {
        sample: true,
        channel: {
            id: "sample",
            handle: "@fieldrecordings",
            title: "Field Recordings",
            avatar: "",
            subscribers: subs,
            views: 61_400_000,
            videoCount: 214,
            publishedAt: "2017-03-02T00:00:00Z",
            country: "GB",
        },
        uploads,
    };
}
