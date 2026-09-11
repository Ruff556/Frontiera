/* STR2 — stati dichiarativi e una sola regia cancellabile per istanza. */
(function (global, document) {
  "use strict";
  var kit = global.FrontieraSchemaKit;
  if (!kit) return;

  // Valori illustrativi, modificabili qui. La SSA non è la media dei nodi.
  var THRESHOLD = 60;
  var DURATION = { change: 950, prepare: 600, collapse: 2600, loss: 1000, advance: 1050 };
  var BASE = { upper: 100, center: 100, lower: 100, ssa: 100, salient: 1, advance: 0, direct: 0, flanks: 0, concentrate: 0, warning: 0, rear: 0, offLabels: 0 };
  function scene(values) { return Object.assign({}, BASE, values); }
  var STATES = {
    off: scene({ offLabels: 1 }),
    direct: scene({ ssa: 85, direct: 1 }),
    combined1: scene({ ssa: 85, direct: 1, flanks: 1 }),
    combined2: scene({ upper: 0, center: 70, lower: 70, ssa: 72, direct: 1, flanks: 1 }),
    combined3: scene({ upper: 0, center: 70, lower: 0, ssa: 45, direct: 1, flanks: 1, warning: 1 }),
    collapse: scene({ upper: 0, center: 30, lower: 0, ssa: 18, direct: 1, concentrate: 1, warning: 1 }),
    loss: scene({ upper: 0, center: 30, lower: 0, ssa: 18, salient: .05 }),
    advance: scene({ upper: 0, center: 30, lower: 0, ssa: 18, salient: .05, advance: 1, rear: 1 })
  };
  var COPY = {
    off: ["Rete ridondante", "Tre linee sostengono la posizione avanzata.", "Il saliente Red è esposto sui fianchi, ma riceve sostegno da una rete ancora integra. Nessun attacco è attivo."],
    direct: ["Pressione semplice diretta", "La pressione incontra una posizione ben alimentata.", "Blue investe il saliente; nodi e linee Red restano operativi. Ridurlo con il solo urto richiede una significativa superiorità locale."],
    combined1: ["Avvio dell’attacco combinato", "La pressione investe anche ciò che permette di restare.", "Blue preme sul saliente e sui nodi logistici. La rete è ancora integra e la posizione rimane sostenibile."],
    combined2: ["Caduta del nodo superiore", "Una linea è neutralizzata. La rete tiene ancora.", "Il nodo superiore non alimenta più il saliente. I due canali rimasti compensano in parte: la ridondanza si riduce, ma la SSA resta sopra il 60%."],
    combined3: ["Caduta del nodo inferiore", "Sotto soglia, la posizione non scompare.", "Anche il sostegno inferiore è neutralizzato. Resta il canale centrale: il saliente può ancora resistere, ma in condizioni logistiche avverse. Esfiltrazione o perdita diventano possibilità concrete."],
    collapse: ["Crollo del sostegno residuo", "L’ultimo canale concentra sostegno e vulnerabilità.", "Rimasto solo, il nodo centrale sostiene il carico residuo e diventa un bersaglio prioritario. La sua efficienza crolla, compromettendo il mantenimento del saliente."],
    loss: ["Perdita della posizione avanzata", "Il saliente viene esfiltrato o perduto.", "Il sostegno non basta più. La trasparenza indica l’abbandono o l’eliminazione della posizione avanzata; i nodi retrostanti Red restano presenti."],
    advance: ["Avanzata Blue", "La perdita del saliente apre lo spazio all’avanzata.", "Blue entra nello spazio liberato. I nodi retrostanti, ancora collegati alla Base Red, costituiscono la nuova linea avversaria."],
    final: ["Il mantenimento passa a Blue", "Avanzare apre un nuovo problema: restare.", "Dopo l’esfiltrazione o la perdita del saliente, Blue occupa lo spazio liberato. Le nuove posizioni devono ora essere alimentate, protette e mantenute; il dispositivo Red resta attivo più indietro."]
  };
  var NODE_KEYS = ["upper", "center", "lower"];
  function init(root) {
    if (root.dataset.str2Ready) return;
    var ctx = kit.createContext(root);
    function one(selector) { return root.querySelector(selector); }
    function all(selector) { return Array.from(root.querySelectorAll(selector)); }
    var canvas = one("[data-str2-canvas]");
    var desc = one("[data-str2-desc]");
    var initialDescription = desc.textContent;
    var offLabels = one("[data-str2-off-labels]");
    var live = one("[data-schema-live]");
    var title = one("[data-str2-reading-title]");
    var text = one("[data-str2-reading-text]");
    var count = one("[data-str2-count]");
    var phaseLabel = one("[data-str2-phase-label]");
    var fieldLabel = one("[data-str2-field-label]");
    var modeButtons = all("[data-str2-mode]");
    var momentButtons = all("[data-str2-moment]");
    var back = one("[data-str2-back]");
    var next = one("[data-str2-next]");
    var nextLabel = one("[data-str2-next-label]");
    var salient = one("[data-str2-salient]");
    var salientLabel = one("[data-str2-salient-label]");
    var warning = one("[data-str2-warning]");
    var rearLine = one("[data-str2-rear-line]");
    var blueAfter = one("[data-str2-blue-after]");
    var redAfter = one("[data-str2-red-after]");
    var ssaMeter = one("[data-str2-ssa-meter]");
    var ssaFill = one("[data-str2-ssa-fill]");
    var ssaValue = one("[data-str2-ssa-value]");
    var ssaStatus = one("[data-str2-ssa-status]");
    var ssaPanel = one(".str2-schema__ssa");
    var nodes = {};
    NODE_KEYS.forEach(function (key) {
      nodes[key] = {
        blue: one('[data-str2-blue="' + key + '"]'), node: one('[data-str2-node="' + key + '"]'),
        blueLine: one('[data-str2-blue-line="' + key + '"]'), rear: one('[data-str2-rear-link="' + key + '"]'),
        supply: one('[data-str2-supply="' + key + '"]'), trace: one('[data-str2-supply-trace="' + key + '"]'),
        meter: one('[data-str2-node-meter="' + key + '"]'), fill: one('[data-str2-node-fill="' + key + '"]'), value: one('[data-str2-node-value="' + key + '"]')
      };
    });
    var vectors = {};
    all("[data-str2-vector]").forEach(function (group) {
      vectors[group.dataset.str2Vector] = { group: group, paths: Array.from(group.querySelectorAll("path")), pulse: group.querySelector(".str2-schema__pulse") };
    });
    var mode = "off";
    var moment = 0;
    var visual = Object.assign({}, STATES.off);
    var phase = "off";
    var queue = [];
    var segment = null;
    var raf = 0;
    var lastFrame = null;
    var suspended = false;
    var pulse = 1;
    var geometry;
    var announce = false;
    var motionQuery = global.matchMedia("(prefers-reduced-motion: reduce)");

    // Tutte le letture occupano la stessa cella: nessun salto dei controlli.
    Object.keys(COPY).forEach(function (key) {
      var sizer = document.createElement("div");
      sizer.className = "str2-schema__copy-sizer";
      sizer.setAttribute("aria-hidden", "true");
      var heading = document.createElement("h4");
      var paragraph = document.createElement("p");
      heading.textContent = COPY[key][1];
      paragraph.textContent = COPY[key][2];
      sizer.appendChild(heading);
      sizer.appendChild(paragraph);
      one("[data-str2-copy]").appendChild(sizer);
    });

    function setText(key) {
      phase = key;
      root.dataset.str2Phase = key;
      var copy = COPY[key];
      title.textContent = copy[1];
      text.textContent = copy[2];
      phaseLabel.textContent = copy[0];
      fieldLabel.textContent = mode === "off" ? "Assetto di base" : mode === "direct" ? "Pressione diretta" : "Attacco combinato · " + moment + "/4";
      count.textContent = mode === "off" ? "OFF · ASSETTO DI BASE" : mode === "direct" ? "STATO 1 · PRESSIONE DIRETTA" : "STATO 2 · MOMENTO " + moment + " DI 4";
      desc.textContent = mode === "off" ? initialDescription : count.textContent + ". " + copy[1] + " " + copy[2];
      if (announce) live.textContent = count.textContent + ". " + copy[1] + " " + copy[2];
    }

    function updateControls() {
      root.dataset.str2Mode = mode;
      root.dataset.str2Moment = String(moment);
      modeButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.str2Mode === mode)); });
      momentButtons.forEach(function (button) {
        var n = Number(button.dataset.str2Moment);
        button.setAttribute("aria-pressed", String(mode === "combined" && n === moment));
        button.dataset.past = String(mode === "combined" && n < moment);
      });
      back.disabled = mode === "off";
      next.disabled = mode === "combined" && moment === 4 && root.dataset.str2Settled !== "true";
      nextLabel.textContent = mode === "combined" && moment === 4 ? (next.disabled ? "In corso" : "Rivedi") : "Avanza";
    }

    function setPath(element, d) { element.setAttribute("d", d); }
    function translate(element, x, y) { element.setAttribute("transform", "translate(" + x + " " + y + ")"); }
    function opacity(element, value) { element.setAttribute("opacity", value.toFixed(4)); }
    function route(key, d, alpha) {
      var item = vectors[key];
      item.paths.forEach(function (path) { setPath(path, d); });
      opacity(item.group, alpha);
      item.pulse.setAttribute("stroke-dashoffset", String(10 - pulse * 117));
      opacity(item.pulse, motionQuery.matches || pulse >= 1 ? 0 : 1);
    }
    function meterValue(element, number) {
      var rounded = String(Math.round(number));
      if (element.getAttribute("aria-valuenow") !== rounded) element.setAttribute("aria-valuenow", rounded);
    }
    function paint() {
      if (!geometry) return;
      var g = geometry;
      var advance = visual.advance;
      var xSalient = g.salient;
      var yMid = g.center;
      // Le indicazioni iniziali seguono la stessa interpolazione dei vettori.
      opacity(offLabels, visual.offLabels);
      translate(salient, xSalient, yMid);
      opacity(salient, visual.salient);
      salientLabel.setAttribute("x", xSalient);
      salientLabel.setAttribute("y", yMid + 39);
      opacity(salientLabel, 1 - advance);
      salientLabel.textContent = visual.salient < .4 ? "Saliente perduto" : "Saliente";
      translate(warning, xSalient, yMid - 39);
      opacity(warning, visual.warning);
      translate(one('[data-str2-base="blue"]'), g.baseBlue, yMid);
      translate(one('[data-str2-base="red"]'), g.baseRed, yMid);
      var blueX = {};
      NODE_KEYS.forEach(function (key) {
        var node = nodes[key];
        var y = g[key];
        var xRed = key === "center" ? g.redCenter : g.redFlank;
        var start = key === "center" ? g.blueCenter : g.blueFlank;
        var end = key === "center" ? xSalient : g.blueEnd;
        var xBlue = start + (end - start) * advance;
        blueX[key] = xBlue;
        translate(node.blue, xBlue, y);
        translate(node.node, xRed, y);
        var blueD = key === "center" ? "M" + (g.baseBlue + 12) + " " + yMid + " L" + (xBlue - 12) + " " + y : "M" + (g.baseBlue + 12) + " " + yMid + " Q" + (g.baseBlue + (xBlue - g.baseBlue) * .35) + " " + y + " " + (xBlue - 12) + " " + y;
        setPath(node.blueLine, blueD);
        var rearD = key === "center" ? "M" + (g.baseRed - 13) + " " + yMid + " L" + (xRed + 17) + " " + y : "M" + (g.baseRed - 13) + " " + yMid + " Q" + (g.baseRed - 40) + " " + y + " " + (xRed + 17) + " " + y;
        setPath(node.rear, rearD);
        var supplyD = key === "center" ? "M" + (xRed - 15) + " " + y + " L" + (xSalient + 24) + " " + y : "M" + (xRed - 15) + " " + y + " Q" + (xSalient + (xRed - xSalient) * .35) + " " + y + " " + (xSalient + 13) + " " + (yMid + (key === "upper" ? -21 : 21));
        setPath(node.supply, supplyD);
        setPath(node.trace, supplyD);
        opacity(node.supply, (visual[key] / 100) * visual.salient);
        node.fill.style.transform = "scaleX(" + visual[key] / 100 + ")";
        node.value.textContent = String(Math.round(visual[key]));
        meterValue(node.meter, visual[key]);
      });
      var u = blueX.upper, c = blueX.center, l = blueX.lower;
      route("upper-salient", "M" + (u + 9) + " " + (g.upper + 9) + " Q" + (xSalient - 38) + " " + (yMid - 46) + " " + (xSalient - 15) + " " + (yMid - 21), visual.direct * .85);
      route("center-salient", "M" + (c + 15) + " " + yMid + " L" + (xSalient - 25) + " " + yMid, visual.direct);
      route("lower-salient", "M" + (l + 9) + " " + (g.lower - 9) + " Q" + (xSalient - 38) + " " + (yMid + 46) + " " + (xSalient - 15) + " " + (yMid + 21), visual.direct * .85);
      route("upper-node", "M" + (u + 14) + " " + (g.upper - 4) + " Q" + ((u + g.redFlank) / 2) + " " + (g.upper - 44) + " " + (g.redFlank - 19) + " " + (g.upper - 5), visual.flanks * (.22 + .78 * visual.upper / 100));
      route("lower-node", "M" + (l + 14) + " " + (g.lower + 4) + " Q" + ((l + g.redFlank) / 2) + " " + (g.lower + 44) + " " + (g.redFlank - 19) + " " + (g.lower + 5), visual.flanks * (.22 + .78 * visual.lower / 100));
      route("upper-center", "M" + (u + 14) + " " + (g.upper + 3) + " C" + (xSalient + 5) + " " + (g.upper + 10) + " " + (g.redCenter - 42) + " " + (yMid - 58) + " " + (g.redCenter - 14) + " " + (yMid - 18), visual.concentrate);
      route("lower-center", "M" + (l + 14) + " " + (g.lower - 3) + " C" + (xSalient + 5) + " " + (g.lower - 10) + " " + (g.redCenter - 42) + " " + (yMid + 58) + " " + (g.redCenter - 14) + " " + (yMid + 18), visual.concentrate);
      setPath(rearLine, "M" + g.redFlank + " " + g.upper + " Q" + (2 * g.redCenter - g.redFlank) + " " + yMid + " " + g.redFlank + " " + g.lower);
      opacity(rearLine, visual.rear);
      blueAfter.setAttribute("x", g.width * .29);
      blueAfter.setAttribute("y", g.height - 14);
      blueAfter.textContent = g.compact ? "Blue: da sostenere" : "Nuove posizioni da sostenere";
      redAfter.setAttribute("x", g.width * .77);
      redAfter.setAttribute("y", g.height - 14);
      opacity(blueAfter, advance);
      opacity(redAfter, visual.rear);
      ssaFill.style.transform = "scaleX(" + visual.ssa / 100 + ")";
      ssaValue.textContent = String(Math.round(visual.ssa));
      meterValue(ssaMeter, visual.ssa);
      var below = visual.ssa < THRESHOLD;
      ssaPanel.dataset.below = String(below);
      ssaStatus.textContent = below ? "< 60% · Posizione difficilmente mantenibile" : "≥ 60% · Posizione generalmente sostenibile";
    }

    function layout() {
      var width = canvas.getBoundingClientRect().width;
      if (!width) return;
      var compact = width < 520;
      var height = compact ? 326 : 292;
      geometry = {
        width: width, height: height, compact: compact,
        baseBlue: Math.max(20, width * .075), baseRed: Math.min(width - 20, width * .92),
        blueFlank: width * .34, blueCenter: Math.max(54, width * .21), blueEnd: width * .56,
        salient: width * .46, redFlank: width * .70, redCenter: width * .73,
        upper: compact ? 61 : 54, center: height / 2, lower: height - (compact ? 61 : 54)
      };
      canvas.setAttribute("viewBox", "0 0 " + width + " " + height);
      var narrow = width < 300;
      NODE_KEYS.forEach(function (key) {
        // Nei campi più stretti si adattano solo le nuove etichette, mai i simboli.
        var blueLabel = one('[data-str2-blue-label="' + key + '"]');
        var tightCenter = key === "center" && compact;
        var labelOffset = tightCenter ? Math.min(7, 5.5 + Math.max(0, width - 220) / 20) : 0;
        blueLabel.style.fontSize = narrow && tightCenter ? "10px" : "";
        translate(blueLabel, key === "center" ? geometry.blueCenter + labelOffset : geometry.blueFlank, geometry[key] + (narrow && tightCenter ? 25 : 26));
        translate(one('[data-str2-node-label="' + key + '"]'), key === "center" ? geometry.redCenter - (narrow ? 8 : 0) : geometry.redFlank, geometry[key] + (narrow && key === "upper" ? -31 : 26));
      });
      translate(one("[data-str2-lines-label]"), width * .66, geometry.center - 39);
      paint();
    }

    function cancel() {
      global.cancelAnimationFrame(raf);
      raf = 0;
      queue = [];
      segment = null;
      lastFrame = null;
      kit.cancel(ctx);
    }
    function enqueue(key, duration, hold) { queue.push({ key: key, target: STATES[key], duration: duration, hold: hold || 0 }); }
    function beginSegment() {
      var upcoming = queue.shift();
      if (!upcoming) {
        root.dataset.str2Settled = "true";
        if (mode === "combined" && moment === 4) setText("final");
        pulse = 1;
        paint();
        updateControls();
        return false;
      }
      segment = { key: upcoming.key, from: Object.assign({}, visual), target: upcoming.target, duration: motionQuery.matches ? upcoming.hold : upcoming.duration, elapsed: 0 };
      setText(upcoming.key);
      if (motionQuery.matches) visual = Object.assign({}, segment.target);
      return true;
    }
    function frame(now) {
      raf = 0;
      if (suspended) return;
      var elapsed = lastFrame === null ? 0 : Math.min(now - lastFrame, 80);
      lastFrame = now;
      if (!segment && !beginSegment()) return;
      segment.elapsed += elapsed;
      var progress = segment.duration ? Math.min(segment.elapsed / segment.duration, 1) : 1;
      var eased = progress * progress * (3 - 2 * progress);
      Object.keys(BASE).forEach(function (key) {
        visual[key] = motionQuery.matches ? segment.target[key] : segment.from[key] + (segment.target[key] - segment.from[key]) * eased;
      });
      pulse = progress;
      paint();
      if (progress >= 1) {
        visual = Object.assign({}, segment.target);
        segment = null;
        if (!queue.length) { beginSegment(); return; }
      }
      raf = global.requestAnimationFrame(frame);
    }
    function resume() {
      if (raf || suspended || (!segment && !queue.length)) return;
      lastFrame = null;
      raf = global.requestAnimationFrame(frame);
    }
    function choose(nextMode, nextMoment) {
      cancel();
      mode = nextMode;
      moment = mode === "combined" ? Math.max(1, Math.min(4, nextMoment || 1)) : 0;
      announce = true;
      root.dataset.str2Settled = "false";
      if (mode === "combined" && moment === 4) {
        // Una selezione diretta ricostruisce il presupposto causale del momento 3.
        var needsPreparation = Object.keys(BASE).some(function (key) { return Math.abs(visual[key] - STATES.combined3[key]) > .001; });
        if (needsPreparation) enqueue("combined3", DURATION.prepare);
        enqueue("collapse", DURATION.collapse, 1600);
        enqueue("loss", DURATION.loss, 1100);
        enqueue("advance", DURATION.advance);
      } else {
        enqueue(mode === "combined" ? "combined" + moment : mode, DURATION.change);
      }
      updateControls();
      // Pubblica subito il nuovo contesto anche se la pagina è sospesa.
      setText(mode === "combined" && moment === 4 ? "collapse" : mode === "combined" ? "combined" + moment : mode);
      resume();
    }
    function advance() {
      if (mode === "off") choose("direct");
      else if (mode === "direct") choose("combined", 1);
      else choose("combined", moment === 4 ? 1 : moment + 1);
    }
    function retreat() {
      if (mode === "direct") choose("off");
      else if (mode === "combined") moment === 1 ? choose("direct") : choose("combined", moment - 1);
    }
    // Pulsanti nativi: Tab, Invio e Spazio; frecce/Home/End sono una comodità aggiuntiva.
    function keyboardGroup(buttons) {
      buttons.forEach(function (button, index) {
        button.addEventListener("keydown", function (event) {
          var target;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % buttons.length;
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index + buttons.length - 1) % buttons.length;
          else if (event.key === "Home") target = 0;
          else if (event.key === "End") target = buttons.length - 1;
          else return;
          event.preventDefault();
          buttons[target].focus();
        });
      });
    }
    modeButtons.forEach(function (button) { button.addEventListener("click", function () { choose(button.dataset.str2Mode); }); });
    momentButtons.forEach(function (button) { button.addEventListener("click", function () { choose("combined", Number(button.dataset.str2Moment)); }); });
    keyboardGroup(modeButtons);
    keyboardGroup(momentButtons);
    next.addEventListener("click", advance);
    back.addEventListener("click", retreat);
    motionQuery.addEventListener("change", function () {
      if (segment) {
        segment.from = Object.assign({}, visual);
        segment.elapsed = 0;
        segment.duration = motionQuery.matches ? (segment.key === "collapse" ? 1600 : segment.key === "loss" ? 1100 : 0) : DURATION[segment.key] || DURATION.change;
      }
      pulse = 1;
      paint();
      resume();
    });
    kit.observeLifecycle(ctx, {
      threshold: 0,
      onSuspend: function () {
        suspended = true;
        root.dataset.str2Suspended = "true";
        global.cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = null;
      },
      onResume: function () {
        suspended = false;
        root.dataset.str2Suspended = "false";
        resume();
      }
    });
    root.dataset.str2Ready = "true";
    root.dataset.str2Settled = "true";
    root.dataset.str2Suspended = "false";
    all("[data-str2-controls]").forEach(function (controls) { controls.hidden = false; });
    layout();
    new global.ResizeObserver(layout).observe(canvas);
    setText("off");
    updateControls();
  }
  Array.from(document.querySelectorAll('[data-schema-kit="str2-saliente"]')).forEach(init);
})(window, document);
