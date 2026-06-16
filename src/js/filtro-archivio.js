/* Filtro d'archivio per dominio — miglioramento progressivo (solo analisi).
   Senza JS: la barra filtri è nascosta (CSS) e l'archivio mostra tutto. */
(function () {
  var bar = document.getElementById("archfilters");
  var grid = document.getElementById("archgrid");
  if (!bar || !grid) return;

  var chips = Array.prototype.slice.call(bar.querySelectorAll(".chip"));
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  var vuoto = document.getElementById("archempty");

  function applica(dominio) {
    var visibili = 0;
    cards.forEach(function (card) {
      var domini = (card.getAttribute("data-domini") || "").split(/\s+/);
      var ok = dominio === "tutto" || domini.indexOf(dominio) !== -1;
      card.classList.toggle("is-hidden", !ok);
      if (ok) visibili++;
    });
    if (vuoto) vuoto.hidden = visibili !== 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      applica(chip.getAttribute("data-dominio") || "tutto");
    });
  });
})();
