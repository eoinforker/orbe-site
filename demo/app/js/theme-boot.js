/*
  Before the first paint: the theme chosen on this device, or the device's
  own; whether this device was signed in last time, so the frame's space is
  kept from the start and nothing moves down when it draws; and which screen
  it opens on, so main has that screen's width before the screen is known.
  Kept tiny and blocking so nothing flashes.
*/
(function () {
  var t = null;
  try { t = localStorage.getItem("orbe.theme"); if (localStorage.getItem("orbe.side")) document.documentElement.setAttribute("data-framed", window.innerWidth >= 900 ? "wide" : "narrow"); } catch (e) {}
  if (t !== "dark" && t !== "light") t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.setAttribute("data-start", location.pathname.replace(/^\/app\/?/, "").split("/")[0] || "home");
})();
