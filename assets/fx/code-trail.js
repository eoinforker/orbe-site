/*
  code-trail: a staircase of torn creator analytics source on bright bars,
  trailing the pointer across a plain plate.

  Essentials kept from the spec:
  - the stack is a CHAIN: each row eases toward the row above it, walked
    front to back so every row reads its parent's updated position
  - the chase rate ramps down the chain (0.34 at the head, 0.16 at the tail)
  - rows are pushed by DISTANCE travelled, never by time
  - a row is a run of 1 to 3 fragments butted with no gap, count shaped as
    a spindle by depth, anchored by the RIGHT edge so runs grow leftward
  - colours are stored PAIRS stepped with a stride coprime to the list
  - fragments are cut mid expression and drawn from a shuffled bag
  - mono sized as a fraction of card width, bar barely over cap height,
    char advance measured from the live font
  - resting drift is straight runs at constant speed with a pause on arrival
  - DOM, a fixed pool of rows, transforms written straight to style

  Usage: import { mount } from "./code-trail.js";
         const fx = mount(el); fx.destroy();
*/

// Python and SQL about retention, rpm, payouts and peer cohorts. "in" is
// the slot a fragment needs before it, "out" the slot it leaves open.
export const FRAGMENTS = [
  { text: "SELECT creator_id, avg(", in: "free", out: "expr" },
  { text: "watch_secs / duration)", in: "expr", out: "free" },
  { text: "FROM payouts p JOIN", in: "free", out: "expr" },
  { text: " cohorts c ON c.band", in: "expr", out: "expr" },
  { text: " = p.band", in: "expr", out: "free" },
  { text: "WHERE paid_at >= now() -", in: "free", out: "expr" },
  { text: " interval '90 days'", in: "expr", out: "free" },
  { text: "GROUP BY creator_id;", in: "free", out: "end" },
  { text: "percentile_cont(0.5)", in: "free", out: "expr" },
  { text: " WITHIN GROUP (ORDER BY rpm", in: "expr", out: "free" },
  { text: "sum(gross) FILTER (WHERE", in: "free", out: "expr" },
  { text: " source = 'sponsor')", in: "expr", out: "free" },
  { text: "rank() OVER (PARTITION BY", in: "free", out: "expr" },
  { text: " band ORDER BY retention", in: "expr", out: "expr" },
  { text: "CASE WHEN churned THEN 1", in: "free", out: "expr" },
  { text: " ELSE 0 END)", in: "expr", out: "free" },
  { text: "lag(subs, 1) OVER w", in: "free", out: "free" },
  { text: "date_trunc('month', paid_at", in: "free", out: "expr" },
  { text: "HAVING count(*) > 12", in: "free", out: "free" },
  { text: "AND status = 'cleared'", in: "free", out: "free" },
  { text: "def retention(views: pd.Series", in: "free", out: "expr" },
  { text: ") -> float:", in: "expr", out: "end" },
  { text: "rpm = revenue / (views", in: "free", out: "expr" },
  { text: " / 1000)", in: "expr", out: "free" },
  { text: "peers = df[df.subs", in: "free", out: "expr" },
  { text: ".between(lo, hi)]", in: "expr", out: "free" },
  { text: "df.groupby(\"creator_id\")", in: "free", out: "expr" },
  { text: "[\"payout\"].sum()", in: "expr", out: "free" },
  { text: "for upload in uploads:", in: "free", out: "end" },
  { text: "curve = watch[:, t] /", in: "free", out: "expr" },
  { text: " watch[:, 0]", in: "expr", out: "free" },
  { text: "score = (rpm - peers.rpm", in: "free", out: "expr" },
  { text: ".median()) / peers.rpm.std(", in: "expr", out: "expr" },
  { text: "ddof=1)", in: "expr", out: "free" },
  { text: "renewals = deals.query(", in: "free", out: "expr" },
  { text: "\"status == 'renewed'\")", in: "expr", out: "free" },
  { text: "if payout.cleared_at is None:", in: "free", out: "end" },
  { text: "rows = conn.execute(", in: "free", out: "expr" },
  { text: "sql, {\"band\": band})", in: "expr", out: "free" },
  { text: "np.percentile(rpms, [25, 50,", in: "free", out: "expr" },
  { text: " 75])", in: "expr", out: "free" },
  { text: "open_rate = opens / sends", in: "free", out: "free" },
  { text: "churn = 1 - kept / started", in: "free", out: "free" },
  { text: "band = size_band(subs", in: "free", out: "expr" },
  { text: ", step=0.2)", in: "expr", out: "free" },
  { text: "df[\"rpm\"] = df.net * 1000", in: "free", out: "expr" },
  { text: " / df.views.clip(lower=1", in: "expr", out: "expr" },
  { text: "return round(pct, 1)", in: "free", out: "free" },
  { text: "# payouts, not estimates", in: "free", out: "end", comment: true },
  { text: "# same size, same month", in: "free", out: "end", comment: true },
  { text: "# p50 of peers", in: "free", out: "end", comment: true },
  { text: "/* cleared only */", in: "free", out: "end", comment: true },
  { text: "# sponsor cpm, net of fees", in: "free", out: "end", comment: true },
];

