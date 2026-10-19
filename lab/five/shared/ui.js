/*
  Shared bones for the five Today screens: the bar with the Carved wordmark,
  the Copy button, the footer, and Odin's rotating word from lab/desk.
*/
import { mountWordmark } from "../../../assets/r5/wordmark.js";
import { ORDER, MADE_UP_LINE, NOW, dayName, today } from "./today.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* reduced motion, or ?still for captures */
export const STILL = (() => {
  let s = false;
  try { s = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  try { if (new URLSearchParams(location.search).has("still")) s = true; } catch (e) {}
  return s;
})();
if (STILL) document.documentElement.classList.add("still");

const SLUG = { science: "science", shorts: "shorts", stream: "stream", macro: "macro", shed: "shed" };
const SHORT = { science: "Science explainers", shorts: "Coding Shorts", stream: "Cosy stream", macro: "Macro insects", shed: "The shed" };

/** The bar: wordmark, Today, the date the record was read, the handle and the made-up label. */
export function mountBar(t) {
  const bar = $("[data-bar]");
  bar.innerHTML = `<a class="mark" href="../" aria-label="Orbe, all five examples" data-wordmark>Orbe</a>
    <span class="today">Today</span><span class="when">${esc(dayName(NOW))}</span>
    <span class="who">${esc(t.handle)}</span><span class="tag-made">Made up</span>`;
  mountWordmark($("[data-wordmark]", bar), { animate: !STILL });
}

/** The footer every page carries: the calculation line, the made-up label, how Orbe earns, and the other four. */
export function mountFoot(t, extra = "") {
  const foot = $("[data-foot]");
  foot.innerHTML = `<p class="calc">Independently calculated by Orbe.</p>
    <p>${esc(t.name)} (${esc(t.handle)}) is made up. ${esc(MADE_UP_LINE)} Every figure on this page is computed in your browser from a made-up record, against Orbe's provisional benchmarks for ${esc(t.peers)} with ${esc(t.sizeBand)}. ${extra}</p>
    <p>Orbe is free for creators. It earns only when money moves.</p>
    <nav aria-label="The five examples">${ORDER.map((k) => `<a href="../${SLUG[k]}/"${k === t.key ? ' aria-current="page"' : ""}>${esc(SHORT[k])}</a>`).join("")}<a href="../">All five</a></nav>`;
}

/** A Copy button for the line to post. */
export function mountCopy(btn, text, status) {
  btn.addEventListener("click", async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.fontSize = "16px";
        document.body.append(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
      } catch (e2) {}
    }
    status.textContent = ok ? "Copied. It is yours to post." : "Select the line above and copy it by hand.";
  });
}

/* ---------------------------------------------------------------- Odin's word change, measured (lab/desk/main.js) */
const EASE_W = "cubic-bezier(0.45, 0, 0.2, 1)";
function chars(word) {
  const w = document.createElement("span");
  w.className = "w";
  for (const ch of word) { const c = document.createElement("span"); c.className = "c"; c.textContent = ch === " " ? " " : ch; w.appendChild(c); }
  return w;
}
export function swapWord(slot, word) {
  const old = slot.querySelector(".w:not(.out)");
  if (old && old.textContent.replace(/ /g, " ") === word) return;
  if (STILL) { slot.textContent = ""; slot.appendChild(chars(word)); return; }
  const from = slot.getBoundingClientRect().width;
  const next = chars(word);
  if (old) old.classList.add("out");
  slot.appendChild(next);
  slot.style.width = "auto";
  const to = slot.getBoundingClientRect().width;
  slot.style.width = from + "px";
  slot.animate([{ width: from + "px" }, { width: to + "px" }], { duration: 450, easing: EASE_W, fill: "forwards" })
    .finished.then(() => { slot.getAnimations().forEach((a) => a.cancel()); slot.style.width = ""; }).catch(() => {});
  if (old) {
    old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 360, easing: EASE_W, fill: "forwards" });
    [...old.children].forEach((c, i) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: i * 12, easing: "linear", fill: "forwards" }));
    setTimeout(() => old.remove(), 420);
  }
  [...next.children].forEach((c, i) => c.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 360, delay: i * 24, easing: EASE_W, fill: "backwards" }));
}

/** Goes round the words once, then stops on the last (WCAG 2.2.2: nothing moves for more than five seconds). */
export function rotateOnce(slot, words, every = 1500) {
  swapWord(slot, words[0]);
  if (STILL) { swapWord(slot, words[words.length - 1]); return; }
  words.slice(1).forEach((w, i) => setTimeout(() => swapWord(slot, w), every * (i + 1)));
}

export { today, NOW };
