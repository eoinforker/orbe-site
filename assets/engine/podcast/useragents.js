/*
  User agents: which requests come from bots, and which app a listener used.
  The patterns follow the shape of the community-maintained OPAWG podcast
  user agent list (github.com/opawg/user-agents), written here as data so
  they can be replaced with that list wholesale. They are our own reading of
  common user agents and need checking against real logs before launch:
  provisional, like every constant in this module.
*/
/**
  Bots and feed fetchers. A feed parser fetching an enclosure to read its
  length is not a listener. Order does not matter: any match is a bot.
*/
export const BOT_PATTERNS = [
    /bot\b|bot\/|crawler|spider|crawl\b|slurp|archiver/i,
    /^$/,
    /^-$/,
    /curl\/|wget\/|python-requests|python-urllib|aiohttp|go-http-client|java\/|libwww-perl|httpclient|axios\/|node-fetch|undici|got \(|okhttp\/[0-2]\./i,
    /facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|embedly|skypeuripreview/i,
    /feed ?parser|feedfetcher|feedburner|feedly|newsblur|inoreader|podcast ?sync|podnews|podchaser|podscribe|listennotes|chartable|rephonic|podcastindex|podcast index/i,
    /itms|itunesstored|ipodder|apple-podcasts-crawler|podcasts-crawler/i,
    /headlesschrome|phantomjs|lighthouse|pingdom|uptimerobot|statuscake|monitor\b/i,
];
/** First match wins, so specific apps come before the players and browsers they are built on. */
export const APP_RULES = [
    { app: "Apple Podcasts", pattern: /^Podcasts\/|^Balados\/|^Podcasti\/|^Podcast\/\d|AppleCoreMedia\/.*\((?:iPhone|iPad|iPod)|^atc\/|watchOS/i },
    { app: "Spotify", pattern: /Spotify\//i },
    { app: "Overcast", pattern: /Overcast\//i },
    { app: "Pocket Casts", pattern: /Pocket ?Casts/i },
    { app: "Castro", pattern: /Castro/i },
    { app: "Podcast Addict", pattern: /PodcastAddict/i },
    { app: "Castbox", pattern: /CastBox/i },
    { app: "Podbean", pattern: /Podbean/i },
    { app: "YouTube Music", pattern: /youtube\.music|YouTubeMusic/i },
    { app: "Amazon Music", pattern: /AmazonMusic|Amazon Music/i },
    { app: "Alexa", pattern: /AlexaMediaPlayer|Echo\/|Alexa/i },
    { app: "iHeartRadio", pattern: /iHeart/i },
    { app: "Player FM", pattern: /Player ?FM/i },
    { app: "AntennaPod", pattern: /AntennaPod/i },
    { app: "Fountain", pattern: /Fountain\//i },
    { app: "Podverse", pattern: /Podverse/i },
    { app: "Goodpods", pattern: /Goodpods/i },
    { app: "Snipd", pattern: /Snipd/i },
    { app: "Deezer", pattern: /Deezer/i },
    { app: "Audible", pattern: /Audible/i },
    { app: "Pandora", pattern: /Pandora/i },
    { app: "Downcast", pattern: /Downcast/i },
    { app: "Podkicker", pattern: /Podkicker/i },
    { app: "BeyondPod", pattern: /BeyondPod/i },
    { app: "Sonos", pattern: /Sonos/i },
    { app: "Google Podcasts", pattern: /GSA\/|Google-Podcast/i },
    { app: "Apple Podcasts", pattern: /AppleCoreMedia/i },
    { app: "Web browser", pattern: /Mozilla\/5\.0.*(Chrome|Safari|Firefox|Edg)\//i },
];
export const isBot = (ua) => {
    const t = (ua ?? "").trim();
    return BOT_PATTERNS.some((p) => p.test(t));
};
export function appOf(ua) {
    const t = ua ?? "";
    return APP_RULES.find((r) => r.pattern.test(t))?.app ?? "Other";
}
export function platformOf(ua) {
    const t = ua ?? "";
    if (/watchOS|^atc\//i.test(t))
        return "watch";
    if (/iPhone|iPad|iPod|\biOS\b|CFNetwork.*Darwin\/2\d/i.test(t))
        return "ios";
    if (/Android|Dalvik/i.test(t))
        return "android";
    if (/Macintosh|Mac OS X|macOS/i.test(t))
        return "mac";
    if (/Windows/i.test(t))
        return "windows";
    if (/Sonos|Echo\/|Alexa|HomePod/i.test(t))
        return "speaker";
    return "other";
}