// Text sitting in another saturated colour is the design. Legibility is
// uneven on purpose. No purples: lavender and violet swatches swapped out.
export const PAIRS = [
  { bg: "#E8452F", fg: "#1F4BFF", underline: true },
  { bg: "#F2879E", fg: "#E8722F" },
  { bg: "#6EE87A", fg: "#6F1726", underline: true },
  { bg: "#4BA3F0", fg: "#BFE6FF" },
  { bg: "#1F4BFF", fg: "#F5D34A" },
  { bg: "#1E4620", fg: "#7DE88A" },
  { bg: "#FF5A1F", fg: "#94E6FF" },
  { bg: "#94E6FF", fg: "#3A6FE0" },
  { bg: "#F5D93A", fg: "#C2381F", underline: true },
  { bg: "#E8457A", fg: "#F5E86E" },
  { bg: "#2FA88A", fg: "#FBD9E0" },
  { bg: "#6F1726", fg: "#79E8C4" },
];

const UNDERLINE_EVERY = 7;
const HOT_EVERY = 19;
const HOT = [
  { bg: "#141311", fg: "#F3F0E8" },
  { bg: "#FBFAF6", fg: "#141311" },
];

const ROWS = 22;
const FONT_RATIO = 1 / 42;
const LINE_RATIO = 1.24;
const PAD_RATIO = 0.12;
const STEP_RATIO = 1.4;
const MAX_BADGES = 3;
const MIN_TRAVEL_RATIO = 0.055;
const CHASE_HEAD = 0.34;
const CHASE_TAIL = 0.16;
const FONT_FAMILY = "\"Commit Mono\", ui-monospace, \"SF Mono\", Menlo, monospace";

