/*
  The console's theme: Ink (dark) or Paper (light), following the device
  unless the person picks one. The choice is the one other thing the app
  remembers on a device, beside the last tab chosen. theme-boot.js applies it
  before the first paint.
*/
const KEY = "orbe.theme";

export function theme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : "system";
  } catch {
    return "system";
  }
}

const system = () => (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");

/** Paints the page in the theme chosen, or the device's. */
export function applyTheme() {
  const t = theme();
  document.documentElement.dataset.theme = t === "system" ? system() : t;
}

export function setTheme(value) {
  try {
    if (value === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // A private window may refuse: the theme still changes for this visit.
  }
  if (value !== "system") document.documentElement.dataset.theme = value;
  else applyTheme();
}

window.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => theme() === "system" && applyTheme());
