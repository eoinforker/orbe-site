/*
  Orbe's folk: one character per kind of creator, built from the Carved
  wordmark's O and its flared strokes, cut from paper and lifted on a hard
  ink shadow. They are round because they are people ("square for numbers,
  round for people"). Each kind carries one prop made of the same cuts:

    channel      a play flag on its head
    stream       two antennae, one with the live spark
    newsletter   an envelope on its head
    podcast      no legs: it stands on a stem and base, a microphone
    photography  the O is the lens of a camera body

  Local units are the wordmark's own (the O is 664 wide), ground at y = 0.
  The counter of the O is a real hole, and it can be filled from the bottom
  like a glass: that fill is what the size panel measures.
*/
import { WORDMARK } from "../assets/r5/wordmark.js";

const O = WORDMARK.text.O;
const COUNTER = O.slice(O.indexOf("M112"));
export const LIFT = 213;                 // the O sits on its legs
export const FOLK_W = 664;
export const FOLK_H = 926;               // O top to the ground, without props
export const COUNTER_TOP = -633 - LIFT;  // the hole, in local units
export const COUNTER_BOT = -67 - LIFT;

/* A carved stroke: a stem with a waist that flares to flat-cut ends. */
export function stem(cx, y0, y1, w = 96, f = 136) {
  const r = Math.min(118, (y1 - y0) * 0.34);
  const a = w / 2, b = f / 2;
  return `M${cx - b},${y0}Q${cx - a},${y0 + r * 0.2} ${cx - a},${y0 + r}L${cx - a},${y1 - r}Q${cx - a},${y1 - r * 0.2} ${cx - b},${y1}L${cx + b},${y1}Q${cx + a},${y1 - r * 0.2} ${cx + a},${y1 - r}L${cx + a},${y0 + r}Q${cx + a},${y0 + r * 0.2} ${cx + b},${y0}Z`;
}
/* A stem laid between two points. */
function stroke(x0, y0, x1, y1, w, f) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI - 90;
  return `<path d="${stem(x0, y0, y0 + len, w, f)}" transform="rotate(${ang.toFixed(2)} ${x0} ${y0})"/>`;
}

/* The prop for each kind, as [behind the O, in front of the O]. Everything here is ink or paper. */
function prop(kind, c) {
  switch (kind) {
    case "channel":
      return ["", `<path d="M236,-946L236,-1168L452,-1052Z" fill="${c.ink}" transform="rotate(-6 340 -1040)"/>`];
    case "stream":
      return ["", `<g fill="${c.ink}">${stroke(286, -904, 178, -1108, 38, 58)}${stroke(378, -904, 486, -1108, 38, 58)}</g><circle cx="168" cy="-1126" r="40" fill="${c.ink}"/><circle cx="496" cy="-1126" r="44" fill="${c.spark}" stroke="${c.ink}" stroke-width="16"/>`];
    case "newsletter":
      return ["", `<g transform="rotate(-7 332 -1000)"><rect x="150" y="-1124" width="364" height="232" fill="${c.paper}" stroke="${c.ink}" stroke-width="18"/><path d="M150,-1124L332,-994L514,-1124" fill="none" stroke="${c.ink}" stroke-width="22" stroke-linejoin="miter"/></g>`];
    case "portfolio":
      return [`<rect x="-96" y="-812" width="856" height="532" rx="64" fill="${c.ink}"/><rect x="474" y="-888" width="176" height="96" rx="18" fill="${c.ink}"/><rect x="-40" y="-760" width="104" height="54" rx="12" fill="${c.spark}"/>`, ""];
    default:
      return ["", ""];
  }
}
function legs(kind, c) {
  if (kind === "podcast") return `<g fill="${c.ink}"><path d="${stem(332, -232, -40, 92, 132)}"/><rect x="168" y="-52" width="328" height="52" rx="26"/></g>`;
  return `<g fill="${c.ink}"><path d="${stem(214, -236, 0, 70, 116)}"/><path d="${stem(450, -236, 0, 70, 116)}"/></g>`;
}
function silhouette(kind) {
  // the shadow: the same cuts, all ink
  const c = { ink: "currentColor", paper: "currentColor", spark: "currentColor" };
  const [back, front] = prop(kind, c);
  return `${back}${legs(kind, c)}<path d="${O}" fill-rule="evenodd" transform="translate(0 ${-LIFT})"/>${front}`;
}

let uid = 0;
/*
  folk({ kind, body, colours, look, fill }) returns an SVG <g> string, drawn at
  local units with the ground at y = 0. Place it with a transform on a parent.
  fill: true adds a liquid rect inside the counter (class "fill"), which you set
  with setFill(). look: -1 to 1, where the pupils point.
*/
export function folk({ kind = "channel", body = "#FF6A4D", colours, look = 0, fill = false, cls = "" }) {
  const c = colours;
  const id = `fk${++uid}`;
  const [back, front] = prop(kind, c);
  const ex = look * 20, ey = -4;
  const eyes = `<g class="eyes"><ellipse cx="252" cy="${-560 - LIFT}" rx="54" ry="64" fill="${c.paper}" stroke="${c.ink}" stroke-width="14"/><ellipse cx="412" cy="${-560 - LIFT}" rx="54" ry="64" fill="${c.paper}" stroke="${c.ink}" stroke-width="14"/><circle class="pupil" cx="${252 + ex}" cy="${-552 - LIFT + ey}" r="25" fill="${c.ink}"/><circle class="pupil" cx="${412 + ex}" cy="${-552 - LIFT + ey}" r="25" fill="${c.ink}"/></g>`;
  const liquid = fill
    ? `<clipPath id="${id}c"><path d="${COUNTER}" transform="translate(0 ${-LIFT})"/></clipPath><g clip-path="url(#${id}c)"><rect class="fill" x="100" y="${COUNTER_BOT}" width="464" height="0" fill="${c.fill || c.ink}"/><rect class="fill-line" x="100" y="${COUNTER_BOT}" width="464" height="18" fill="${c.ink}"/></g>`
    : "";
  return `<g class="folk ${cls}" data-kind="${kind}"><g class="shadow" transform="translate(34 30)" fill="${c.ink}" color="${c.ink}">${silhouette(kind)}</g><g class="cut">${back}${legs(kind, c)}<path class="ring" d="${O}" fill-rule="evenodd" fill="${body}" transform="translate(0 ${-LIFT})"/>${liquid}${eyes}${front}</g></g>`;
}

/* Fill a folk's counter to a share (0 to 1) of the hole's height. */
export function setFill(g, share) {
  const r = g.querySelector(".fill");
  if (!r) return;
  const h = Math.max(0, Math.min(1, share)) * (COUNTER_BOT - COUNTER_TOP);
  r.setAttribute("y", String(COUNTER_BOT - h));
  r.setAttribute("height", String(h));
  const line = g.querySelector(".fill-line");
  if (line) { line.setAttribute("y", String(COUNTER_BOT - h - 9)); line.setAttribute("opacity", h > 4 ? "1" : "0"); }
}
