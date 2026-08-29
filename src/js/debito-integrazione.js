/* Debito d'integrazione — miglioramento progressivo.
   La componente funziona interamente senza JavaScript: curve, fascia, stati e
   pannello vivono nell'HTML e sono pilotati da radio + :checked nel CSS.
   Qui si aggiunge soltanto ciò che il CSS non può fare:
     1. ripristino della vista d'insieme con un tocco fuori dalla componente
        o con Esc (il controllo "Vista d'insieme" resta comunque nel markup);
     2. comparsa progressiva delle curve al primo ingresso nel viewport.
   Se lo script non parte o fallisce, il grafico resta completo e leggibile. */
(function () {
  "use strict";

  var schemi = document.querySelectorAll(".debito");
  if (!schemi.length) return; // Nessuno schema in pagina: nulla da fare.

  var movimentoRidotto =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(schemi, function (schema) {
    var predefinito = schema.querySelector(".debito-radio--predefinito");

    // ---- ripristino della vista d'insieme ----
    if (predefinito) {
      document.addEventListener("click", function (ev) {
        if (schema.contains(ev.target)) return;
        predefinito.checked = true;
      });
      schema.addEventListener("keydown", function (ev) {
        if (ev.key !== "Escape" && ev.key !== "Esc") return;
        if (predefinito.checked) return;
        predefinito.checked = true;
        predefinito.focus();
      });
    }

    // ---- comparsa progressiva ----
    // Con movimento ridotto o senza IntersectionObserver non si nasconde nulla:
    // il disegno resta nella sua forma completa fin dal primo paint.
    if (movimentoRidotto || !("IntersectionObserver" in window)) return;
    schema.classList.add("debito--pronto");
    var osservatore = new IntersectionObserver(
      function (voci) {
        voci.forEach(function (voce) {
          if (!voce.isIntersecting) return;
          voce.target.classList.add("debito--vista");
          osservatore.unobserve(voce.target);
        });
      },
      { threshold: 0.18 }
    );
    osservatore.observe(schema);
  });
})();
