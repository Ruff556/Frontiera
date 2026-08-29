/* =====================================================================
   Passaggio di priorità dallo scroll dell'infobox alla pagina.
   ---------------------------------------------------------------------
   Il CSS (.scrollable-infobox: overflow-y:auto; overscroll-behavior-y:auto)
   dà già il comportamento corretto per lo scatto DISCRETO della rotella:
   scroll interno finché c'è spazio, poi concatenamento nativo alla pagina.

   Resta però lo "scroll latching" di Chrome: durante un GESTO CONTINUO
   (soprattutto trackpad), una volta agganciato il gesto al pannello, al
   raggiungimento dell'estremo il browser non propaga alla pagina finché il
   gesto non termina. Ne risulta uno scroll ESCLUSIVO invece che PRIORITARIO.

   Questo listener corregge SOLO quel caso: quando l'infobox è già all'estremo
   nella direzione richiesta, trasferisce il movimento alla pagina e impedisce
   che il pannello trattenga l'evento. Finché l'infobox può ancora muoversi
   nella direzione richiesta — o non ha overflow — non fa nulla: lo scroll
   resta nativo (nessun preventDefault, nessuno scroll manuale). Così non si
   verifica mai doppio scroll e l'inerzia del trackpad è preservata.

   Nessun listener globale su document/finestra: il wheel è agganciato ai soli
   pannelli .scrollable-infobox (il contratto condiviso di F, P, Attualità e
   ogni futura variante). Progressive enhancement: senza JS il comportamento
   discreto resta comunque corretto grazie al CSS. */
(function () {
  "use strict";

  var TOL = 1;        // tolleranza sub-pixel
  var LINE = 16;      // px per "riga" quando deltaMode è in righe (mouse wheel)
  var KEY_STEP = 40;  // passo accessibile per i tasti freccia

  function onWheel(e) {
    var el = e.currentTarget;

    // 1) Nessun overflow interno: stato già corretto, la pagina scorre nativamente.
    if (el.scrollHeight <= el.clientHeight + TOL) return;

    var dy = e.deltaY;
    if (dy === 0) return; // nessuna intenzione verticale

    var atTop = el.scrollTop <= TOL;
    var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - TOL;

    // 2) L'infobox può ancora muoversi nella direzione richiesta → priorità
    //    allo scroll interno: lascia agire il browser (nessun preventDefault).
    if (dy > 0 && !atBottom) return; // giù, non ancora al fondo
    if (dy < 0 && !atTop) return;    // su, non ancora al top

    // 3) L'infobox è all'estremo nella direzione richiesta: passaggio di
    //    priorità. Trasferisce il gesto alla pagina e blocca il pannello, così
    //    non c'è né latching né doppio scroll. deltaY normalizzato in px.
    var delta = dy;
    if (e.deltaMode === 1) delta *= LINE;                 // righe → px
    else if (e.deltaMode === 2) delta *= el.clientHeight; // pagine → px

    window.scrollBy({ top: delta, behavior: "instant" });
    e.preventDefault();
  }

  // I contenitori di scroll focalizzabili non ricevono in modo uniforme la
  // priorità da tastiera nei browser. Finché c'è contenuto interno da leggere,
  // frecce/Pagina/Home/Fine muovono il pannello; raggiunto l'estremo il default
  // non viene bloccato e lo stesso tasto torna a scorrere la pagina.
  function onKeyDown(e) {
    var el = e.currentTarget;
    if (e.target !== el || el.scrollHeight <= el.clientHeight + TOL) return;

    var max = el.scrollHeight - el.clientHeight;
    var atTop = el.scrollTop <= TOL;
    var atBottom = el.scrollTop >= max - TOL;
    var delta = 0;

    if (e.key === "ArrowDown") delta = KEY_STEP;
    else if (e.key === "ArrowUp") delta = -KEY_STEP;
    else if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) delta = el.clientHeight * .85;
    else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) delta = -el.clientHeight * .85;
    else if (e.key === "End") {
      if (atBottom) return;
      el.scrollTop = max;
      e.preventDefault();
      return;
    } else if (e.key === "Home") {
      if (atTop) return;
      el.scrollTop = 0;
      e.preventDefault();
      return;
    } else {
      return;
    }

    if ((delta > 0 && atBottom) || (delta < 0 && atTop)) return;
    el.scrollTop = Math.max(0, Math.min(max, el.scrollTop + delta));
    e.preventDefault();
  }

  function init() {
    var panels = document.querySelectorAll(".scrollable-infobox");
    for (var i = 0; i < panels.length; i++) {
      var el = panels[i];
      if (el.__infoboxScrollBound) continue;
      el.__infoboxScrollBound = true;
      // passive:false perché agli estremi serve preventDefault; l'ascolto è
      // circoscritto al singolo pannello, non al documento.
      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("keydown", onKeyDown);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
