/*
  Shared by the answer pages: the header and footer from orbe/chrome.js
  (footer first, so the header sees every field) and the caret on each
  static fold. Each page then mounts its own live widget.
*/
import { mountHeader, mountFooter } from "../assets/orbe/chrome.js";
import { icon } from "../products/assets/shell.js";

export function page(root) {
  mountFooter(document.querySelector("[data-ob-footer]"), { root });
  mountHeader(document.querySelector("[data-ob-header]"), { root, current: "answers/" });
  for (const sum of document.querySelectorAll("details.fold > summary")) if (!sum.querySelector(".o-icon")) sum.insertAdjacentHTML("afterbegin", icon("caret", { size: 16, className: "caret" }));
}
