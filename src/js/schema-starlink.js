/* S1 — scena Starlink e costo informativo della distanza.
   I tempi sono regia editoriale: non rappresentano latenze o durate operative. */
(function () {
  "use strict";
  var CONFIG = {
    phaseStay: 4200,
    upperSingle: 980,
    upperDecisionLeg: 820,
    upperDecisionGap: 150,
    attackDraw: 820,
    integratedTraverse: 940,
    integratedPauseForward: 260,
    integratedPauseReverse: 360,
    alternativeBuild: 1050,
    alternativeTraverse: 900,
    alternativeWait: 480,
    alternativeHold: 850,
    alternativeDecay: 650,
    alternativeRestart: 760
  };
  var PHASES = [null,
    { title: "01 — Osservazione", text: "L’unità più esposta produce video e coordinate. Il terminale immette l’informazione nella rete.", paths: ["u1-rete"] },
    { title: "02 — Trasmissione", text: "La distanza fisica rimane. La rete porta il flusso al comando senza richiedere la co-localizzazione dei soggetti.", paths: ["rete-c2"] },
    { title: "03 — Decisione", text: "Il comando elabora il quadro e restituisce ordine e coordinate, attraverso la rete, a un’altra unità dispersa sul terreno.", paths: ["c2-rete", "rete-u2"] },
    { title: "04 — Azione", text: "L’effettore agisce. Starlink non produce l’effetto: ha contribuito a mantenere collegati gli elementi che lo producono.", paths: [] }
  ];
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ridotto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var componenti = document.querySelectorAll("[data-starlink-flow]");
  if (!componenti.length) return;
  function ogni(nodes, callback) { Array.prototype.forEach.call(nodes, callback); }
  function rimuoviPrefisso(el, prefisso) { Array.prototype.slice.call(el.classList).forEach(function (nome) { if (nome.indexOf(prefisso) === 0) el.classList.remove(nome); }); }
  function creaScia(path, contenitore, durata, valido, alternativa) {
    return new Promise(function (resolve) {
      if (!path || !contenitore || !valido()) return resolve(false);
      var scia = document.createElementNS(SVG_NS, "path");
      scia.setAttribute("d", path.getAttribute("d"));
      scia.setAttribute("pathLength", "100");
      scia.setAttribute("class", "starlink-flow__signal" + (alternativa ? " starlink-flow__signal--alternative" : ""));
      contenitore.appendChild(scia);
      var animazione = typeof scia.animate === "function" ? scia.animate(
        [{ strokeDashoffset: "12" }, { strokeDashoffset: "-100" }],
        { duration: durata, easing: "linear", fill: "forwards" }
      ) : null;
      var inizio = performance.now();
      function chiudi(ok) {
        if (animazione) animazione.cancel();
        scia.remove();
        resolve(ok);
      }
      function frame(ora) {
        if (!valido()) return chiudi(false);
        var progresso = Math.min(1, (ora - inizio) / durata);
        if (!animazione) scia.style.strokeDashoffset = String(12 - 112 * progresso);
        if (progresso < 1) requestAnimationFrame(frame); else chiudi(true);
      }
      requestAnimationFrame(frame);
    });
  }
  function disegnaLinea(path, durata, valido) {
    return new Promise(function (resolve) {
      if (!path || !valido()) return resolve(false);
      path.style.opacity = "1";
      var animazione = typeof path.animate === "function" ? path.animate(
        [{ strokeDasharray: "100 100", strokeDashoffset: "100" }, { strokeDasharray: "100 100", strokeDashoffset: "0" }],
        { duration: durata, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }
      ) : null;
      var inizio = performance.now();
      function chiudi(ok) {
        if (animazione) animazione.cancel();
        if (ok) { path.style.opacity = "1"; path.style.strokeDasharray = "4 5"; path.style.strokeDashoffset = "0"; }
        resolve(ok);
      }
      function frame(ora) {
        if (!valido()) return chiudi(false);
        var progresso = Math.min(1, (ora - inizio) / durata);
        if (!animazione) { path.style.strokeDasharray = "100 100"; path.style.strokeDashoffset = String(100 - 100 * progresso); }
        if (progresso < 1) requestAnimationFrame(frame); else chiudi(true);
      }
      requestAnimationFrame(frame);
    });
  }
  ogni(componenti, function (radice) {
    var fase = 0, auto = false, autoTimer = null, upperToken = 0, lowerToken = 0;
    var lowerTimers = [], upperInView = true, lowerInView = false, modalita = "integrated";
    var nextButton = radice.querySelector("[data-next]");
    var autoButton = radice.querySelector("[data-auto]");
    var autoState = radice.querySelector("[data-auto-state]");
    var phaseCount = radice.querySelector("[data-phase-count]");
    var phaseTitle = radice.querySelector("[data-phase-title]");
    var phaseText = radice.querySelector("[data-phase-text]");
    var manualStatus = radice.querySelector("[data-manual-status]");
    var upperPulses = radice.querySelector("[data-upper-pulses]");
    var lowerPulses = radice.querySelector("[data-lower-pulses]");
    var attackLayer = radice.querySelector("[data-attack-layer]");
    var modeButtons = radice.querySelectorAll("[data-mode]");
    var costPanel = radice.querySelector("[data-cost-panel]");
    var latency = radice.querySelector("[data-latency]");
    var alternativeNote = radice.querySelector("[data-alternative-note]");
    radice.classList.add("is-enhanced");
    function paginaVisibile() { return document.visibilityState !== "hidden"; }
    function pulisciScie(tipo) {
      var selector = tipo === "upper" ? "[data-upper-pulses] .starlink-flow__signal" : "[data-lower-pulses] .starlink-flow__signal";
      ogni(radice.querySelectorAll(selector), function (n) { n.remove(); });
    }
    function scieSuperiori(nomi, durata, token) {
      return Promise.all(nomi.map(function (nome) {
        return creaScia(radice.querySelector('[data-upper-path="' + nome + '"]'), upperPulses, durata, function () {
          return token === upperToken && upperInView && paginaVisibile() && !ridotto;
        }, false);
      }));
    }
    function rimuoviAttacco() { if (attackLayer) attackLayer.textContent = ""; }
    function disegnaAttacco() {
      if (!attackLayer || fase !== 4) return;
      var gruppo = document.createElementNS(SVG_NS, "g");
      var asta = document.createElementNS(SVG_NS, "path");
      var punta = document.createElementNS(SVG_NS, "path");
      asta.setAttribute("class", "starlink-flow__attack-shaft");
      asta.setAttribute("pathLength", "100");
      asta.setAttribute("d", "M748 525 C950 505 1180 470 1475 455");
      punta.setAttribute("class", "starlink-flow__attack-head");
      punta.setAttribute("d", "M1484 455 L1458 443 L1462 455 L1458 467 Z");
      gruppo.style.setProperty("--sl-attack-duration", CONFIG.attackDraw + "ms");
      gruppo.style.setProperty("--sl-attack-delay", Math.round(CONFIG.attackDraw * .86) + "ms");
      gruppo.appendChild(asta); gruppo.appendChild(punta); attackLayer.appendChild(gruppo);
      if (ridotto) return;
      requestAnimationFrame(function () { asta.classList.add("is-drawing"); punta.classList.add("is-drawing"); });
    }
    async function animaFaseSuperiore() {
      upperToken += 1; var token = upperToken; pulisciScie("upper");
      if (ridotto || !upperInView || !paginaVisibile() || fase === 0 || fase === 4) return;
      if (fase === 3) {
        var primo = await scieSuperiori(["c2-rete"], CONFIG.upperDecisionLeg, token);
        if (!primo[0] || token !== upperToken) return;
        if (!(await attesa(CONFIG.upperDecisionGap, "upper", token))) return;
        await scieSuperiori(["rete-u2"], CONFIG.upperDecisionLeg, token);
      } else await scieSuperiori(PHASES[fase].paths, CONFIG.upperSingle, token);
    }
    function renderFase(manuale) {
      upperToken += 1; pulisciScie("upper"); rimuoviAttacco(); rimuoviPrefisso(radice, "is-phase-");
      if (fase > 0) radice.classList.add("is-phase-" + fase);
      phaseCount.textContent = String(fase).padStart(2, "0") + "/04";
      if (fase === 0) { phaseTitle.textContent = "Pronto"; phaseText.textContent = "Avanza per seguire il percorso dell’informazione, dall’unità esposta all’effetto sul terreno."; }
      else { phaseTitle.textContent = PHASES[fase].title; phaseText.textContent = PHASES[fase].text; if (manuale && manualStatus) manualStatus.textContent = PHASES[fase].title + ". " + PHASES[fase].text; }
      if (fase === 4) disegnaAttacco();
      animaFaseSuperiore();
    }
    function cancellaAutoTimer() { if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; } }
    function pianificaAuto() { cancellaAutoTimer(); if (!auto || !upperInView || !paginaVisibile()) return; autoTimer = window.setTimeout(function () { autoTimer = null; avanza(false); }, CONFIG.phaseStay); }
    function avanza(manuale) { fase = fase >= 4 ? 1 : fase + 1; renderFase(manuale); pianificaAuto(); }
    function impostaAuto(attivo) { auto = attivo; autoButton.setAttribute("aria-pressed", String(auto)); autoState.textContent = auto ? "ON" : "OFF"; if (auto && fase === 0) avanza(false); else pianificaAuto(); }
    function attesa(ms, tipo, token) {
      return new Promise(function (resolve) {
        var id = window.setTimeout(function () { if (tipo === "lower") lowerTimers = lowerTimers.filter(function (v) { return v !== id; }); resolve(tipo === "upper" ? token === upperToken : token === lowerToken); }, ms);
        if (tipo === "lower") lowerTimers.push(id);
      });
    }
    function resetAlt() {
      radice.classList.remove("is-alt-od", "is-alt-decision", "is-alt-da", "is-alt-action", "is-alt-decay");
      ogni(radice.querySelectorAll("[data-alt-path]"), function (path) { if (path.getAnimations) path.getAnimations().forEach(function (a) { a.cancel(); }); path.removeAttribute("style"); });
    }
    function cancellaCicloInferiore() { lowerToken += 1; lowerTimers.forEach(clearTimeout); lowerTimers = []; pulisciScie("lower"); resetAlt(); }
    function scieInferiori(nomi, durata, token, alternativa) {
      return Promise.all(nomi.map(function (nome) {
        var selector = alternativa ? '[data-alt-path="' + nome + '"]' : '[data-lower-path="' + nome + '"]';
        return creaScia(radice.querySelector(selector), lowerPulses, durata, function () {
          return token === lowerToken && lowerInView && paginaVisibile() && modalita === (alternativa ? "alternative" : "integrated") && !ridotto;
        }, alternativa);
      }));
    }
    async function circuitoIntegrato(token) {
      while (token === lowerToken && lowerInView && paginaVisibile() && modalita === "integrated") {
        await scieInferiori(["od-forward", "da-forward"], CONFIG.integratedTraverse, token, false);
        if (!(await attesa(CONFIG.integratedPauseForward, "lower", token))) return;
        await scieInferiori(["ad-reverse", "do-reverse"], CONFIG.integratedTraverse, token, false);
        if (!(await attesa(CONFIG.integratedPauseReverse, "lower", token))) return;
      }
    }
    async function costruisciAlt(nome, classe, token) {
      radice.classList.add(classe);
      var path = radice.querySelector('[data-alt-path="' + nome + '"]');
      var ok = await disegnaLinea(path, CONFIG.alternativeBuild, function () { return token === lowerToken && lowerInView && paginaVisibile() && modalita === "alternative" && !ridotto; });
      if (!ok) return false;
      var transito = await scieInferiori([nome], CONFIG.alternativeTraverse, token, true);
      return !!transito[0];
    }
    async function circuitoAlternativo(token) {
      while (token === lowerToken && lowerInView && paginaVisibile() && modalita === "alternative") {
        resetAlt();
        if (!(await costruisciAlt("od", "is-alt-od", token))) return;
        radice.classList.add("is-alt-decision");
        if (!(await attesa(CONFIG.alternativeWait, "lower", token))) return;
        if (!(await costruisciAlt("da", "is-alt-da", token))) return;
        radice.classList.add("is-alt-action");
        if (!(await attesa(CONFIG.alternativeHold, "lower", token))) return;
        radice.classList.add("is-alt-decay");
        if (!(await attesa(CONFIG.alternativeDecay, "lower", token))) return;
        resetAlt();
        if (!(await attesa(CONFIG.alternativeRestart, "lower", token))) return;
      }
    }
    function avviaCicloInferiore() {
      cancellaCicloInferiore();
      if (!lowerInView || !paginaVisibile()) return;
      var token = lowerToken;
      if (ridotto) { if (modalita === "alternative") radice.classList.add("is-alt-od", "is-alt-decision", "is-alt-da", "is-alt-action"); return; }
      if (modalita === "integrated") circuitoIntegrato(token); else circuitoAlternativo(token);
    }
    function impostaModalita(nuova, spostaFocus) {
      modalita = nuova; var attivo = null;
      ogni(modeButtons, function (button) { var on = button.getAttribute("data-mode") === modalita; button.setAttribute("aria-selected", String(on)); button.tabIndex = on ? 0 : -1; if (on) attivo = button; });
      radice.classList.toggle("is-alternative", modalita === "alternative"); latency.hidden = modalita !== "integrated"; alternativeNote.hidden = modalita !== "alternative";
      if (costPanel && attivo) costPanel.setAttribute("aria-labelledby", attivo.id); if (spostaFocus && attivo) attivo.focus(); avviaCicloInferiore();
    }
    nextButton.addEventListener("click", function () { avanza(true); });
    autoButton.addEventListener("click", function () { impostaAuto(!auto); });
    ogni(modeButtons, function (button) {
      button.addEventListener("click", function () { impostaModalita(button.getAttribute("data-mode"), false); });
      button.addEventListener("keydown", function (event) { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(event.key) === -1) return; event.preventDefault(); impostaModalita(button.getAttribute("data-mode") === "integrated" ? "alternative" : "integrated", true); });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { upperInView = entries[0].isIntersecting; upperToken += 1; pulisciScie("upper"); if (upperInView && paginaVisibile()) { animaFaseSuperiore(); pianificaAuto(); } else cancellaAutoTimer(); }, { threshold: .08 }).observe(radice.querySelector(".starlink-flow__operativo"));
      new IntersectionObserver(function (entries) { var prima = lowerInView; lowerInView = entries[0].isIntersecting; if (lowerInView !== prima) avviaCicloInferiore(); }, { threshold: .08 }).observe(radice.querySelector(".starlink-flow__concetto"));
    } else { lowerInView = true; avviaCicloInferiore(); }
    document.addEventListener("visibilitychange", function () { upperToken += 1; pulisciScie("upper"); if (!paginaVisibile()) { cancellaAutoTimer(); cancellaCicloInferiore(); return; } if (upperInView) { animaFaseSuperiore(); pianificaAuto(); } avviaCicloInferiore(); });
    renderFase(false); impostaModalita("integrated", false);
  });
})();
