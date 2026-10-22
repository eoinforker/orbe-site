/*
  The installed app's service worker. scripts/build-app.mjs writes it into
  the build with its version and the files to keep (the two
  placeholders below); the source app never registers it, so development is
  as it was.

  What it does, and no more:
  - The app's page opens from the cache at once, and is checked against the
    server in the background (stale while revalidate), so a warm open waits
    on nothing. A new build installs beside the old one and waits until the
    person accepts it (the "new version" line), then the page reloads.
  - Hashed files (/orbe-site/demo/app/c/, /app/a/) never change, so they are kept for good
    once fetched; other app files (art, icons) are shown from the cache and
    refreshed behind.
  - The console's first call, GET /v1/boot, is the only API answer kept, for
    ten minutes, for the person signed in: shown at once, read again behind,
    and the page told if it changed. Any write, a sign-out or a 401 forgets
    it. Offline, the last one (up to a day old) is shown with the offline line.
  - Push: shows the notification Orbe sent, and a tap opens the right screen.
*/
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `orbe-shell-${VERSION}`;
const ASSETS = "orbe-assets";
const DATA = "orbe-data";
const PAGE = "/orbe-site/demo/app/";
const BOOT_FRESH_MS = 10 * 60_000;
const BOOT_OFFLINE_MS = 24 * 60 * 60_000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll([new Request(PAGE, { cache: "no-cache" }), ...PRECACHE.map((u) => new Request(u, { cache: "no-cache" }))]);
      // The first install has nothing to replace: take over at once. Later ones wait for the person (see "message").
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("orbe-shell-") && k !== SHELL) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const t = event.data?.type;
  if (t === "skip-waiting") self.skipWaiting();
  else if (t === "signed-out") event.waitUntil(caches.delete(DATA));
});

const isAppPage = (url) => (url.pathname === "/orbe-site/demo/app" || url.pathname.startsWith("/orbe-site/demo/app/")) && !/\.[a-z0-9]+$/i.test(url.pathname);
const isBoot = (url) => url.pathname === "/v1/boot" && url.searchParams.get("frame") !== "0";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.method !== "GET") {
    // A write may change what the kept boot says (a team switch, a sign-in, a sign-out): forget it.
    if (url.pathname.startsWith("/v1/")) event.waitUntil(caches.delete(DATA));
    return;
  }
  if (req.mode === "navigate" && isAppPage(url)) return event.respondWith(page(event));
  if (url.pathname === "/orbe-site/demo/app/sw.js") return;
  if (url.pathname.startsWith("/orbe-site/demo/app/c/") || url.pathname.startsWith("/orbe-site/demo/app/a/")) return event.respondWith(kept(req));
  if (url.pathname.startsWith("/orbe-site/demo/app/")) return event.respondWith(refreshed(event, req));
  if (isBoot(url)) return event.respondWith(boot(event, req));
  // Any other API answer goes to the network as it is; a 401 still means the kept boot is no one's.
  if (url.pathname.startsWith("/v1/")) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.status === 401) caches.delete(DATA);
        return res;
      }),
    );
  }
});

/** The app's one page: from the cache at once, refreshed behind; offline with nothing kept, a calm page. */
async function page(event) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(PAGE);
  const fresh = fetch(new Request(PAGE, { cache: "no-cache", credentials: "same-origin" }))
    .then(async (res) => {
      if (res.ok) await cache.put(PAGE, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(fresh);
    return hit;
  }
  return (await fresh) ?? offline();
}

/** A hashed file: kept for good once fetched. */
async function kept(req) {
  const hit = (await caches.match(req)) ?? null;
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(ASSETS)).put(req, res.clone());
  return res;
}

/** Another app file (art, icons): the kept copy at once, a fresh one fetched behind. */
async function refreshed(event, req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(fresh);
    return hit;
  }
  return (await fresh) ?? new Response("", { status: 504 });
}

const stamp = async (res) => {
  const body = await res.clone().arrayBuffer();
  const headers = new Headers(res.headers);
  headers.set("x-orbe-kept-at", String(Date.now()));
  return { kept: new Response(body, { status: res.status, statusText: res.statusText, headers }), body };
};
const ageOf = (res) => Date.now() - Number(res.headers.get("x-orbe-kept-at") ?? 0);
const same = (a, b) => a.byteLength === b.byteLength && new Uint8Array(a).every((x, i) => x === new Uint8Array(b)[i]);

/** The console's first call: a recent copy at once and the network behind, or the network with the copy as a fallback offline. */
async function boot(event, req) {
  const cache = await caches.open(DATA);
  const hit = await cache.match(req);
  const network = fetch(req).then(async (res) => {
    if (res.status === 401) {
      await caches.delete(DATA);
      return { res, changed: true };
    }
    if (!res.ok) return { res, changed: false };
    const { kept: copy, body } = await stamp(res);
    const before = hit ? await hit.clone().arrayBuffer() : null;
    await cache.put(req, copy);
    return { res, changed: !before || !same(before, body) };
  });
  if (hit && ageOf(hit) < BOOT_FRESH_MS) {
    event.waitUntil(
      network
        .then(async ({ changed }) => {
          if (!changed) return;
          for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage({ type: "boot-changed" });
        })
        .catch(() => {}),
    );
    return hit;
  }
  try {
    return (await network).res;
  } catch {
    if (hit && ageOf(hit) < BOOT_OFFLINE_MS) {
      const headers = new Headers(hit.headers);
      headers.set("x-orbe-offline", "1");
      return new Response(await hit.arrayBuffer(), { status: 200, headers });
    }
    throw new TypeError("offline");
  }
}

function offline() {
  return new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline: Orbe</title><meta name="color-scheme" content="dark light"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141311;color:#F3F0E8;font:16px/1.5 system-ui,sans-serif}@media (prefers-color-scheme:light){body{background:#F3F0E8;color:#141311}}main{max-width:28rem;padding:24px}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 16px;opacity:.8}a{color:inherit}</style></head><body><main><h1>You are offline</h1><p>Orbe needs a connection the first time it opens on this device. Once it has, it opens here even without one.</p><p><a href="/orbe-site/demo/app/">Try again</a></p></main></body></html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

/* ------------------------------------------------------------------ push */

self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = { title: "Orbe", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(m.title ?? "Orbe", {
      body: m.body ?? "",
      tag: m.tag ?? "orbe",
      data: { url: m.url ?? "/orbe-site/demo/app/" },
      icon: "/orbe-site/demo/app/icons/icon-192.png",
      badge: "/orbe-site/demo/app/icons/maskable-192.png",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/orbe-site/demo/app/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = wins.find((w) => new URL(w.url).pathname.startsWith("/orbe-site/demo/app"));
      if (open) {
        await open.focus();
        open.postMessage({ type: "open", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
