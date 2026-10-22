/*
  Protect: is this a copy of your work? Two files, yours and the one you
  found, compared on this device by the same engine as the site's Protect
  page (product/src/protect, copied to site/engine/protect). Pictures are
  decoded by the browser onto a canvas, audio through the Web Audio API's
  decoder. Nothing is uploaded and nothing is kept: the check is real, and
  watching the web for copies is not built yet, which the page says.
*/
import { compare, fingerprintAudio, fingerprintImage, matchAudio } from "../../site/engine/protect/index.js";
import { emptyState, pill, screenHead } from "../console-ui.js";
import { icon } from "../icons.js";
import { h } from "../ui.js";

const PICTURE = { same: "Same picture", edited: "Edited copy", different: "Different" };
const SOUND = { same: "Same recording", contains: "Contains your audio", different: "Different" };

async function pixels(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: d.data, channels: 4 };
}

async function sound(file) {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const audio = await new Ctx(1, 1, 44100).decodeAudioData(await file.arrayBuffer());
  const channels = [];
  for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
  return { sampleRate: audio.sampleRate, channels };
}

/** A file's fingerprint, by what it is. */
async function print(file) {
  if (file.type.startsWith("image/")) return { kind: "image", name: file.name, fp: fingerprintImage(await pixels(file)) };
  if (file.type.startsWith("audio/")) return { kind: "audio", name: file.name, fp: fingerprintAudio(await sound(file)) };
  throw new Error("Choose a picture or a sound file.");
}

function slot(label, line, onFile) {
  const input = h("input", { class: "ob-sr", type: "file", accept: "image/*,audio/*" });
  const name = h("span", { class: "cn-drop-d" }, line);
  const zone = h("label", { class: "cn-drop" }, input, h("span", { class: "cn-drop-ico" }, icon("image")), h("span", { class: "cn-drop-t" }, label), name);
  const take = (file) => {
    if (!file) return;
    name.textContent = file.name;
    zone.classList.add("is-set");
    onFile(file);
  };
  input.addEventListener("change", () => take(input.files?.[0]));
  zone.addEventListener("dragover", (e) => (e.preventDefault(), zone.classList.add("is-over")));
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-over");
    take(e.dataTransfer?.files?.[0]);
  });
  return zone;
}

export async function render(main) {
  const body = screenHead(main, "protect", {
    title: "Protect",
    line: "Is this a copy of your work? Add your original and the file you found: Orbe compares them on this device, so nothing is uploaded.",
    tags: [["On this device", "sky"], ["Pictures and audio"], ["Free"]],
  });
  const files = { a: null, b: null };
  const status = h("span", { class: "cn-result-status" }, pill("idle", "Waiting for two files"));
  const out = h("div", { class: "cn-result-body", "aria-live": "polite" }, emptyState("shield", "Add both files to compare them.", [], "A match is a reason to look, not a claim: commentary and parody can use work fairly."));
  const run = async () => {
    if (!files.a || !files.b) return;
    status.replaceChildren(pill("running", "Comparing"));
    try {
      const [a, b] = await Promise.all([print(files.a), print(files.b)]);
      if (a.kind !== b.kind) throw new Error("Compare a picture with a picture, or a sound with a sound.");
      const r = a.kind === "image" ? compare(a.fp, b.fp) : matchAudio(a.fp, b.fp);
      const verdict = a.kind === "image" ? PICTURE[r.verdict] : SOUND[r.verdict];
      const found = r.verdict !== "different";
      status.replaceChildren(pill(found ? "done" : "idle", verdict));
      out.replaceChildren(
        h("div", { class: "cn-figure" }, h("p", { class: `cn-verdict${found ? " is-found" : ""}` }, verdict)),
        h("p", null, r.words),
        a.kind === "image"
          ? h("p", { class: "cn-label" }, `Score ${r.score} of 64, where 6 or under is the same picture and 14 or under an edited copy.`)
          : h("p", { class: "cn-label" }, `${r.aligned} landmark pairs agree on one offset; confidence ${Math.round(r.confidence * 100)}%.`),
        found ? h("p", { class: "cn-label" }, "Watching the web for copies on your behalf is not built yet; this checks a file you found.") : null,
      );
    } catch (e) {
      status.replaceChildren(pill("failed", "Could not compare"));
      out.replaceChildren(emptyState("shield", e.message || "That file could not be read here.", [], "Pictures: JPEG, PNG, WebP. Sound: MP3, WAV, M4A."));
    }
  };
  body.append(
    h("div", { class: "cn-play" },
      h("section", { class: "cn-play-in", "aria-label": "Files" },
        h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h3" }, "Files")),
        h("div", { class: "cn-play-body cn-drops" },
          slot("Your original", "A picture or a sound file", (f) => ((files.a = f), run())),
          slot("The file you found", "The copy you want to check", (f) => ((files.b = f), run())),
        ),
      ),
      h("section", { class: "cn-play-out", "aria-label": "Result" }, h("header", { class: "cn-play-head" }, h("h2", { class: "cn-h3" }, "Result"), status), h("div", { class: "cn-play-body" }, out)),
    ),
  );
}
