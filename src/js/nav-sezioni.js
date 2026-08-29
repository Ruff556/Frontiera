/* Navigazione delle sezioni — miglioramento progressivo, generale.
   Componente comune a TUTTI i contenuti editoriali lunghi (schede F, schede P,
   articoli di Attualità/Strategia/Sistemi, futuri layout): non è legato ai nomi
   editoriali. Si attiva quando la pagina dichiara il contratto di markup comune
   data-section-navigation sul contenitore del solo corpo indicizzabile.

   Fonte unica dei dati: gli <h2> figli diretti di quel contenitore (le sezioni
   "##" del contenuto). Gli apparati che seguono il corpo — "I nodi della fase"
   (.fasenodi), la navigazione sequenziale (.fasenav), il box "Schede collegate"
   (.relbox) — vivono fuori dal contenitore o come figli non-h2, e sono quindi
   esclusi automaticamente.

   Senza JS: il contenuto resta leggibile, lo scroll funziona e — se gli id sono
   generati in build — i link con hash restano validi.

   Due traduzioni dello stesso sistema:
   - Desktop/tablet largo: rail compatta di tacche a destra, centrata
     nell'area di lettura, con pannello "liquid glass" che si espande verso
     sinistra al passaggio del cursore o al focus mostrando i titoli.
   - Schermi stretti: rullino tattile fisso in alto a destra.
*/
(function () {
  "use strict";

  // Contratto comune: il contenitore del solo corpo editoriale indicizzabile.
  var body = document.querySelector("[data-section-navigation]");
  if (!body) return; // Nessun contenuto abilitato in pagina.

  // Sequenza ordinata delle tappe, nell'ordine DOM reale del corpo:
  //  - tutti gli h2 figli diretti del contenitore (i titoli attuali);
  //  - il PRIMO blocco .derivazione figlio diretto, come "Schema di derivazione";
  //  - gli stop custom dichiarati con data-section-navigation-stop,
  //    nella sua esatta posizione fra le sezioni che lo precedono e lo seguono
  //    (presente solo nelle schede che lo contengono; ignorato altrove).
  // Gli apparati (.fasenodi/.fasenav/.relbox) sono fuori dal contenitore o non
  // sono h2 figli diretti, quindi restano esclusi automaticamente.
  var stops = [];
  var kids = body.children;
  var derivSeen = false;
  for (var k = 0; k < kids.length; k++) {
    var node = kids[k];
    if (node.tagName === "H2") {
      stops.push({ el: node, kind: "heading", label: null });
    } else if (
      !derivSeen &&
      node.classList &&
      node.classList.contains("derivazione")
    ) {
      derivSeen = true; // solo il primo blocco: una sola tappa fissa per scheda
      stops.push({ el: node, kind: "derivation", label: "Schema di derivazione" });
    } else if (node.hasAttribute && node.hasAttribute("data-section-navigation-stop")) {
      stops.push({
        el: node,
        kind: "custom",
        label: node.getAttribute("data-section-navigation-label") || "Schema",
      });
    }
  }
  if (stops.length < 2) return; // Con meno di 2 tappe un navigatore non serve.

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- id stabili e leggibili (fallback se la build non li ha già messi) ----
  function makeSlug(text) {
    var s = text.toString().replace(/&[^;]+;/g, " ");
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    s = s
      .toLowerCase()
      .replace(/['‘’´`]/g, "-") // apostrofi -> trattino
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return s || "sezione";
  }
  var used = {};
  var sections = stops.map(function (st, i) {
    var el = st.el;
    var id = el.id;
    if (!id) {
      // Lo schema usa l'ancora fissa; gli h2 lo slug leggibile. In entrambi i casi
      // la build dovrebbe averlo già messo: qui è solo un fallback coerente.
      id = st.kind === "derivation" ? "schema-di-derivazione" : makeSlug(st.label || el.textContent);
      var base = id,
        n = 2;
      while (used[id] || document.getElementById(id)) id = base + "-" + n++;
      el.id = id;
    }
    used[id] = true;
    return {
      id: id,
      title: st.label || el.textContent.trim(),
      el: el,
      index: i,
    };
  });

  // ---- altezza reale dell'header sticky, esposta come variabile CSS ----
  var navH = 60;
  var headerEl = document.querySelector("header.nav");
  function rootFontPx() {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  }
  function scrollMarginPx() {
    return 5.5 * rootFontPx(); // deve combaciare con scroll-margin-top in CSS
  }
  function measure() {
    navH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 60;
    document.documentElement.style.setProperty("--secnav-nav-h", navH + "px");
  }
  measure();

  var activeIndex = -1;
  var listeners = []; // callback(idx) chiamati quando cambia la sezione attiva

  function setActive(idx) {
    if (idx === activeIndex) return;
    activeIndex = idx;
    for (var i = 0; i < listeners.length; i++) listeners[i](idx);
  }

  /* =====================================================================
     RILEVAMENTO SEZIONE ATTIVA
     La fascia di attivazione è una linea unica sotto l'header. L'osservatore
     usa quella stessa linea come bordo (rootMargin), così lo stato cambia
     esattamente quando un titolo la attraversa: nessun aggiornamento tardivo.
     ===================================================================== */
  function activationLine() {
    return navH + Math.min(window.innerHeight * 0.22, 220);
  }
  function computeActive() {
    // Durante una navigazione programmata lo stato resta bloccato sul target.
    if (navLock) {
      if (activeIndex !== navTarget) setActive(navTarget);
      return;
    }
    var line = activationLine();
    var idx = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top - line <= 0) idx = i;
      else break;
    }
    // Ultima sezione: se il fondo di una pagina scrollabile è raggiunto, forza
    // l'ultima (evita che resti "attiva" una sezione più in alto a fine articolo).
    var doc = document.documentElement;
    if (
      doc.scrollHeight > window.innerHeight + 4 &&
      window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2
    ) {
      idx = sections.length - 1;
    }
    setActive(idx);
  }

  var io = null;
  function setupObserver() {
    if (io) io.disconnect();
    var line = Math.round(activationLine());
    io = new IntersectionObserver(function () {
      computeActive();
    }, { rootMargin: "-" + line + "px 0px 0px 0px", threshold: [0, 1] });
    sections.forEach(function (s) {
      io.observe(s.el);
    });
  }
  setupObserver();

  /* =====================================================================
     NAVIGAZIONE PROGRAMMATA (click / rullino) — simmetrica su e giù
     Si registra un target "bloccato": lo stato va subito al target, parte un
     solo smooth scroll, e l'IntersectionObserver non può riportare l'indicatore
     su sezioni intermedie. Il blocco si rilascia quando lo scroll si ferma
     (posizione target raggiunta o scroll fermo), poi si sincronizza sul reale.
     ===================================================================== */
  var navLock = false;
  var navTarget = -1;
  var navRAF = 0;
  var navTimer = 0;
  var navScrollEnd = null;

  function clearNavWatch() {
    if (navRAF) {
      cancelAnimationFrame(navRAF);
      navRAF = 0;
    }
    if (navTimer) {
      clearTimeout(navTimer);
      navTimer = 0;
    }
    if (navScrollEnd) {
      window.removeEventListener("scrollend", navScrollEnd);
      navScrollEnd = null;
    }
  }
  function releaseNav() {
    navLock = false;
    clearNavWatch();
    computeActive(); // sincronizzazione finale sulla posizione reale
  }

  function targetScrollY(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset;
    var y = top - scrollMarginPx();
    var doc = document.documentElement;
    var max = Math.max(0, doc.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(y, max));
  }

  // fromKeyboard: sposta il focus sul titolo SOLO se la navigazione parte da
  // tastiera/AT. Con touch o mouse il titolo non riceve focus, quindi niente
  // rettangolo di focus attorno all'h2 raggiunto. Gli indicatori da tastiera
  // (:focus-visible) restano intatti dove servono.
  function goTo(idx, updateHash, fromKeyboard) {
    var s = sections[idx];
    if (!s) return;

    navTarget = idx;
    navLock = true;
    setActive(idx); // stato visivo immediato verso il target

    if (updateHash) {
      var url = "#" + s.id;
      try {
        if (history.replaceState) history.replaceState(null, "", url);
        else location.hash = s.id;
      } catch (e3) {
        location.hash = s.id;
      }
    }

    function focusTitle() {
      if (!fromKeyboard) return;
      if (!s.el.hasAttribute("tabindex")) s.el.setAttribute("tabindex", "-1");
      try {
        s.el.focus({ preventScroll: true });
      } catch (e2) {}
    }

    clearNavWatch();

    if (reduceMotion) {
      s.el.scrollIntoView({ block: "start" });
      focusTitle();
      releaseNav();
      return;
    }

    var ty = targetScrollY(s.el);
    try {
      s.el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      s.el.scrollIntoView();
    }
    focusTitle();

    // Rilascio su scrollend (dove supportato) …
    navScrollEnd = function () {
      if (navLock && navTarget === idx) releaseNav();
    };
    if ("onscrollend" in window)
      window.addEventListener("scrollend", navScrollEnd);

    // … e/o quando lo scroll si ferma (target raggiunto o posizione stabile),
    //     indipendente da durata, browser e preferenze.
    var stable = 0;
    var lastY = null;
    function watch() {
      if (!navLock || navTarget !== idx) return;
      var y = window.pageYOffset;
      if (Math.abs(y - ty) <= 2 || (lastY !== null && Math.abs(y - lastY) < 0.5))
        stable++;
      else stable = 0;
      lastY = y;
      if (stable >= 3) {
        releaseNav();
        return;
      }
      navRAF = requestAnimationFrame(watch);
    }
    navRAF = requestAnimationFrame(watch);

    // Rete di sicurezza: nessun timer come UNICA soluzione, solo come fallback.
    navTimer = setTimeout(function () {
      if (navLock && navTarget === idx) releaseNav();
    }, 1600);
  }

  /* =====================================================================
     DESKTOP / TABLET LARGO
     Due ruoli visivi distinti nello stesso contenitore:
     - .secnav-rail : capsula bianca sempre visibile con le tacche (cave;
       attiva piena). È il cardine verticale, resta sul margine destro.
     - .secnav-panel: pannello liquid glass con i SOLI titoli, che compare a
       sinistra al passaggio del cursore o al focus. La rail non si allunga.
     ===================================================================== */
  // Contenitore-cornice cui ancorare la rail desktop: deve stabilire il contesto
  // di posizionamento (position:relative) e la misura editoriale. Nelle schede
  // F/P è .fasewrap (griglia a due colonne); negli articoli è il foglio .reading
  // (.foglio è già relative). Fallback prudente: il genitore del corpo.
  var wrap = body.closest(".fasewrap") || body.closest(".reading") || body.parentNode;
  var tickItems = [];
  var titleItems = [];
  var titlesUl = null;
  if (wrap) {
    var rootNav = document.createElement("nav");
    rootNav.className = "secnav";
    rootNav.setAttribute("aria-label", "Navigazione delle sezioni");

    var sticky = document.createElement("div");
    sticky.className = "secnav-sticky";

    // --- pannello dei titoli (a sinistra, compare all'apertura) ---
    var panel = document.createElement("div");
    panel.className = "secnav-panel";
    titlesUl = document.createElement("ul");
    titlesUl.className = "secnav-titles";

    // --- rail delle tacche (a destra, sempre visibile) ---
    var railBox = document.createElement("div");
    railBox.className = "secnav-rail";
    var ticksUl = document.createElement("ul");
    ticksUl.className = "secnav-ticks";
    ticksUl.setAttribute("aria-hidden", "true");

    sections.forEach(function (s) {
      // voce-titolo (link reale, focalizzabile da tastiera)
      var tli = document.createElement("li");
      var ta = document.createElement("a");
      ta.className = "secnav-title";
      ta.href = "#" + s.id;
      ta.textContent = s.title;
      ta.addEventListener("click", function (ev) {
        ev.preventDefault();
        var kb = ev.detail === 0; // detail 0 = attivazione da tastiera
        goTo(s.index, true, kb);
        // Mouse/puntatore: rilascia il focus dal link così :focus-within non
        // tiene aperto il pannello — la chiusura torna a dipendere dall'hover.
        // Da tastiera il focus resta visibile (accessibilità).
        if (!kb) ta.blur();
      });
      ta.addEventListener("mouseenter", function () {
        if (tickItems[s.index]) tickItems[s.index].classList.add("is-hover");
      });
      ta.addEventListener("mouseleave", function () {
        if (tickItems[s.index]) tickItems[s.index].classList.remove("is-hover");
      });
      tli.appendChild(ta);
      titlesUl.appendChild(tli);
      titleItems.push(ta);

      // tacca (cliccabile col mouse, fuori dal tab order: i titoli bastano)
      var kli = document.createElement("li");
      var ka = document.createElement("a");
      ka.className = "secnav-tickitem";
      ka.href = "#" + s.id;
      ka.tabIndex = -1;
      ka.setAttribute("aria-hidden", "true");
      var tick = document.createElement("span");
      tick.className = "secnav-tick";
      ka.appendChild(tick);
      ka.addEventListener("click", function (ev) {
        ev.preventDefault();
        goTo(s.index, true, false);
        ka.blur(); // click sempre da puntatore: non trattenere il pannello aperto
      });
      kli.appendChild(ka);
      ticksUl.appendChild(kli);
      tickItems.push(ka);
    });

    panel.appendChild(titlesUl);
    railBox.appendChild(ticksUl);
    sticky.appendChild(panel);
    sticky.appendChild(railBox);
    rootNav.appendChild(sticky);
    wrap.appendChild(rootNav);

    // All'apertura porta la voce attiva nell'area visibile del pannello.
    function revealActive() {
      var it = titleItems[activeIndex];
      if (!it || !titlesUl) return;
      var top = it.offsetTop;
      var h = it.offsetHeight;
      if (top < titlesUl.scrollTop) titlesUl.scrollTop = top - 8;
      else if (top + h > titlesUl.scrollTop + titlesUl.clientHeight)
        titlesUl.scrollTop = top + h - titlesUl.clientHeight + 8;
    }
    rootNav.addEventListener("mouseenter", revealActive);
    rootNav.addEventListener("focusin", revealActive);

    // Frecce su/giù fra i titoli (miglioramento, non sostituisce Tab).
    rootNav.addEventListener("keydown", function (ev) {
      var pos = titleItems.indexOf(document.activeElement);
      if (pos === -1) return;
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
        ev.preventDefault();
        titleItems[Math.min(pos + 1, titleItems.length - 1)].focus();
      } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        titleItems[Math.max(pos - 1, 0)].focus();
      }
    });

    listeners.push(function (idx) {
      for (var i = 0; i < titleItems.length; i++) {
        var on = i === idx;
        titleItems[i].classList.toggle("is-active", on);
        tickItems[i].classList.toggle("is-active", on);
        if (on) titleItems[i].setAttribute("aria-current", "true");
        else titleItems[i].removeAttribute("aria-current");
      }
    });
  }

  /* =====================================================================
     RULLINO MOBILE / SCHERMI STRETTI
     ===================================================================== */
  var narrowMQ = window.matchMedia("(max-width: 1139px)");
  var roll = document.createElement("nav");
  roll.className = "secroll";
  roll.setAttribute("aria-label", "Navigazione delle sezioni");

  // Vero elenco di link per tecnologie assistive (alternativa al gesto).
  var a11yList = document.createElement("ul");
  a11yList.className = "secroll-links";
  sections.forEach(function (s) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#" + s.id;
    a.textContent = s.title;
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      goTo(s.index, true, ev.detail === 0);
    });
    li.appendChild(a);
    a11yList.appendChild(li);
  });
  roll.appendChild(a11yList);

  var capsule = document.createElement("div");
  capsule.className = "secroll-capsule";
  // La pillola diventa un vero controllo: apre il menu-indice al tap/click e
  // dalla tastiera. Espone stato e pannello controllato per le AT.
  capsule.setAttribute("role", "button");
  capsule.setAttribute("tabindex", "0");
  capsule.setAttribute("aria-haspopup", "true");
  capsule.setAttribute("aria-expanded", "false");
  capsule.setAttribute("aria-controls", "secroll-menu");
  capsule.setAttribute("aria-label", "Indice delle sezioni");

  var track = document.createElement("div");
  track.className = "secroll-track";
  var rollTicks = sections.map(function () {
    var t = document.createElement("span");
    t.className = "secroll-tick";
    track.appendChild(t);
    return t;
  });
  capsule.appendChild(track);
  roll.appendChild(capsule);

  var popup = document.createElement("div");
  popup.className = "secroll-popup";
  popup.setAttribute("aria-hidden", "true");
  var popupText = document.createElement("span");
  popupText.className = "secroll-popup-text";
  popup.appendChild(popupText);
  roll.appendChild(popup);

  // --- menu-indice mobile: pannello liquid glass con i SOLI titoli, si apre a
  //     sinistra al tap sulla pillola. Riusa la stessa sequenza `sections`. ---
  var menu = document.createElement("div");
  menu.className = "secroll-menu";
  menu.id = "secroll-menu";
  menu.setAttribute("aria-label", "Indice delle sezioni");
  var menuList = document.createElement("ul");
  menuList.className = "secroll-menu-list";
  var menuItems = sections.map(function (s) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.className = "secroll-menu-item";
    a.href = "#" + s.id;
    a.textContent = s.title;
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      selectFromMenu(s.index, ev.detail === 0); // detail 0 = attivazione tastiera
    });
    li.appendChild(a);
    menuList.appendChild(li);
    return a;
  });
  menu.appendChild(menuList);
  roll.appendChild(menu);

  document.body.appendChild(roll);

  var STEP = 22; // px per sezione nel rullino
  var position = 0;
  var selected = 0;

  function hapticPulse(duration) {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }

  function hapticTick() {
    hapticPulse(28);
  }

  function hapticMenu() {
    hapticPulse(16);
  }

  function renderRoll(pos) {
    position = pos;
    for (var i = 0; i < rollTicks.length; i++) {
      var d = i - pos;
      var ad = Math.abs(d);
      var tk = rollTicks[i];
      if (ad > 2.35) {
        tk.style.opacity = "0";
        tk.style.transform = "translateY(" + d * STEP + "px) scale(.6)";
        tk.style.pointerEvents = "none";
        tk.classList.remove("is-center");
        continue;
      }
      var scale = 1 - Math.min(ad * 0.08, 0.16);
      var opacity = 1 - Math.min(ad * 0.4, 0.82);
      tk.style.opacity = String(opacity);
      tk.style.transform =
        "translateY(" +
        d * STEP +
        "px)" +
        " scale(" +
        scale +
        ")";
      tk.classList.toggle("is-center", Math.round(pos) === i);
    }
  }

  function setSelected(idx, showPop) {
    idx = Math.max(0, Math.min(sections.length - 1, idx));
    if (idx !== selected) {
      selected = idx;
      hapticTick();
    }
    if (showPop) {
      popupText.textContent = sections[selected].title;
      popup.classList.add("is-open");
    }
    capsule.setAttribute("aria-valuenow", String(selected + 1));
  }

  var dragging = false;
  var startY = 0;
  var startPos = 0;
  var moved = false;
  var popupHideT = null;

  capsule.addEventListener(
    "pointerdown",
    function (ev) {
      dragging = true;
      moved = false;
      startY = ev.clientY;
      startPos = activeIndex >= 0 ? activeIndex : 0;
      position = startPos;
      selected = startPos;
      if (popupHideT) {
        clearTimeout(popupHideT);
        popupHideT = null;
      }
      setSelected(startPos, true);
      renderRoll(startPos);
      try {
        capsule.setPointerCapture(ev.pointerId);
      } catch (e) {}
      capsule.classList.add("is-dragging");
    },
    { passive: true }
  );

  capsule.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var dy = ev.clientY - startY;
    if (Math.abs(dy) > 3) {
      // Vero trascinamento: se il menu era aperto va chiuso, poi il rullino
      // procede esattamente come prima.
      if (!moved && menuOpen) closeMenu(false);
      moved = true;
    }
    var pos = startPos - dy / STEP;
    pos = Math.max(0, Math.min(sections.length - 1, pos));
    renderRoll(pos);
    setSelected(Math.round(pos), true);
  });

  function endDrag(ev) {
    if (!dragging) return;
    dragging = false;
    capsule.classList.remove("is-dragging");
    try {
      capsule.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    if (moved) {
      renderRoll(selected);
      goTo(selected, true, false);
      popupHideT = setTimeout(function () {
        popup.classList.remove("is-open");
      }, 520);
    } else {
      // Tap breve, senza movimento significativo → menu-indice (toggle).
      if (popupHideT) {
        clearTimeout(popupHideT);
        popupHideT = null;
      }
      popup.classList.remove("is-open");
      selected = activeIndex >= 0 ? activeIndex : 0;
      renderRoll(selected);
      toggleMenu(false);
    }
  }
  capsule.addEventListener("pointerup", endDrag);
  capsule.addEventListener("pointercancel", endDrag);

  // Rest position del rullino segue la sezione attiva (quando non si trascina).
  listeners.push(function (idx) {
    if (dragging) return;
    selected = idx;
    renderRoll(idx);
    capsule.setAttribute("aria-valuenow", String(idx + 1));
  });

  // ----- Comparsa del rullino -----
  var pastStart = false;
  function updateRollVisibility() {
    var show = narrowMQ.matches && pastStart;
    roll.classList.toggle("is-visible", show);
    // Se il rullino non è più visibile (sopra il corpo o viewport tornato largo)
    // il menu eventualmente aperto va chiuso.
    if (!show) closeMenu(false);
  }

  // Il marker è ancorato all'inizio del contenitore indicizzabile, non al
  // primo h2: così il rullino entra appena il lettore raggiunge il corpo vero
  // della pagina, anche quando il corpo inizia con testo, media o uno schema.
  var startMarker = document.createElement("span");
  startMarker.className = "secroll-start-marker";
  startMarker.setAttribute("aria-hidden", "true");
  startMarker.style.cssText =
    "position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0;";
  if (getComputedStyle(body).position === "static") body.classList.add("secnav-start-anchor");
  body.insertBefore(startMarker, body.firstChild);

  var startObs = null;
  function setupStartObserver() {
    if (startObs) startObs.disconnect();
    var line = Math.round(navH + 12);
    startObs = new IntersectionObserver(
      function (entries) {
        var top = entries[0].boundingClientRect.top;
        pastStart = top <= line;
        updateRollVisibility();
      },
      { rootMargin: "-" + line + "px 0px 0px 0px", threshold: 0 }
    );
    startObs.observe(startMarker);
    pastStart = startMarker.getBoundingClientRect().top <= line;
    updateRollVisibility();
  }
  setupStartObserver();

  if (narrowMQ.addEventListener)
    narrowMQ.addEventListener("change", updateRollVisibility);
  else narrowMQ.addListener(updateRollVisibility);

  /* =====================================================================
     MENU-INDICE MOBILE — apertura/chiusura, accessibilità, hover fine-pointer.
     Non duplica la raccolta dei contenuti (usa `sections`) né lo smooth scroll
     (richiama `goTo`). Un solo impulso aptico per apertura e per selezione.
     ===================================================================== */
  var menuOpen = false;
  var mediaFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var hoverCloseT = null;

  // All'apertura porta la voce attiva nell'area visibile del pannello.
  function revealActiveMenuItem() {
    var it = menuItems[activeIndex];
    if (!it) return;
    var top = it.offsetTop;
    var h = it.offsetHeight;
    if (top < menuList.scrollTop) menuList.scrollTop = top - 8;
    else if (top + h > menuList.scrollTop + menuList.clientHeight)
      menuList.scrollTop = top + h - menuList.clientHeight + 8;
  }

  function syncMenuActive() {
    for (var i = 0; i < menuItems.length; i++) {
      var on = i === activeIndex;
      menuItems[i].classList.toggle("is-active", on);
      if (on) menuItems[i].setAttribute("aria-current", "true");
      else menuItems[i].removeAttribute("aria-current");
    }
  }

  // Listener esterno unico: registrato all'apertura, rimosso alla chiusura.
  // Usa 'pointerdown', così il gesto che ha aperto il menu (già concluso) non
  // viene interpretato come tocco esterno.
  function onMenuOutside(ev) {
    if (roll.contains(ev.target)) return;
    closeMenu(false);
  }
  function onMenuKey(ev) {
    if (ev.key === "Escape" || ev.key === "Esc") closeMenu(true);
  }

  function openMenu(fromKeyboard) {
    if (menuOpen) return;
    menuOpen = true;
    capsule.setAttribute("aria-expanded", "true");
    syncMenuActive();
    menu.classList.add("is-open");
    revealActiveMenuItem();
    hapticMenu(); // impulso di apertura
    document.addEventListener("pointerdown", onMenuOutside, true);
    document.addEventListener("keydown", onMenuKey, true);
    if (fromKeyboard) {
      var it = menuItems[activeIndex >= 0 ? activeIndex : 0] || menuItems[0];
      if (it) {
        try {
          it.focus();
        } catch (e) {}
      }
    }
  }

  function closeMenu(returnFocus) {
    if (hoverCloseT) {
      clearTimeout(hoverCloseT);
      hoverCloseT = null;
    }
    if (!menuOpen) return;
    menuOpen = false;
    capsule.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    document.removeEventListener("pointerdown", onMenuOutside, true);
    document.removeEventListener("keydown", onMenuKey, true);
    if (returnFocus) {
      try {
        capsule.focus();
      } catch (e) {}
    }
  }

  function toggleMenu(fromKeyboard) {
    if (menuOpen) closeMenu(fromKeyboard);
    else openMenu(fromKeyboard);
  }

  function selectFromMenu(idx, fromKeyboard) {
    hapticMenu(); // impulso unico di selezione: goTo non produce feedback aptico
    closeMenu(false);
    goTo(idx, true, fromKeyboard); // stessa navigazione di rullino e pannello
  }

  // Tastiera sulla pillola: apre/chiude senza dipendere da gesti o vibrazione.
  capsule.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
      ev.preventDefault();
      toggleMenu(true);
    } else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!menuOpen) openMenu(true);
      else {
        var it = menuItems[activeIndex >= 0 ? activeIndex : 0] || menuItems[0];
        if (it) it.focus();
      }
    } else if (ev.key === "Escape" || ev.key === "Esc") {
      if (menuOpen) {
        ev.preventDefault();
        closeMenu(true);
      }
    }
  });

  // Frecce dentro il menu (parità con il pannello desktop).
  menu.addEventListener("keydown", function (ev) {
    var pos = menuItems.indexOf(document.activeElement);
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      (menuItems[Math.min(pos + 1, menuItems.length - 1)] || menuItems[0]).focus();
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      (menuItems[Math.max(pos - 1, 0)] || menuItems[0]).focus();
    } else if (ev.key === "Home") {
      ev.preventDefault();
      menuItems[0].focus();
    } else if (ev.key === "End") {
      ev.preventDefault();
      menuItems[menuItems.length - 1].focus();
    }
  });

  // A menu aperto, mantieni evidenziata la sezione realmente attiva.
  listeners.push(function () {
    if (menuOpen) syncMenuActive();
  });

  // Desktop stretto con mouse/trackpad: il menu resta aperto sopra pillola e
  // pannello (uniti dalla zona di continuità .secroll-menu::after) e collassa
  // quando il cursore esce dall'area complessiva. Mai sui veri dispositivi touch.
  function armMenuHoverClose() {
    if (!mediaFine.matches) return;
    if (hoverCloseT) clearTimeout(hoverCloseT);
    hoverCloseT = setTimeout(function () {
      hoverCloseT = null;
      closeMenu(false);
    }, 120);
  }
  function menuPointerEnter(ev) {
    if (ev.pointerType === "touch") return;
    if (hoverCloseT) {
      clearTimeout(hoverCloseT);
      hoverCloseT = null;
    }
  }
  function menuPointerLeave(ev) {
    if (ev.pointerType === "touch") return;
    if (menuOpen) armMenuHoverClose();
  }
  capsule.addEventListener("pointerenter", menuPointerEnter);
  capsule.addEventListener("pointerleave", menuPointerLeave);
  menu.addEventListener("pointerenter", menuPointerEnter);
  menu.addEventListener("pointerleave", menuPointerLeave);

  /* ---- avvio ---- */
  renderRoll(0);
  computeActive();

  var reT = null;
  window.addEventListener(
    "resize",
    function () {
      if (reT) return;
      reT = setTimeout(function () {
        reT = null;
        measure();
        setupObserver();
        setupStartObserver();
        computeActive();
        if (!dragging) renderRoll(activeIndex >= 0 ? activeIndex : 0);
      }, 150);
    },
    { passive: true }
  );

  // Deep-link: se la pagina apre con un hash valido, allinea lo stato.
  if (location.hash) {
    var id = location.hash.slice(1);
    for (var j = 0; j < sections.length; j++) {
      if (sections[j].id === id) {
        setActive(j);
        renderRoll(j);
        break;
      }
    }
  }
})();