function makeBag(items) {
  let pool = [];
  return () => {
    if (!pool.length) {
      pool = items.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    return pool.pop();
  };
}

function drawMatching(next, need, tries = 6) {
  let f = next();
  for (let i = 0; i < tries && (f.in !== need || f.comment); i++) f = next();
  return f;
}

function makeStepper(len, stride = 5) {
  let i = Math.floor(Math.random() * len);
  return () => (i = (i + stride) % len);
}

// Spindle: 1 at the head, 3 through the belly, 1 at the tail.
function badgeCount(slot) {
  const t = slot / (ROWS - 1);
  return Math.max(1, Math.min(MAX_BADGES, Math.round(1 + 2 * Math.sin(Math.PI * t))));
}

function chaseRate(slot) {
  return CHASE_HEAD + (CHASE_TAIL - CHASE_HEAD) * (slot / (ROWS - 1));
}

function presence(slot) {
  const t = slot / (ROWS - 1);
  const START = 0.62;
  const fade = 1 - Math.max(0, (t - START) / (1 - START)) ** 1.6;
  return Math.max(0, Math.min(1, fade));
}

function makeRowFactory() {
  const nextFragment = makeBag(FRAGMENTS);
  const nextPair = makeStepper(PAIRS.length);
  let id = 0;
  let sinceUnderline = 0;
  let sinceHot = 0;

  const paint = (text, comment) => {
    const pair = PAIRS[nextPair()];
    sinceUnderline++;
    sinceHot++;
    // about one badge in seven: the flagged pairs take it when the count
    // is up, any pair once it runs long, so it stays an accent not a border
    const underline =
      (pair.underline === true && sinceUnderline >= UNDERLINE_EVERY) ||
      sinceUnderline >= UNDERLINE_EVERY + 4;
    if (underline) sinceUnderline = 0;
    const hot = sinceHot >= HOT_EVERY;
    if (hot) sinceHot = 0;
    const shock = HOT[id % HOT.length];
    return { text, bg: hot ? shock.bg : pair.bg, fg: hot ? shock.fg : pair.fg, underline, comment };
  };

  return () => {
    const badges = [];
    let need = "free";
    for (let i = 0; i < MAX_BADGES; i++) {
      const f = i === 0 ? nextFragment() : drawMatching(nextFragment, need);
      badges.push(paint(f.text, f.comment === true));
      need = f.out === "end" ? "free" : f.out;
      if (f.comment) break;
    }
    id++;
    return badges;
  };
}

// Straight runs at constant speed, hard turns, a pause on arrival so the
// tail catches up and the stack resolves into a tight stair.
class Drift {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.at = { x: w * 0.62, y: h * 0.28 };
    this.dir = { x: 1, y: 0 };
    this.target = null;
    this.wait = 0;
  }
  resize(w, h) {
    this.w = w;
    this.h = h;
  }
  reseed(at) {
    this.at = { x: at.x, y: at.y };
    this.target = null;
    this.wait = 0;
  }
  pick() {
    const m = 0.18;
    let best = null;
    for (let i = 0; i < 12; i++) {
      const c = {
        x: (m + Math.random() * (1 - m * 2)) * this.w,
        y: (m + Math.random() * (1 - m * 2)) * this.h,
      };
      const dx = c.x - this.at.x;
      const dy = c.y - this.at.y;
      const len = Math.hypot(dx, dy);
      if (len < Math.min(this.w, this.h) * 0.3) continue;
      // a hard turn: the new run must leave at a real angle to the last
      const dot = (dx / len) * this.dir.x + (dy / len) * this.dir.y;
      if (dot > 0.5) continue;
      best = c;
      break;
    }
    this.target = best || { x: this.w * 0.5, y: this.h * 0.5 };
    const dx = this.target.x - this.at.x;
    const dy = this.target.y - this.at.y;
    const len = Math.hypot(dx, dy) || 1;
    this.dir = { x: dx / len, y: dy / len };
  }
  step(dt) {
    if (this.wait > 0) {
      this.wait -= dt;
      return { x: this.at.x, y: this.at.y };
    }
    if (!this.target) this.pick();
    // constant speed, so each run's duration follows from its length
    const speed = Math.max(0.12, this.w * 0.00042);
    const dx = this.target.x - this.at.x;
    const dy = this.target.y - this.at.y;
    const left = Math.hypot(dx, dy);
    const move = speed * dt;
    if (left <= move) {
      this.at = { x: this.target.x, y: this.target.y };
      this.target = null;
      this.wait = 520 + Math.random() * 420;
    } else {
      this.at.x += this.dir.x * move;
      this.at.y += this.dir.y * move;
    }
    return { x: this.at.x, y: this.at.y };
  }
}

