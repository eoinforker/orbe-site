/*
  The static demo's API: the console's requests to /v1 are answered in the
  browser from recordings of the real API (scripts/build-demo.mjs), so the
  real console runs on GitHub Pages with nothing behind it. Who you are is
  kept in localStorage ("orbe-demo:persona"), and what you change (stars,
  collections, notes, tool runs, the walkthrough, approvals, offers, team
  roles) is kept there too, in this browser only. Anything that needs the
  live server answers with a calm "needs the live console" instead.

  Loaded as a plain script before the console's modules, with
  window.ORBE_DEMO_BASE set to where the demo is served.
*/
(function () {
  "use strict";
  var BASE = window.ORBE_DEMO_BASE || "/demo";
  var APP = BASE + "/app";
  var PREFIX = "orbe-demo:";
  var LIVE = "This is a demo: that needs the live console. Everything else here works.";
  var EXPORT = "This is a demo: exports are built by the live console from your own data, so there is no file to download here.";
  /* Exports (CSV, transcripts, drafts, a work's record) are never replayed: each real file carries its own export id. */
  function isExport(url) {
    var f = url.searchParams.get("format");
    return /\/exports?(\/|$)/.test(url.pathname) || (f && f !== "json");
  }

  /* A deep link opened directly arrives through the site's 404 page as ?__p=. */
  try {
    var q = new URLSearchParams(location.search);
    var p = q.get("__p");
    if (p && p.indexOf(APP) === 0) history.replaceState(null, "", p);
  } catch (e) {}

  function load(k) { try { var v = localStorage.getItem(PREFIX + k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } }
  function save(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(PREFIX + k); else localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} }
  function resetAll() { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) {} }

  var realFetch = window.fetch.bind(window);
  var people = null;
  var data = {};
  var persona = load("persona");
  var state = null;

  function getPeople() {
    if (people) return Promise.resolve(people);
    return realFetch(BASE + "/data/people.json").then(function (r) { return r.json(); }).then(function (x) { people = x; return x; });
  }
  function getData(id) {
    if (data[id]) return Promise.resolve(data[id]);
    return realFetch(BASE + "/data/" + id + ".json").then(function (r) { return r.json(); }).then(function (x) { data[id] = x; return x; });
  }
  function st() {
    if (!state || state.who !== persona) {
      state = load("state:" + persona) || { who: persona, overlay: {}, runs: [], seq: 0 };
      state.who = persona;
    }
    return state;
  }
  function keep() { if (persona) save("state:" + persona, state); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

  function keyOf(method, url) {
    var pairs = [];
    url.searchParams.forEach(function (v, k) { pairs.push([k, v]); });
    pairs.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var qs = new URLSearchParams(pairs).toString();
    return method + " " + url.pathname + (qs ? "?" + qs : "");
  }

  /* The recorded answer for a request, or one for the same path with other query values. */
  function recorded(rec, method, url) {
    var key = keyOf(method, url);
    if (rec[key]) return { key: key, entry: pick(rec[key], method, url) };
    var path = method + " " + url.pathname;
    if (rec[path]) return { key: path, entry: pick(rec[path], method, url) };
    var keys = Object.keys(rec).filter(function (k) { return k === path || k.indexOf(path + "?") === 0; });
    if (keys.length) return { key: keys[0], entry: pick(rec[keys[0]], method, url) };
    return null;
  }
  function pick(list, method, url) {
    if (method === "GET" && url.pathname === "/v1/auth/session") {
      for (var i = 0; i < list.length; i++) if (list[i].body && list[i].body.user) return list[i];
    }
    return list[0];
  }

  function reply(status, body, headers) {
    var h = new Headers(headers || { "content-type": "application/json" });
    if (status === 204) return new Response(null, { status: 204 });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: status, headers: h });
  }
  function live(status, quiet) {
    if (!quiet) toast(LIVE);
    return reply(status || 503, { error: { code: "demo", message: LIVE } });
  }

  /* Walks every recorded answer this person has (and the overlays) and changes what matches. */
  function patchAll(rec, test, change) {
    var s = st();
    Object.keys(rec).forEach(function (k) {
      if (k.indexOf("GET ") !== 0) return;
      var body = s.overlay[k] ? s.overlay[k] : clone(rec[k][0] && rec[k][0].body);
      if (!body || typeof body !== "object") return;
      var hit = false;
      (function walk(o) {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) { o.forEach(walk); return; }
        if (test(o)) { change(o); hit = true; }
        Object.keys(o).forEach(function (x) { walk(o[x]); });
      })(body);
      if (hit) s.overlay[k] = body;
    });
  }
  function current(rec, key) {
    var s = st();
    if (s.overlay[key]) return s.overlay[key];
    return rec[key] ? clone(rec[key][0].body) : null;
  }
  function setGet(key, body) { st().overlay[key] = body; }

  /* ---------------------------------------------------------------- answers */

  function signedOutSession() {
    return getData("ada").then(function (rec) {
      var list = rec["GET /v1/auth/session"] || [];
      var out = null;
      for (var i = 0; i < list.length; i++) if (list[i].body && !list[i].body.user) { out = clone(list[i].body); break; }
      out = out || { user: null, csrfToken: null, features: [] };
      out.signIn = { google: true, email: true, dev: true };
      return reply(200, out);
    });
  }

  function signInAs(id) {
    persona = id;
    state = null;
    save("persona", id);
  }
  function personaFor(email, as) {
    var e = String(email || "").toLowerCase();
    var found = (people || []).filter(function (p) { return p.email === e; })[0];
    if (found) return found.id;
    return as === "buyer" ? "oats" : "new";
  }

  function answer(method, url, body) {
    var path = url.pathname;
    if (method === "GET" && isExport(url)) return reply(503, { error: { code: "demo", message: EXPORT } });
    // Signing in and out.
    if (path === "/v1/auth/dev" || path === "/v1/auth/magic-link") {
      return getPeople().then(function () {
        var id = personaFor(body && body.email, body && body.as);
        if (id === "new") save("state:new", null);
        signInAs(id);
        if (path === "/v1/auth/magic-link") {
          toast("Demo: no email needed, you are signed in.");
          setTimeout(function () { location.assign(APP + "/"); }, 700);
          return reply(202, { sent: true });
        }
        return reply(200, { ok: true });
      });
    }
    if (path === "/v1/auth/logout") { signInAs(null); return Promise.resolve(reply(204)); }
    if (!persona) {
      if (method === "GET" && path === "/v1/auth/session") return signedOutSession();
      if (method === "GET" && path.indexOf("/v1/teams/invitations/") === 0) return Promise.resolve(live(404));
      return Promise.resolve(reply(401, { error: { code: "unauthenticated", message: "Sign in first." } }));
    }
    // Rating any channel needs YouTube's key; the demo rates the pasted handle with Ada's made-up figures.
    if (method === "GET" && path.indexOf("/v1/rate/youtube/") === 0) {
      return getData("ada").then(function (ada) {
        var own = ada["GET /v1/me/rating"] && ada["GET /v1/me/rating"][0].body;
        var rated = own && (own.ratings || []).filter(function (r) { return r.result && r.result.status === "rated"; })[0];
        if (!rated) return live(503, true);
        var handle = decodeURIComponent(path.split("/").pop());
        return reply(200, { account: { handle: handle, title: handle + " (demo figures)" }, result: rated.result, demo: true });
      });
    }
    return getData(persona).then(function (rec) {
      var s = st();
      if (method === "GET" && path === "/v1/boot") return bootAnswer(rec, url);
      var handled = handle(rec, method, url, body);
      if (handled) { keep(); return handled; }
      if (method === "GET") {
        var key = keyOf(method, url);
        if (s.overlay[key]) return reply(200, s.overlay[key]);
        var r = recorded(rec, method, url);
        if (!r) { misses.push(keyOf(method, url)); return live(503, true); }
        if (s.overlay[r.key]) return reply(200, s.overlay[r.key]);
        if (r.entry.blob) return realFetch(BASE + "/data/files/" + r.entry.blob);
        return reply(r.entry.status, r.entry.body, { "content-type": r.entry.type || "application/json" });
      }
      // A write the recording has: answer as the API did, and let the screen read it back.
      var w = rec[keyOf(method, url)] || rec[method + " " + path];
      if (w) {
        var e = w[0];
        overlayFrom(rec, path, e.body);
        keep();
        return reply(e.status, e.body);
      }
      misses.push(keyOf(method, url));
      return live(503);
    });
  }

  /* A write's answer shares keys with the screen's own read: show it on the next read. */
  function overlayFrom(rec, path, out) {
    if (!out || typeof out !== "object" || Array.isArray(out)) return;
    var key = "GET " + path;
    var base = current(rec, key);
    if (!base || typeof base !== "object") return;
    var shared = Object.keys(out).filter(function (k) { return k in base; });
    if (!shared.length) return;
    shared.forEach(function (k) { base[k] = out[k]; });
    setGet(key, base);
  }

  function now() { return new Date().toISOString(); }
  function id(prefix) { var s = st(); s.seq += 1; return prefix + "_demo" + Date.now().toString(36) + s.seq; }

  /* GET /v1/boot: the recorded boot for this screen tells which parts it carries; each part is answered as its own request would be now. */
  function bootFor(rec, url) {
    var sp = url.searchParams;
    var screen = sp.get("screen");
    var keys = Object.keys(rec).filter(function (k) { return k.indexOf("GET /v1/boot") === 0; });
    // The recording starts signed out; a screen never recorded borrows a signed-in boot, never the sign-in page's.
    var signedIn = function (k) { var b = rec[k][0].body; return b && b.session && b.session.user; };
    if (keys.some(signedIn)) keys = keys.filter(signedIn);
    var exact = keyOf("GET", url);
    var pick = function (test) { for (var i = 0; i < keys.length; i++) if (test(new URL(keys[i].slice(4), location.origin).searchParams)) return keys[i]; return null; };
    var screenKey = rec[exact] ? exact : screen ? pick(function (q) { return q.get("screen") === screen; }) : null;
    var frameKey = pick(function (q) { return !q.get("screen"); }) || pick(function (q) { return q.get("frame") !== "0"; });
    var targets = [];
    var add = function (k) { var b = k && rec[k] && rec[k][0].body; if (b && b.parts) Object.keys(b.parts).forEach(function (t) { if (targets.indexOf(t) < 0) targets.push(t); }); return b; };
    var base = add(screenKey);
    if (sp.get("frame") !== "0") add(frameKey);
    base = base || (frameKey && rec[frameKey][0].body) || { session: null, parts: {}, screens: [] };
    return { base: base, targets: targets, recorded: function (t) {
      var all = [screenKey, frameKey].filter(Boolean);
      for (var i = 0; i < all.length; i++) { var b = rec[all[i]][0].body; if (b && b.parts && b.parts[t]) return b.parts[t]; }
      return null;
    } };
  }
  function bootAnswer(rec, url) {
    var b = bootFor(rec, url);
    var s = st();
    var parts = {};
    var jobs = b.targets.map(function (t) {
      var u = new URL(t, location.origin);
      var res = handle(rec, "GET", u, undefined);
      var key = keyOf("GET", u);
      if (!res && s.overlay[key]) { parts[t] = { status: 200, body: clone(s.overlay[key]) }; return null; }
      if (!res) { var r = b.recorded(t); if (r) parts[t] = clone(r); return null; }
      return Promise.resolve(res).then(function (x) { return x.status === 204 ? null : x.json(); }).then(function (body) {
        parts[t] = body && body.error ? { status: 400, error: body.error } : { status: 200, body: body };
      }).catch(function () { var r = b.recorded(t); if (r) parts[t] = clone(r); });
    });
    return Promise.all(jobs).then(function () {
      keep();
      var sess = rec["GET /v1/auth/session"] && pick(rec["GET /v1/auth/session"], "GET", new URL("/v1/auth/session", location.origin));
      return reply(200, { session: (sess && sess.body) || b.base.session, parts: parts, screens: b.base.screens || [] });
    });
  }

  /* The Library table (GET /v1/me/works?table=1): sorted, filtered and paged here, from the fullest table the recording holds. */
  var BAND_OF = function (w) { return w.band || null; };
  function tableAnswer(rec, url) {
    var keys = Object.keys(rec).filter(function (k) { return k.indexOf("GET /v1/me/works?") === 0 && k.indexOf("table=1") > 0; });
    if (!keys.length) return null;
    keys.sort(function (a, b) { return ((current(rec, b).works || []).length) - ((current(rec, a).works || []).length); });
    var full = current(rec, keys[0]);
    if (!full || !full.works) return null;
    var sp = url.searchParams;
    var list = full.works.slice();
    var f = function (k) { return sp.get(k); };
    if (f("favourites") === "1") list = list.filter(function (w) { return w.favourite; });
    if (f("kind")) list = list.filter(function (w) { return w.kind === f("kind"); });
    if (f("collection")) list = list.filter(function (w) { return (w.collections || []).indexOf(f("collection")) >= 0; });
    if (f("account")) list = list.filter(function (w) { return w.account && w.account.id === f("account"); });
    if (f("band")) list = list.filter(function (w) { return BAND_OF(w) === f("band"); });
    if (f("sponsor") === "1") list = list.filter(function (w) { return !!w.sponsor; });
    if (f("fix")) list = list.filter(function (w) { return f("fix") === "none" ? !w.fix : w.fix && w.fix.state === f("fix"); });
    if (f("from")) list = list.filter(function (w) { return String(w.publishedAt) >= f("from"); });
    if (f("to")) list = list.filter(function (w) { return String(w.publishedAt).slice(0, 10) <= f("to"); });
    if (f("q")) { var term = f("q").toLowerCase(); list = list.filter(function (w) { return String(w.title).toLowerCase().indexOf(term) >= 0; }); }
    var sort = f("sort") || "published";
    var dir = f("dir") === "asc" ? 1 : -1;
    var val = function (w) {
      switch (sort) {
        case "published": return w.publishedAt ? Date.parse(w.publishedAt) : null;
        case "title": return String(w.title || "").toLowerCase();
        case "kind": return w.kind;
        case "account": return w.account ? String(w.account.handle).toLowerCase() : null;
        case "reach": return w.reach ? w.reach.value : null;
        case "rating": return w.rating ? w.rating.rating : null;
        case "typical": return w.rating ? w.rating.multiple : null;
        case "fix": return w.fix ? w.fix.state : null;
        case "sponsor": return w.sponsor ? String(w.sponsor.brand).toLowerCase() : null;
        case "deals": return w.deals || null;
        case "clips": return w.clips || null;
        case "starred": return w.favourite ? 1 : 0;
        default: return null;
      }
    };
    list.sort(function (a, b) {
      var x = val(a), y = val(b);
      if (x === null && y === null) return String(a.id) < String(b.id) ? -1 : 1;
      if (x === null) return 1;
      if (y === null) return -1;
      if (x === y) return String(a.id) < String(b.id) ? -1 : 1;
      return (x < y ? -1 : 1) * dir;
    });
    var off = 0;
    var c = f("cursor");
    if (c && c.indexOf("demo:") === 0) off = Number(c.slice(5)) || 0;
    var lim = Number(f("limit") || 200);
    var out = clone(full);
    out.works = list.slice(off, off + lim);
    out.total = list.length;
    out.limit = lim;
    out.sort = sort;
    out.dir = dir > 0 ? "asc" : "desc";
    out.cursor = off + lim < list.length ? "demo:" + (off + lim) : null;
    var rated = list.filter(function (w) { return w.rating && typeof w.rating.rating === "number"; });
    out.totals = Object.assign({}, full.totals || {}, {
      works: list.length,
      rated: rated.length,
      averageRating: rated.length ? Math.round(rated.reduce(function (n, w) { return n + w.rating.rating; }, 0) / rated.length * 1000) / 1000 : null,
      starred: list.filter(function (w) { return w.favourite; }).length,
      sponsorReads: list.filter(function (w) { return !!w.sponsor; }).length,
      clips: list.reduce(function (n, w) { return n + (w.clips || 0); }, 0),
      deals: full.totals && full.totals.deals === null ? null : list.reduce(function (n, w) { return n + (w.deals || 0); }, 0),
    });
    if (out.counts) out.counts.favourites = full.works.filter(function (w) { return w.favourite; }).length;
    var cols = current(rec, "GET /v1/me/collections");
    if (cols && cols.collections) out.collections = cols.collections;
    return reply(200, out);
  }

  function handle(rec, method, url, body) {
    var path = url.pathname;
    var m;
    // The walkthrough and the tour.
    if (path === "/v1/me/welcome") {
      var key = "GET /v1/me/welcome";
      var cur = current(rec, key) || { welcome: { steps: [], step: null, answers: {}, due: false, tourDue: false } };
      if (method === "GET") return reply(200, cur);
      var w = cur.welcome;
      body = body || {};
      if (body.step !== undefined) w.step = body.step;
      if (body.answers) { w.answers = w.answers || {}; Object.keys(body.answers).forEach(function (k) { w.answers[k] = body.answers[k]; }); }
      if (body.finished) { w.finishedAt = now(); w.due = false; if (!w.tourDoneAt) w.tourDue = true; }
      if (body.skipped) { w.skippedAt = now(); w.due = false; if (!w.tourDoneAt) w.tourDue = true; }
      if (body.tourDone) { w.tourDoneAt = now(); w.tourDue = false; }
      if (body.restart) { w.finishedAt = null; w.skippedAt = null; w.due = true; w.step = (w.steps || [])[0] || null; }
      setGet(key, cur);
      return reply(200, cur);
    }
    // The Library's list: every view, search and sort, from the full recording, with your stars and collections.
    if (path === "/v1/me/works" && method === "GET" && url.searchParams.get("table") === "1") return tableAnswer(rec, url);
    // Many works at once: star, unstar, add to or take from a collection.
    if (path === "/v1/me/works/bulk" && method === "POST") {
      var ids = (body && body.ids) || [];
      var act = body && body.action;
      ids.forEach(function (wid) {
        if (act === "star" || act === "unstar") patchAll(rec, function (o) { return o.id === wid && "favourite" in o; }, function (o) { o.favourite = act === "star"; });
        if ((act === "add" || act === "remove") && body.collection) patchAll(rec, function (o) { return o.id === wid && Array.isArray(o.collections); }, function (o) {
          o.collections = o.collections.filter(function (x) { return x !== body.collection; });
          if (act === "add") o.collections.push(body.collection);
        });
      });
      if ((act === "add" || act === "remove") && body.collection) {
        var cb = current(rec, "GET /v1/me/collections") || { collections: [] };
        cb.collections.forEach(function (c) { if (c.id === body.collection) c.count = Math.max(0, (c.count || 0) + (act === "add" ? ids.length : -ids.length)); });
        setGet("GET /v1/me/collections", cb);
      }
      return reply(200, { action: act, changed: ids.length });
    }
    if (path === "/v1/me/works" && method === "GET") {
      var fullKey = Object.keys(rec).filter(function (k) { return k.indexOf("GET /v1/me/works?") === 0 && rec[k][0].body && rec[k][0].body.counts; })[0] || Object.keys(rec).filter(function (k) { return k.indexOf("GET /v1/me/works?") === 0; })[0];
      if (!fullKey) return null;
      var full = current(rec, fullKey);
      if (!full || !full.works) return null;
      var list = full.works.slice();
      var sp = url.searchParams;
      if (sp.get("favourites") === "1" || sp.get("starred") === "1") list = list.filter(function (w) { return w.favourite; });
      if (sp.get("kind")) list = list.filter(function (w) { return w.kind === sp.get("kind"); });
      if (sp.get("collection")) list = list.filter(function (w) { return (w.collections || []).indexOf(sp.get("collection")) >= 0; });
      if (sp.get("q")) { var term = sp.get("q").toLowerCase(); list = list.filter(function (w) { return String(w.title).toLowerCase().indexOf(term) >= 0; }); }
      var sort = sp.get("sort") || "newest";
      list.sort(function (a, b) {
        if (sort === "oldest") return String(a.publishedAt).localeCompare(String(b.publishedAt));
        if (sort === "newest") return String(b.publishedAt).localeCompare(String(a.publishedAt));
        return ((b.rating && b.rating.rating) || -9) - ((a.rating && a.rating.rating) || -9);
      });
      var off = Number(sp.get("offset") || 0);
      var lim = Number(sp.get("limit") || 60);
      var out = clone(full);
      out.total = list.length;
      out.works = list.slice(off, off + lim);
      out.limit = lim;
      out.offset = off;
      if (out.counts) out.counts.favourites = full.works.filter(function (w) { return w.favourite; }).length;
      var cols = current(rec, "GET /v1/me/collections");
      if (cols && cols.collections && "collections" in out) out.collections = cols.collections;
      return reply(200, out);
    }
    // Starring a work.
    if ((m = path.match(/^\/v1\/me\/works\/([^/]+)\/favourite$/)) && method === "PUT") {
      var fav = !!(body && body.favourite);
      patchAll(rec, function (o) { return o.id === m[1] && "favourite" in o; }, function (o) { o.favourite = fav; });
      return reply(200, { workId: m[1], favourite: fav });
    }
    // Collections.
    if (path === "/v1/me/collections") {
      var ck = "GET /v1/me/collections";
      var cols = current(rec, ck) || { collections: [] };
      if (method === "GET") return reply(200, cols);
      if (method === "POST") {
        var c = { id: id("col"), name: String((body && body.name) || "A collection"), count: 0, createdAt: now() };
        cols.collections.push(c);
        setGet(ck, cols);
        return reply(201, { collection: c });
      }
    }
    if ((m = path.match(/^\/v1\/me\/collections\/([^/]+)\/works\/([^/]+)$/))) {
      var add = method === "PUT";
      var cols2 = current(rec, "GET /v1/me/collections") || { collections: [] };
      cols2.collections.forEach(function (c) { if (c.id === m[1]) c.count = Math.max(0, (c.count || 0) + (add ? 1 : -1)); });
      setGet("GET /v1/me/collections", cols2);
      patchAll(rec, function (o) { return o.id === m[2] && Array.isArray(o.collections); }, function (o) {
        o.collections = o.collections.filter(function (x) { return x !== m[1]; });
        if (add) o.collections.push(m[1]);
      });
      return reply(200, { collectionId: m[1], workId: m[2], added: add });
    }
    if ((m = path.match(/^\/v1\/me\/collections\/([^/]+)$/)) && (method === "DELETE" || method === "PATCH")) {
      var cols3 = current(rec, "GET /v1/me/collections") || { collections: [] };
      if (method === "DELETE") cols3.collections = cols3.collections.filter(function (c) { return c.id !== m[1]; });
      else cols3.collections.forEach(function (c) { if (c.id === m[1] && body && body.name) c.name = body.name; });
      setGet("GET /v1/me/collections", cols3);
      return reply(200, { ok: true });
    }
    // A work's notes, with versions.
    if ((m = path.match(/^\/v1\/me\/works\/([^/]+)\/notes$/))) {
      var nk = "GET " + path;
      var notes = current(rec, nk) || { versions: [], latest: null };
      if (method === "GET") return reply(200, notes);
      if (method === "PUT") {
        var v = (notes.versions.length ? notes.versions[0].version : 0) + 1;
        var text = String((body && body.body) || "");
        notes.versions.unshift({ version: v, createdAt: now(), chars: text.length });
        notes.latest = { version: v, body: text, createdAt: now() };
        save("note:" + persona + ":" + m[1] + ":" + v, notes.latest);
        setGet(nk, notes);
        return reply(200, { saved: true, versions: notes.versions, latest: notes.latest });
      }
    }
    if ((m = path.match(/^\/v1\/me\/works\/([^/]+)\/notes\/(\d+)$/)) && method === "GET") {
      var one = load("note:" + persona + ":" + m[1] + ":" + m[2]);
      if (one) return reply(200, one);
    }
    // Tool runs: the recording's run for the same tool, kept as yours.
    if (path === "/v1/runs") {
      var s = st();
      if (method === "POST") {
        var tool = body && body.tool;
        var runs = (rec["POST /v1/runs"] || []).filter(function (e) { return e.body && e.body.run && e.body.run.tool === tool; });
        if (!runs.length) return live(503);
        var run = clone(runs[0].body.run);
        run.id = id("run");
        run.at = now();
        run.job = { tool: tool, text: String((body && body.text) || ""), account: (body && body.account) || "all", window: (body && body.window) || "30" };
        s.runs.unshift(run);
        s.runs = s.runs.slice(0, 200);
        return reply(201, { run: run });
      }
      if (method === "GET") {
        var t = url.searchParams.get("tool");
        var lim = Number(url.searchParams.get("limit") || 50);
        var q = (url.searchParams.get("q") || "").toLowerCase();
        var r = recorded(rec, "GET", url);
        var base = r && r.entry.body && r.entry.body.runs ? r.entry.body.runs : [];
        var all = s.runs.concat(base).filter(function (x) { return (!t || x.tool === t) && (!q || JSON.stringify(x.job).toLowerCase().indexOf(q) >= 0); });
        return reply(200, { runs: all.slice(0, lim) });
      }
    }
    // The owner's approvals.
    if ((m = path.match(/^\/v1\/team\/approvals\/([^/]+)\/(approve|decline|cancel)$/)) && method === "POST") {
      var decided = null;
      var stateTo = m[2] === "approve" ? "approved" : m[2] === "decline" ? "declined" : "cancelled";
      Object.keys(rec).forEach(function (k) {
        if (k.indexOf("GET /v1/team/approvals") !== 0) return;
        var b = current(rec, k);
        if (!b || !b.approvals) return;
        b.approvals = b.approvals.filter(function (a) {
          if (a.id !== m[1]) return true;
          decided = Object.assign({}, a, { state: stateTo, decidedAt: now(), decidedBy: { name: "You" } });
          return k.indexOf("state=pending") < 0;
        }).map(function (a) { return a.id === m[1] ? decided : a; });
        setGet(k, b);
      });
      return reply(200, { approval: decided || { id: m[1], state: stateTo } });
    }
    // Answering an offer.
    if ((m = path.match(/^\/v1\/me\/sponsorships\/offers\/([^/]+)\/(accept|decline)$/)) && method === "POST") {
      var to = m[2] === "accept" ? "accepted" : "declined";
      var hit = null;
      patchAll(rec, function (o) { return o.id === m[1] && "state" in o; }, function (o) { o.state = to; o.answeredAt = now(); hit = o; });
      if (!hit) return null;
      return reply(200, { offer: hit });
    }
    // A member's role on the team.
    if ((m = path.match(/^\/v1\/team\/members\/([^/]+)$/)) && method === "PATCH") {
      var mem = null;
      patchAll(rec, function (o) { return o.id === m[1] && "role" in o; }, function (o) { if (body && body.role) o.role = body.role; if (body && "channels" in body) o.channels = body.channels; mem = o; });
      return reply(200, { member: mem || { id: m[1], role: body && body.role } });
    }
    // Notifications need the installed app and the live server.
    if (path.indexOf("/v1/me/push") === 0 && method !== "GET") return live(503);
    // Connecting a real platform, uploading, paying and sending need the live server.
    if (/\/connections\/[^/]+\/start$|\/sources\/[^/]+\/(connect|refresh|read)$|\/upload$|\/checkout$|\/fund$|\/send$|\/publish$|\/documents\/file$/.test(path) && method !== "GET") return live(503);
    return null;
  }

  /* ---------------------------------------------------------- the browser */

  window.fetch = function (input, init) {
    init = init || {};
    var url;
    try { url = new URL(typeof input === "string" ? input : input.url, location.href); } catch (e) { return realFetch(input, init); }
    if (url.origin !== location.origin || url.pathname.indexOf("/v1/") !== 0) return realFetch(input, init);
    var method = String(init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
    var body;
    if (typeof init.body === "string") { try { body = JSON.parse(init.body); } catch (e) { body = undefined; } }
    return getPeople().then(function () { return answer(method, url, body); }).then(function (res) {
      return new Promise(function (ok) { setTimeout(function () { ok(res); }, 90 + Math.random() * 120); });
    });
  };

  /* Links the console opens itself (records, exports, video): the recorded file, or a note. */
  var hrefs = {};
  var misses = [];
  window.orbeDemo = {
    href: function (path) {
      var url = new URL(path, location.origin);
      var rec = data[persona];
      if (rec && !isExport(url)) {
        var r = recorded(rec, "GET", url);
        if (r && r.entry.blob) return BASE + "/data/files/" + r.entry.blob;
      }
      hrefs[path] = true;
      return path;
    },
    reset: function () { resetAll(); location.href = BASE + "/"; },
    misses: misses,
  };
  // Make sure this person's recording is loaded before the console asks for files.
  if (persona) getData(persona);

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("/v1/auth/google/start") === 0) {
      e.preventDefault();
      var as = new URL(href, location.origin).searchParams.get("as");
      signInAs(as === "buyer" ? "oats" : "ada");
      toast("Demo: signed in without Google.");
      setTimeout(function () { location.assign(APP + "/"); }, 500);
      return;
    }
    if (href.indexOf("/v1/") === 0) { e.preventDefault(); toast(isExport(new URL(href, location.origin)) ? EXPORT : LIVE); }
  }, true);

  /* A calm note in the corner. */
  var toastEl = null;
  var toastTimer = null;
  function toast(text) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;max-width:min(92vw,520px);padding:12px 16px;border-radius:12px;background:#F3F0E8;color:#141311;font:500 14px/1.45 'Schibsted Grotesk',Arial,sans-serif;box-shadow:0 2px 4px rgba(0,0,0,.18),0 12px 32px rgba(0,0,0,.22);transition:opacity .2s;opacity:0";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = "0"; }, 4200);
  }

  /* The banner on every page, and the person switcher in the account menu. */
  function mark() {
    if (document.getElementById("orbe-demo-strip")) return;
    var strip = document.createElement("div");
    strip.id = "orbe-demo-strip";
    strip.style.cssText = "position:relative;z-index:30;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;padding:6px 16px;background:#94E6FF;color:#141311;font:500 12.5px/1.4 'Commit Mono',ui-monospace,monospace;text-align:center";
    var t = document.createElement("span");
    t.textContent = "Demo: made-up data, nothing leaves your browser";
    var sw = document.createElement("a");
    sw.href = BASE + "/";
    sw.textContent = "Switch person";
    sw.style.cssText = "color:#0E2AAE;text-decoration:underline;text-underline-offset:3px";
    strip.append(t, sw);
    document.body.insertBefore(strip, document.body.firstChild);
    new MutationObserver(function () {
      var menu = document.querySelector(".cn-menu--account");
      if (!menu || menu.querySelector("[data-demo]")) return;
      var box = document.createElement("div");
      box.setAttribute("data-demo", "");
      box.style.cssText = "display:flex;flex-direction:column;gap:2px;padding:6px 0;border-top:1px solid rgba(127,127,127,.25);margin-top:4px";
      var row = function (label, fn) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "cn-item";
        b.textContent = label;
        b.style.cssText = "text-align:left;min-height:40px;padding:8px 14px;background:none;border:0;color:inherit;font:inherit;cursor:pointer";
        b.addEventListener("click", fn);
        box.appendChild(b);
      };
      row("Demo: switch person", function () { location.href = BASE + "/"; });
      row("Demo: start again", function () { window.orbeDemo.reset(); });
      menu.appendChild(box);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mark);
  else mark();
})();
