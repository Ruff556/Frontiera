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
  }
  function close() {
    menu.classList.remove("open");
    scrim.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }
  burger.addEventListener("click", function () {
    menu.classList.contains("open") ? close() : open();
  });
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", close);
  });
})();