export function mount(el, opts = {}) {
  const reduced =
    opts.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";
  if (!el.style.background) el.style.background = opts.plate || "#E7E2D7";
  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    "A trail of creator analytics code fragments on brightly coloured bars, stacked into a staircase that follows the pointer across the card",
  );

  const layer = document.createElement("div");
  Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  el.appendChild(layer);

  const buildRow = makeRowFactory();
  let w = el.clientWidth || 1;
  let h = el.clientHeight || 1;
  let font = 14;
  let line = 18;
  let pad = 2;
  let step = 26;
  let advance = 0.6;

  const measureAdvance = () => {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return;
    c.font = `400 100px ${FONT_FAMILY}`;
    const m = c.measureText("0123456789").width / 10;
    if (m > 0) advance = m / 100;
  };

  // A fixed pool of rows, each with MAX_BADGES spans; only styles change.
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const node = document.createElement("div");
    Object.assign(node.style, {
      position: "absolute",
      top: "0",
      left: "0",
      willChange: "transform, opacity",
    });
    const run = document.createElement("div");
    Object.assign(run.style, { position: "absolute", right: "0", top: "0", display: "flex" });
    node.appendChild(run);
    const spans = [];
    for (let j = 0; j < MAX_BADGES; j++) {
      const s = document.createElement("span");
      Object.assign(s.style, {
        flex: "0 0 auto",
        whiteSpace: "pre",
        fontFamily: FONT_FAMILY,
        display: "block",
        boxSizing: "border-box",
        overflow: "hidden",
      });
      run.appendChild(s);
      spans.push(s);
    }
    layer.appendChild(node);
    rows.push({ node, spans, badges: [], pos: { x: 0, y: 0 }, slot: i });
  }

  const paintRow = (r) => {
    for (let j = 0; j < MAX_BADGES; j++) {
      const s = r.spans[j];
      const b = r.badges[j];
      if (!b) {
        s.style.display = "none";
        continue;
      }
      s.textContent = b.text;
      s.style.background = b.bg;
      s.style.color = b.fg;
      s.style.fontStyle = b.comment ? "italic" : "normal";
      s.style.opacity = b.comment ? "0.72" : "1";
      s.style.textDecoration = b.underline ? "underline" : "none";
      s.style.textDecorationThickness = b.underline ? "2px" : "";
      s.style.textUnderlineOffset = b.underline ? "0.14em" : "";
    }
    applyCount(r);
  };

  const applyCount = (r) => {
    const shown = Math.max(1, badgeCount(r.slot));
    for (let j = 0; j < MAX_BADGES; j++) {
      const s = r.spans[j];
      s.style.display = r.badges[j] && j < shown ? "block" : "none";
    }
  };

  // Badge metrics from the measured advance, snapped to device pixels so
  // two touching bars never show a hairline of plate between them.
  const sizeRow = (r) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (let j = 0; j < MAX_BADGES; j++) {
      const s = r.spans[j];
      const b = r.badges[j];
      if (!b) continue;
      const wpx = Math.ceil((b.text.length * advance * font + pad * 2) * dpr) / dpr;
      s.style.width = `${wpx}px`;
      s.style.height = `${line}px`;
      s.style.lineHeight = `${line}px`;
      s.style.fontSize = `${font}px`;
      s.style.padding = `0 ${pad}px`;
    }
  };

  const resize = () => {
    w = el.clientWidth || 1;
    h = el.clientHeight || 1;
    font = Math.max(10, w * FONT_RATIO);
    line = font * LINE_RATIO;
    pad = font * PAD_RATIO;
    step = line * STEP_RATIO;
    drift.resize(w, h);
    for (const r of rows) sizeRow(r);
  };

  const drift = new Drift(w, h);
  measureAdvance();
  resize();

  // Seed: rows ordered by slot, head first.
  for (let i = 0; i < ROWS; i++) {
    const r = rows[i];
    r.badges = buildRow();
    r.slot = i;
    r.pos = reduced
      ? { x: w * 0.9 - i * step, y: h * 0.12 + i * line }
      : { x: w * 0.62 - i * step, y: h * 0.28 + i * line };
    paintRow(r);
    sizeRow(r);
  }
  let order = rows.slice();

  const write = () => {
    for (const r of order) {
      r.node.style.transform = `translate3d(${r.pos.x.toFixed(2)}px, ${r.pos.y.toFixed(2)}px, 0)`;
      const pr = presence(r.slot);
      r.node.style.opacity = pr.toFixed(3);
      r.node.style.filter = `saturate(${(0.5 + pr * 0.5).toFixed(3)})`;
      r.node.style.zIndex = String(ROWS - r.slot);
    }
  };

  let headTarget = { x: w * 0.62, y: h * 0.28 };
  let lastPush = { ...headTarget };
  let pointerInside = false;

  // Recycle the oldest row as the new head.
  const push = () => {
    const born = order[order.length - 1];
    born.badges = buildRow();
    born.slot = 0;
    born.pos = { ...headTarget };
    const next = [born];
    for (let i = 0; i < order.length - 1; i++) {
      const r = order[i];
      r.slot += 1;
      applyCount(r);
      next.push(r);
    }
    paintRow(born);
    sizeRow(born);
    order = next;
  };

  let raf = 0;
  let last = 0;
  let running = false;
  let onScreen = false;
  let hidden = document.hidden;
  let destroyed = false;

  const frame = (now) => {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const f = dt / 16.6667;

    if (!pointerInside) headTarget = drift.step(dt);

    // Front to back: each row chases its parent's already updated spot.
    for (let i = 0; i < order.length; i++) {
      const r = order[i];
      const k = 1 - Math.pow(1 - chaseRate(r.slot), f);
      let tx;
      let ty;
      if (i === 0) {
        tx = headTarget.x;
        ty = headTarget.y;
      } else {
        const p = order[i - 1];
        tx = p.pos.x - step;
        ty = p.pos.y + line;
      }
      r.pos.x += (tx - r.pos.x) * k;
      r.pos.y += (ty - r.pos.y) * k;
    }
    write();

    const travelled = Math.hypot(headTarget.x - lastPush.x, headTarget.y - lastPush.y);
    if (travelled >= w * MIN_TRAVEL_RATIO) {
      lastPush = { ...headTarget };
      push();
    }

    if (running) raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const should = onScreen && !hidden && !reduced && !destroyed;
    if (should === running) return;
    running = should;
    if (should) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const onPointer = (e) => {
    if (reduced || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    pointerInside = true;
    headTarget = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onLeave = () => {
    if (!pointerInside) return;
    pointerInside = false;
    drift.reseed(headTarget);
  };

  const io = new IntersectionObserver(
    (es) => {
      onScreen = es.some((e) => e.isIntersecting);
      sync();
    },
    { rootMargin: "200px" },
  );
  io.observe(el);

  const onVis = () => {
    hidden = document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVis);

  const ro = new ResizeObserver(() => {
    const pw = w;
    const ph = h;
    resize();
    if (reduced) {
      order.forEach((r, i) => {
        r.pos = { x: w * 0.9 - i * step, y: h * 0.12 + i * line };
      });
    } else if (pw > 0 && ph > 0) {
      const sx = w / pw;
      const sy = h / ph;
      for (const r of order) {
        r.pos.x *= sx;
        r.pos.y *= sy;
      }
      headTarget = { x: headTarget.x * sx, y: headTarget.y * sy };
      lastPush = { ...headTarget };
    }
    write();
  });
  ro.observe(el);

  el.addEventListener("pointermove", onPointer);
  el.addEventListener("pointerleave", onLeave);

  // Re-measure once the real mono face has loaded.
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`400 20px ${FONT_FAMILY}`).then(() => {
      if (destroyed) return;
      measureAdvance();
      resize();
      write();
    }, () => {});
  }

  write();

  return {
    destroy() {
      destroyed = true;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerleave", onLeave);
      layer.remove();
    },
  };
}
