/* Before the first paint: the theme chosen on this device, or the device's own. Kept tiny and blocking so nothing flashes. */
(function () {
  var t = null;
  try { t = localStorage.getItem("orbe.theme"); } catch (e) {}
  if (t !== "dark" && t !== "light") t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
})();
