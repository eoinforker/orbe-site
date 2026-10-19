/*
  The made-up creators a newcomer can pick from ("someone like me"), and the
  words each kind of creator uses. Every one is invented: the names, the
  titles and every number, which the Orbe engine generates from a fixed seed
  and rates live. None is, or is meant to suggest, a real creator.

  To add one: give it a kind the engine rates (youtube, substack, twitch,
  podcast, photography), the engine's fixture settings (o), a line in its own
  voice, and a few titles, newest first. Copy lives here so it can be swapped
  without touching the studio.
*/

/* How each kind of creator talks about their own numbers. */
export const VOICE = {
  youtube: { kind: "channel", peers: "channels", aud: "subs", audLong: "subscribers", unit: "views", work: "video", works: "videos", short: "Short", platform: "YouTube",
    eng: (pct, cmp) => `Likes and comments came to ${pct} of views, ${cmp}.`, hours: "hours of video" },
  substack: { kind: "newsletter", peers: "newsletters", aud: "subscribers", audLong: "subscribers", unit: "opens", work: "letter", works: "letters", platform: "Substack",
    eng: (pct, cmp) => `${pct} of the people it went to opened it, ${cmp}. Apple Mail inflates opens for everyone, so treat this one gently.`, hours: null },
  twitch: { kind: "stream", peers: "streams", aud: "followers", audLong: "followers", unit: "concurrents", work: "stream", works: "streams", platform: "Twitch",
    eng: null, hours: "hours live" },
  podcast: { kind: "podcast", peers: "podcasts", aud: "followers", audLong: "followers", unit: "downloads", work: "episode", works: "episodes", platform: "your podcast host",
    eng: null, hours: "hours of audio" },
  photography: { kind: "portfolio", peers: "photographers", aud: "followers", audLong: "followers", unit: "saves", work: "frame", works: "frames", platform: "your portfolio",
    eng: null, hours: null },
};

