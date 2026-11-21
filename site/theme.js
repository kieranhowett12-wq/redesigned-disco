/* Runs in <head> before first paint: marks JS as available and applies the saved
   or system theme, so there is no flash of the wrong colours. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved !== "light" && saved !== "dark") saved = null;
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (dark ? "dark" : "light"));
})();
