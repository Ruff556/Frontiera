/* Menù mobile — miglioramento progressivo.
   Senza JS: il burger è nascosto (CSS) e le sezioni restano raggiungibili
   dalla nav desktop e dal menù completo nel footer. */
(function () {
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobilemenu");
  var scrim = document.getElementById("scrim");
  if (!burger || !menu || !scrim) return;

  function open() {
    menu.classList.add("open");
    scrim.classList.add("open");
    burger.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Chiudi menù");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
  }
  function close(returnFocus) {
    var focusInside = menu.contains(document.activeElement);
    menu.classList.remove("open");
    scrim.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Apri menù");
    menu.setAttribute("aria-hidden", "true");
    menu.setAttribute("inert", "");
    if (returnFocus && focusInside) burger.focus();
  }
  burger.addEventListener("click", function () {
    menu.classList.contains("open") ? close() : open();
  });
  scrim.addEventListener("click", function () { close(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close(true);
  });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { close(false); });
  });

  // Il menu mobile non deve restare aperto quando entra in vigore la nav desktop.
  var desktopMQ = window.matchMedia("(min-width: 920px)");
  function closeAtDesktop() {
    if (desktopMQ.matches) close();
  }
  if (desktopMQ.addEventListener) desktopMQ.addEventListener("change", closeAtDesktop);
  else desktopMQ.addListener(closeAtDesktop);
  window.addEventListener("resize", closeAtDesktop, { passive: true });
})();