export const PEOPLE = [
  {
    id: "field", kind: "youtube", title: "Field Recordings", handle: "@fieldrecordings", fromExamples: "channel",
    who: "Nature sound, long uploads", say: "Microphones in odd places at odd hours.",
    o: { audience: 412000, reach: 1.6, engagement: 1.6, hitEvery: 5, seed: 1 },
    titles: ["The marsh at 4am", "Rain on a tin roof, Skye", "Rookery at dusk", "Under the pier at Hastings", "Frost on the reed beds", "A beech wood in a gale", "Curlews over the Wash", "The last train out of Kemble", "Ice cracking on Loch Lomond", "Dawn chorus, mid Wales", "Shingle in an easterly", "Bees in the lime trees", "A thunderstorm comes up the valley", "Skylarks over Salisbury Plain", "Geese leaving the Solway", "Snow falling on a pine forest", "The tide fills Morecambe Bay", "Nightjars on the heath", "Inside a hollow oak", "Hail on a glasshouse", "Seals hauled out at Blakeney", "A brook after a week of rain", "Swifts over a market town", "Wind through a field of barley", "The quietest place in England"],
  },
  {
    id: "kettle", kind: "youtube", title: "Why the Kettle Sings", handle: "@whythekettlesings",
    who: "Science explainers", say: "Why the kettle sings, and other questions worth twelve minutes.",
    o: { audience: 186000, reach: 1.3, engagement: 1.4, hitEvery: 6, seed: 7 },
    titles: ["Why ice is slippery (nobody fully knows)", "The sound a kettle makes, slowed down", "How far can you see from a hill?", "Building a cloud in a bottle", "What a magnet actually does", "The maths of a perfect pancake flip", "Why the sky goes orange", "Can you hear a colour?", "The physics of a wobbly table", "Is glass a liquid? Settling it", "Counting every atom in a teaspoon", "Why bubbles are round", "The fastest thing in your kitchen", "How a fridge moves heat uphill", "Why your shower curtain attacks you", "Measuring the Earth with a stick", "The strange life of a candle flame", "How bees do geometry", "What happens inside a microwave", "The coldest place in your house", "Why toast lands butter side down", "How a bicycle stays up", "Sound you can see", "Why mirrors flip left and right", "The first experiment I ever filmed"],
  },
  {
    id: "diffs", kind: "youtube", title: "Ninety Second Diffs", handle: "@ninetyseconddiffs",
    who: "Coding in under a minute", say: "Shipped Tuesday, out of date by Friday. Worth it.",
    o: { audience: 64000, reach: 1.7, engagement: 1.1, hitEvery: 4, seed: 12, durationSec: 52 },
    titles: ["CSS has: in 50 seconds", "The one git command I use daily", "Regex you can actually read", "Stop writing for loops like this", "Dark mode in three lines", "Why your array sort is lying", "Async, explained with toast", "The fastest way to dedupe a list", "Flexbox centring, finally", "What a hash map really is", "Your first SQL join", "Debugging with one print", "Promises in 45 seconds", "Big O on a napkin", "Keyboard shortcuts I wish I knew", "The bug that cost me a weekend", "Recursion without tears", "Tabs or spaces, a ruling", "How the browser paints a page", "Write a CLI in a minute", "Linting is kindness", "Types catch this bug", "Binary search, visually", "Ship it: deploy in 40 seconds", "Hello, world (again)"],
  },
  {
    id: "stockpot", kind: "youtube", title: "Tuesday Stockpot", handle: "@tuesdaystockpot",
    who: "Home cooking, one pan, weeknights", say: "One pan, twenty minutes, and the washing up is your problem.",
    o: { audience: 31000, reach: 1.5, engagement: 1.7, hitEvery: 6, seed: 12 },
    titles: ["Leek and potato, the lazy way", "A tray bake for a Tuesday", "Proper gravy from the roasting tin", "Lentils that taste of something", "The omelette I make every Sunday", "Fish finger sandwich, upgraded", "Rice that does not stick", "Soup from whatever is left", "Crumble with the windfall apples", "Dal for four, under a fiver", "Bread with no kneading", "Sausage casserole, slow"],
  },
  {
    id: "shed", kind: "youtube", title: "The Shed at No. 9", handle: "@shedatno9",
    who: "A dad, a shed, weekend builds", say: "Filmed on a phone propped on a tin of screws. Sorry about the sound.",
    o: { audience: 2400, reach: 1.4, engagement: 2.1, hitEvery: 7, seed: 21 },
    titles: ["Fixing the wobbly workbench, finally", "Bird box number four (the good one)", "The kids' go-kart gets brakes", "Rescuing a rusty hand plane", "Shed roof versus November", "Making a step for my daughter", "A shelf for the seed trays", "Sharpening everything in the drawer", "First go at a dovetail", "The go-kart, part one", "Painting the shed door yellow", "Building a sawhorse from scraps", "A tour of the shed, such as it is", "Planter boxes for the allotment", "Fixing next door's gate", "The mitre saw I bought used", "A toy boat for the bath", "Clearing out the shed, finally", "Bench vice restoration", "Hooks for every tool", "The tiniest table", "Rain day: sorting screws", "My dad's old chisels", "Making a mallet", "Hello from the shed"],
  },
  {
    id: "night", kind: "twitch", title: "Night Shift", handle: "@nightshift", fromExamples: "stream",
    who: "Cosy games, late streams", say: "Farming sims and quiet chat after the kids are down.",
    o: { audience: 21000, reach: 2.6, engagement: 2.2, hitEvery: 5, seed: 38 },
    titles: ["Harvest festival, finally", "Building the second barn", "Chill fishing, no goals", "Winter run, day 1", "Chat names the new cat", "Late shift: decorating", "The mine, floor 60", "Cosy puzzle night", "Planting the orchard", "Community centre done", "Rainy day crafting", "Chat picks the crops", "Night market", "Moving the greenhouse", "Fishing derby", "New save, who dis", "Rebuilding the bridge", "Slow stream, big tea", "Pet day", "The quiet valley", "Getting the horse", "Autumn begins", "Sunday reset", "First stream of the season", "Testing the new mic"],
  },
  {
    id: "margin", kind: "substack", title: "Margin Notes", handle: "@marginnotes", fromExamples: "newsletter",
    who: "A weekly letter about books", say: "What I underlined this week, and why.",
    o: { audience: 24000, reach: 1.2, engagement: 1.5, hitEvery: 8, seed: 1 },
  },
  {
    id: "table", kind: "podcast", title: "The Long Table", handle: "@thelongtable", fromExamples: "podcast",
    who: "Conversations over dinner", say: "Two hours, one table, no agenda.",
    o: { audience: 14000, reach: 1, engagement: 1.3, hitEvery: 6, seed: 3 },
  },
  {
    id: "sixlegs", kind: "photography", title: "Six Legs Close", handle: "@sixlegsclose",
    who: "Macro insect photography", say: "Beetles up close, licensed to field guides.",
    o: { audience: 9000, reach: 1.3, engagement: 1.2, hitEvery: 5, seed: 5 },
    titles: ["Dew on a weevil", "Jumping spider, eye to eye", "Ladybird larvae on nettles", "The hoverfly that waited", "Shield bug in autumn", "Damselfly wings, backlit", "Ants carrying a petal", "Stag beetle at dusk", "Moth scales, very close", "Bumblebee asleep in a foxglove", "Lacewing on the window", "Rose chafer", "Spider silk at dawn", "Caddisfly case", "The green tiger beetle", "Cranefly portrait", "Leafhopper in the hedge", "Wasp nest paper", "Snail and its trail", "Grasshopper in the long grass", "Dragonfly at rest", "Woodlouse family", "Mayfly morning", "A beetle on my thumb", "First macro lens test"],
  },
  {
    id: "boxes", kind: "youtube", title: "Boxes in the Hallway", handle: "@boxesinthehallway",
    who: "A casual vlog, posted when it feels right", say: "Moving flats, one box at a time. Sorry I've been gone.",
    o: { audience: 7800, reach: 1.1, engagement: 1.8, hitEvery: 9, seed: 31 },
    titles: ["The new flat has a window seat", "Painting the hallway (badly)", "A Sunday with nowhere to be", "Unpacking the last box", "Finding the good chippy", "We bought a sofa off a stranger", "Moving day, the whole thing", "Saying bye to the old kitchen", "Packing the books", "A weekend in the rain", "Sorry I've been gone", "The plant situation", "My little desk tour", "Car boot finds", "First night in the new place", "Market morning", "Cooking for six with one pan", "A walk I do every week", "What I'd tell myself last year", "Birthday vlog", "Late train home", "Sorting the spare room", "Rainy window, cup of tea", "Hello, I'm back", "My first vlog, be kind"],
  },
  {
    id: "clips", kind: "youtube", title: "Second Controller Clips", handle: "@secondcontrollerclips",
    who: "Gaming clips and montages", say: "Hours of play, three clips worth keeping, one that did numbers.",
    o: { audience: 38000, reach: 1.5, engagement: 1.3, hitEvery: 4, seed: 44, durationSec: 41 },
    titles: ["The clutch nobody saw coming", "Patch day chaos", "Worst landing, best ending", "Duo queue disasters", "That one doorway", "Montage: September", "The 1v4 (I cried)", "New meta, old habits", "Speedrun attempt 37", "Collab night highlights", "When the lag hits", "The throw of the season", "Best of the VOD", "Random squad, perfect squad", "Low health, high hopes", "Montage: August", "Teaching my brother to play", "Every trick shot this week", "The bug that saved the round", "Rage quit compilation", "Ranked, finally", "Ten seconds of luck", "First clip that did numbers", "Practice mode at 2am", "Hello from the bedroom setup"],
  },
  {
    id: "touchline", kind: "youtube", title: "Touchline Sundays", handle: "@touchlinesundays",
    who: "Under elevens football, for the parents", say: "Highlights cut on Sunday night, for the squad and their families.",
    note: "Set as made for kids on YouTube, which turns off comments and personalised ads. Orbe never shows a child in its examples, and never suggests growing a channel built on other people's children.",
    o: { audience: 340, reach: 2.2, engagement: 0.9, hitEvery: 6, seed: 52 },
    titles: ["Cup run: the semi", "Mud, rain and a draw", "The goal from Sunday", "End of season awards", "Away day highlights", "Penalties (again)", "The comeback", "Tactics board: corners", "Training in the snow", "Home win, finally", "Tournament day", "Half term friendly", "Match day, all the goals", "The wet one", "Under elevens, week four", "First win of the season", "Pre-season kickabout", "The new kit", "Sports day special", "Last game of the year", "Saving the best for last", "The lads at the summer cup", "A cold one", "Muddy boots", "Our first highlights"],
  },
];

export const DEFAULT_PERSON = "field";
export const personById = (id) => PEOPLE.find((p) => p.id === id) ?? PEOPLE[0];
