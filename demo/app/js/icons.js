/*
  The console's line icons: one 16 by 16 grid, a 1.5 stroke in currentColor,
  round ends. Built as SVG from these paths, so there are no icon files and
  nothing for the content policy to refuse. Decorative unless given a label.
*/
const P = {
  home: "M2.5 7.2 8 2.5l5.5 4.7V13a.5.5 0 0 1-.5.5H9.5V10h-3v3.5H3a.5.5 0 0 1-.5-.5z",
  explore: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z",
  library: "M2.5 3.5h3v9h-3zM6.5 3.5h3v9h-3zM10.4 4l2.9-.8 2 8.7-2.9.7z",
  studio: "M2.5 13.5 9 7M10.5 2.5v2M13.5 5.5h-2M12.6 3.4l-1.3 1.3M9.5 2.5l.6 1.4M13.5 9.5l-1.4-.6",
  earn: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM10 5.8C9.6 5.2 8.9 5 8 5c-1.2 0-2 .6-2 1.5S6.8 7.8 8 8s2 .7 2 1.5S9.2 11 8 11c-.9 0-1.7-.3-2-.9M8 3.8V5M8 11v1.2",
  code: "M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5",
  settings: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1",
  search: "M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6 14 14",
  bell: "M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.5 14h3",
  help: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.1v.4M8 11.4v.1",
  book: "M2.5 3.2c1.8-.6 3.6-.4 5.5.8v9.5c-1.9-1.2-3.7-1.4-5.5-.8zM13.5 3.2c-1.8-.6-3.6-.4-5.5.8v9.5c1.9-1.2 3.7-1.4 5.5-.8z",
  chevron: "M4.5 6.5 8 10l3.5-3.5",
  chevronRight: "M6.5 4.5 10 8l-3.5 3.5",
  plus: "M8 3v10M3 8h10",
  star: "m8 2.3 1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11.1 4.5 13l.8-3.9-2.9-2.7 3.9-.5z",
  folder: "M2 4.5c0-.6.4-1 1-1h3l1.5 1.5H13c.6 0 1 .4 1 1V12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1z",
  grid: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  list: "M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5",
  filter: "M2 3.5h12L9.5 9v4l-3 1.5V9z",
  close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
  arrowUp: "M8 13V3M3.5 7.5 8 3l4.5 4.5",
  arrowRight: "M3 8h10M8.5 3.5 13 8l-4.5 4.5",
  external: "M9 2.5h4.5V7M13.5 2.5 7 9M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3",
  copy: "M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3",
  check: "M3 8.5 6.5 12 13 4.5",
  clock: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5",
  play: "M5 3.2v9.6L12.8 8z",
  mic: "M8 1.8a2 2 0 0 0-2 2v3.7a2 2 0 0 0 4 0V3.8a2 2 0 0 0-2-2zM4.2 7.4a3.8 3.8 0 0 0 7.6 0M8 11.2v3M5.8 14.2h4.4",
  phone: "M5 1.5h6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7 6v4l3-2z",
  camera: "M2.5 5.5a1 1 0 0 1 1-1h1.8l1-1.5h3.4l1 1.5h1.8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM8 11a2.3 2.3 0 1 0 0-4.6A2.3 2.3 0 0 0 8 11z",
  box: "M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11zM2.5 5 8 7.5 13.5 5M8 7.5v6",
  sun: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9",
  moon: "M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z",
  monitor: "M2 3h12v8H2zM6 14h4M8 11v3",
  logout: "M6 13.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h3M10.5 11 13.5 8l-3-3M13.5 8H6",
  user: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4",
  key: "M10.5 9a3.5 3.5 0 1 0-3.4-2.6L2.5 11v2.5H5V12h1.5v-1.5H8l.9-.9A3.5 3.5 0 0 0 10.5 9zM11 5h.01",
  plug: "M5.5 2v3.5M10.5 2v3.5M3.5 5.5h9V8a4.5 4.5 0 0 1-9 0zM8 12.5V15",
  shield: "M8 1.8 13 3.7v4c0 3.1-2.1 5.6-5 6.5-2.9-.9-5-3.4-5-6.5v-4z",
  trash: "M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.8v4M9.2 6.8v4",
  card: "M1.5 4h13v8.5h-13zM1.5 6.8h13M4 10h3",
  chart: "M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5",
  bolt: "M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z",
  menu: "M2 4h12M2 8h12M2 12h12",
  sliders: "M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6M10.5 3v3M5.5 10v3",
  link: "M6.5 9.5l3-3M7 4.5l1.3-1.3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5l-1.3 1.3a2.5 2.5 0 0 1-3.5-3.5L5.5 8",
  mail: "M2 3.5h12v9H2zM2.5 4l5.5 4.5L13.5 4",
  scales: "M8 2.5v11M4.5 13.5h7M3 4.5h10M3 4.5 1.5 8.5h3zM13 4.5l-1.5 4h3zM1.5 8.5a1.5 1.5 0 0 0 3 0M11.5 8.5a1.5 1.5 0 0 0 3 0",
  megaphone: "M2.5 6.5v3h2l5 3v-9l-5 3zM12 6a2.5 2.5 0 0 1 0 4M4.5 9.5 5.5 13h1.5l-.5-3",
  sparkle: "M8 1.8 9.4 6.6 14.2 8 9.4 9.4 8 14.2 6.6 9.4 1.8 8 6.6 6.6z",
  pulse: "M1.5 8.5h3l1.5-4 3 8 1.5-4h4",
  people: "M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.4-2.2 2.1-3.5 4.5-3.5s4.1 1.3 4.5 3.5M11 7a2 2 0 1 0 0-4M12.5 10.2c1.1.5 1.8 1.6 2 3.3",
  doc: "M4 1.5h5.5L12.5 4.5V14a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5zM9.5 1.5v3h3M5.5 8h5M5.5 10.5h5",
  image: "M2 3h12v10H2zM2 10.5l3.5-3.5 3 3 2-2L14 11.5M10.5 6.5h.01",
  enter: "M13 3v5.5a1 1 0 0 1-1 1H3.5M6 7 3.5 9.5 6 12",
  status: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 8h.01",
  dots: "M3.5 8h.01M8 8h.01M12.5 8h.01",
};

const NS = "http://www.w3.org/2000/svg";

/** An icon by name. With a label it is announced; without, it is hidden from assistive technology. */
export function icon(name, opts = {}) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("class", `cn-i${opts.cls ? ` ${opts.cls}` : ""}`);
  svg.setAttribute("fill", name === "star" && opts.filled ? "currentColor" : name === "play" ? "currentColor" : "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");
  if (opts.label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", opts.label);
  } else svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", P[name] ?? P.dots);
  svg.append(path);
  return svg;
}

export const ICONS = Object.keys(P);
