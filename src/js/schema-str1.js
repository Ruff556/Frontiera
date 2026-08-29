/* STR1 — L'allocazione della penetrazione. */
(function (global, document) {
  "use strict";

  var kit = global.FrontieraSchemaKit;
  if (!kit || !document) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var MODE_DATA = {
    "stand-off": {
      name: "Stand-off",
      labels: ["AVVICINAMENTO", "INGAGGIO", "RIENTRO"],
      blue: "Intelligence · targeting · piattaforma di lancio · munizione stand-off · rifornimento · basi e ricostituzione",
      red: "Allarme precoce · sensori · comando · difesa di area · difesa di punto",
      readings: [
        ["La piattaforma raggiunge un’area di lancio protetta.", "Il vettore di trasporto resta fuori dal volume difensivo Red; la penetrazione non è ancora affidata alla munizione."],
        ["La munizione riceve il tratto contestato.", "La piattaforma separa il proprio rientro dalla rotta dell’arma; è il vettore offensivo a proseguire verso la difesa Red."],
        ["La piattaforma rientra; la munizione attraversa la difesa.", "La distanza sottrae il vettore di trasporto alla difesa di rotta, ma non elimina l’esposizione di basi, scorte e ricostituzione."]
      ],
      descriptions: [
        "Stand-off, momento 1 di 3, Avvicinamento. La piattaforma Blue raggiunge un’area di lancio esterna alla difesa Red. Nessuna minaccia Red è rappresentata.",
        "Stand-off, momento 2 di 3, Ingaggio. La piattaforma rilascia una munizione diretta verso Red, ancora esterna al volume difensivo.",
        "Stand-off, momento 3 di 3, Rientro. La piattaforma torna verso Blue; la munizione attraversa la difesa Red con minaccia alta, poi il mirino scompare prima della base."
      ],
      live: [
        "Stand-off, momento 1 di 3, Avvicinamento. Nessuna minaccia Red rappresentata.",
        "Stand-off, momento 2 di 3, Ingaggio. La munizione assume il tratto contestato.",
        "Stand-off, momento 3 di 3, Rientro. Minaccia alta sulla munizione nel volume difensivo Red."
      ]
    },
    "stand-in": {
      name: "Stand-in",
      labels: ["PENETRAZIONE", "INGAGGIO", "RIENTRO"],
      blue: "Intelligence · inganno · stealth · rifornimento · guerra elettronica · soppressione · scorta",
      red: "Sensori · comando · difesa di area · difesa di punto",
      readings: [
        ["La piattaforma entra nello spazio difeso Red.", "La penetrazione viene affidata direttamente al sistema; la minaccia compare oltre la soglia difensiva."],
        ["L’ingaggio avviene dall’interno del volume difensivo.", "Piattaforma e munizione restano simultaneamente esposte; la prima concentra il livello di minaccia maggiore."],
        ["La piattaforma esce; l’arma completa il tratto finale.", "Il rientro conserva il valore della piattaforma riutilizzabile; l’accesso dipende dall’intero sistema che ne ha reso possibile l’ingresso."]
      ],
      descriptions: [
        "Stand-in, momento 1 di 3, Penetrazione. La piattaforma Blue entra nella difesa Red e riceve un mirino di minaccia media oltre la soglia.",
        "Stand-in, momento 2 di 3, Ingaggio. Piattaforma e munizione avanzano nella difesa Red con minaccia alta sulla piattaforma e bassa sulla munizione.",
        "Stand-in, momento 3 di 3, Rientro. La minaccia sulla piattaforma scende da alta a media e bassa fino all’uscita; la munizione prosegue con minaccia bassa."
      ],
      live: [
        "Stand-in, momento 1 di 3, Penetrazione. Minaccia media sulla piattaforma.",
        "Stand-in, momento 2 di 3, Ingaggio. Minaccia alta sulla piattaforma e bassa sulla munizione.",
        "Stand-in, momento 3 di 3, Rientro. La piattaforma esce dalla minaccia; l’arma completa il tratto finale."
      ]
    },
    "infiltrazione": {
      name: "Infiltrazione",
      labels: ["INFILTRAZIONE", "INGAGGIO", "ESFILTRAZIONE"],
      blue: "Intelligence · sicurezza operativa · logistica clandestina · operatori · droni FPV o altri vettori nel sabotaggio",
      red: "Controintelligence · sicurezza perimetrale · sorveglianza locale · difesa di punto · reazione",
      readings: [
        ["La penetrazione è affidata alla catena clandestina.", "L'individuazione degli attori infiltrati non avviene, ma il rischio di operare in clandestinità dietro le linee nemiche è costante"],
        ["L’ingaggio rivela l’attacco nell’area della base.", "L'attacco ha luogo nell'imminenza dell'obiettivo. Per gli infiltrati il rischio resta massimo; l’allerta non ne localizza automaticamente la posizione."],
        ["L’esfiltrazione resta incerta.", "Gli infiltrati continuano ad agire in clandestinità, il rischio rimane massimo"]
      ],
      descriptions: [
        "Infiltrazione, momento 1 di 3. Una catena clandestina percorre a terra la profondità verso la base Red. Nessun attore è rappresentato come individuato.",
        "Infiltrazione, momento 2 di 3, Ingaggio. Piccoli vettori raggiungono la base. Allerta Red massima; posizione degli infiltrati non rappresentata come individuata.",
        "Infiltrazione, momento 3 di 3, Esfiltrazione. Le tracce restano attenuate e l’attore esce dal quadro. Allerta Red massima; esito dell’esfiltrazione incerto."
      ],
      live: [
        "Infiltrazione, momento 1 di 3. Nessun attore rappresentato come individuato.",
        "Infiltrazione, momento 2 di 3, Ingaggio. Allerta Red massima; posizione degli infiltrati non rappresentata come individuata.",
        "Infiltrazione, momento 3 di 3, Esfiltrazione. Allerta Red massima; esito non rappresentato."
      ]
    }
  };

  function svg(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, String(attributes[key]));
    });
    return node;
  }

  function init(root) {
    var ctx = kit.createContext(root);
    var canvas = root.querySelector("[data-str1-canvas]");
    var layer = root.querySelector("[data-str1-dynamic]");
    var desc = root.querySelector("[data-str1-desc]");
    var live = root.querySelector("[data-schema-live]");
    var count = root.querySelector("[data-schema-count]");
    var readingTitle = root.querySelector("[data-str1-reading-title]");
    var readingText = root.querySelector("[data-str1-reading-text]");
    var architectureMode = root.querySelector("[data-str1-architecture-mode]");
    var blueElements = root.querySelector("[data-str1-blue-elements]");
    var redElements = root.querySelector("[data-str1-red-elements]");
    var autoButton = root.querySelector("[data-str1-auto]");
    var autoState = root.querySelector("[data-str1-auto-state]");
    var nextButton = root.querySelector("[data-str1-next]");
    var modeButtons = kit.list(root.querySelectorAll("[data-str1-mode]"));
    var momentButtons = kit.list(root.querySelectorAll("[data-str1-moment]"));
    var paths = {};
    kit.list(root.querySelectorAll("[data-str1-path]")).forEach(function (path) {
      paths[path.getAttribute("data-str1-path")] = path;
    });

    var mode = "stand-off";
    var sequence = kit.createSequence({ states: [1, 2, 3] });
    var autoActive = false;
    var autoEpoch = 0;
    var suspended = false;
    var rafRecords = new Set();

    function pathInfo(key) {
      var master = paths[key];
      return { d: master.getAttribute("d"), length: master.getTotalLength(), master: master };
    }

    function clearMotion() {
      rafRecords.forEach(function (record) {
        global.cancelAnimationFrame(record.id);
        record.resolve(false);
      });
      rafRecords.clear();
      kit.cancel(ctx);
    }

    function clearScene() {
      clearMotion();
      layer.textContent = "";
      layer.style.opacity = "1";
    }

    function setSegment(path, total, start, end, dashed) {
      var span = Math.max(0, end - start) * total;
      if (dashed && start === 0 && end === 1) {
        path.style.strokeDasharray = "8 7";
        path.style.strokeDashoffset = "0";
      } else {
        path.style.strokeDasharray = span + " " + total;
        path.style.strokeDashoffset = String(-start * total);
      }
    }

    function addRoute(key, options) {
      options = options || {};
      var info = pathInfo(key);
      var group = svg("g", { "class": "str1-schema__route-set" + (options.trace ? " str1-schema__route-set--trace" : "") });
      var under = svg("path", { d: info.d, "class": "str1-schema__route-under" });
      var routeClass = "str1-schema__route";
      if (options.kind === "ground") routeClass += " str1-schema__route--ground";
      if (options.kind === "fpv") routeClass += " str1-schema__route--fpv";
      var route = svg("path", { d: info.d, "class": routeClass });
      group.appendChild(under);
      group.appendChild(route);
      layer.appendChild(group);
      setSegment(under, info.length, options.start || 0, options.end === undefined ? 1 : options.end, false);
      setSegment(route, info.length, options.start || 0, options.end === undefined ? 1 : options.end, options.kind === "ground");
      return { group: group, under: under, route: route, info: info };
    }

    function reticle() {
      var group = svg("g", { "class": "str1-schema__reticle str1-schema__reticle--off" });
      group.appendChild(svg("circle", { cx: 0, cy: 0, r: 7 }));
      group.appendChild(svg("path", { d: "M-18 -6 V-17 H-7 M7 -17 H18 V-6 M18 6 V17 H7 M-7 17 H-18 V6" }));
      group.appendChild(svg("path", { d: "M-12 0 H-6 M6 0 H12 M0 -12 V-6 M0 6 V12" }));
      return group;
    }

    function carrier(kind) {
      var role = kind || "main";
      var group = svg("g", { "class": "str1-schema__carrier str1-schema__carrier--" + role, "data-str1-carrier-role": role });
      var heading = svg("g", {});
      heading.appendChild(svg("line", { x1: -10, y1: 0, x2: 10, y2: 0, "class": "str1-schema__pulse-under" }));
      heading.appendChild(svg("line", { x1: -10, y1: 0, x2: 10, y2: 0, "class": "str1-schema__pulse" }));
      var target = reticle();
      group.appendChild(heading);
      group.appendChild(target);
      layer.appendChild(group);
      return { group: group, heading: heading, target: target };
    }

    function setThreat(target, level) {
      target.setAttribute("class", "str1-schema__reticle str1-schema__reticle--" + (level || "off"));
    }

    function positionCarrier(bundle, master, progress, threatAt) {
      var length = master.getTotalLength();
      var at = Math.max(0, Math.min(1, progress)) * length;
      var point = master.getPointAtLength(at);
      var tangentStart = point;
      var tangentEnd = master.getPointAtLength(Math.min(length, at + 1.5));
      if (at >= length - 1.5) {
        tangentStart = master.getPointAtLength(Math.max(0, at - 1.5));
        tangentEnd = point;
      }
      var angle = Math.atan2(tangentEnd.y - tangentStart.y, tangentEnd.x - tangentStart.x) * 180 / Math.PI;
      bundle.group.setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
      bundle.heading.setAttribute("transform", "rotate(" + angle + ")");
      setThreat(bundle.target, threatAt ? threatAt(progress) : "off");
    }

    function placeCarrier(key, progress, kind, threatAt) {
      var bundle = carrier(kind);
      positionCarrier(bundle, paths[key], progress, threatAt);
      return bundle;
    }

    function travel(key, options, token) {
      options = options || {};
      var start = options.start || 0;
      var end = options.end === undefined ? 1 : options.end;
      var route = addRoute(key, { start: start, end: start, kind: options.kind });
      var bundle = carrier(options.carrier || "main");
      var reduced = kit.reducedMotion() || options.static || suspended;
      var duration = reduced ? 0 : options.duration;

      function update(progress) {
        setSegment(route.under, route.info.length, start, progress, false);
        setSegment(route.route, route.info.length, start, progress, options.kind === "ground" && progress === 1);
        positionCarrier(bundle, route.info.master, progress, options.threatAt);
      }

      if (!duration) {
        update(end);
        return Promise.resolve(kit.valid(ctx, token));
      }

      return new Promise(function (resolve) {
        var began = null;
        var record = { id: 0, resolve: finish };
        var done = false;

        function finish(ok) {
          if (done) return;
          done = true;
          rafRecords.delete(record);
          resolve(ok && kit.valid(ctx, token));
        }

        function frame(now) {
          if (!kit.valid(ctx, token)) return finish(false);
          if (began === null) began = now;
          var t = Math.min(1, (now - began) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          update(start + (end - start) * eased);
          if (t >= 1) return finish(true);
          record.id = global.requestAnimationFrame(frame);
        }

        rafRecords.add(record);
        record.id = global.requestAnimationFrame(frame);
      });
    }

    function addAlert() {
      var anchor = svg("g", { "class": "str1-schema__alert-anchor", "data-alert-anchor": "", transform: "translate(851 202)", role: "img", "aria-label": "Allerta massima Red" });
      var pulse = svg("g", { "class": "str1-schema__alert-pulse", "data-alert-pulse": "" });
      pulse.appendChild(svg("polygon", { points: "0,-24 23,18 -23,18" }));
      pulse.appendChild(svg("line", { x1: 0, y1: -10, x2: 0, y2: 5 }));
      pulse.appendChild(svg("circle", { cx: 0, cy: 11, r: 1.4 }));
      anchor.appendChild(pulse);
      layer.appendChild(anchor);
    }

    function trace(key, start, end, kind) {
      addRoute(key, { start: start || 0, end: end === undefined ? 1 : end, kind: kind, trace: true });
    }

    function standOff(step, token, staticState) {
      if (step === 1) return travel("stand-off-out", { duration: 2200, static: staticState }, token);
      if (step === 2) {
        trace("stand-off-out");
        placeCarrier("stand-off-out", 1, "transport");
        return travel("stand-off-weapon", { end: .38, duration: 900, carrier: "weapon", static: staticState }, token);
      }
      trace("stand-off-out");
      trace("stand-off-weapon", 0, .38);
      return Promise.all([
        travel("stand-off-return", { duration: 1850, static: staticState }, token),
        travel("stand-off-weapon", {
          start: .38, duration: 1150, carrier: "weapon", static: staticState,
          threatAt: function (p) { return p >= .48 && p < .96 ? "high" : "off"; }
        }, token)
      ]);
    }

    function standIn(step, token, staticState) {
      if (step === 1) {
        return travel("stand-in-out", {
          end: .72, duration: 2200, static: staticState,
          threatAt: function (p) { return p >= .55 ? "medium" : "off"; }
        }, token);
      }
      if (step === 2) {
        trace("stand-in-out", 0, .72);
        return Promise.all([
          travel("stand-in-out", { start: .72, duration: 850, static: staticState, threatAt: function () { return "high"; } }, token),
          travel("stand-in-weapon", { end: .55, duration: 800, carrier: "weapon", static: staticState, threatAt: function () { return "low"; } }, token)
        ]);
      }
      trace("stand-in-out");
      trace("stand-in-weapon", 0, .55);
      return Promise.all([
        travel("stand-in-return", {
          duration: 1900, static: staticState,
          threatAt: function (p) {
            if (p < .1) return "high";
            if (p < .22) return "medium";
            if (p < .34) return "low";
            return "off";
          }
        }, token),
        travel("stand-in-weapon", {
          start: .55, duration: 700, carrier: "weapon", static: staticState,
          threatAt: function (p) { return p < .95 ? "low" : "off"; }
        }, token)
      ]);
    }

    function launchFpv(key, delay, token, staticState) {
      if (staticState) return travel(key, { duration: 0, carrier: "fpv", kind: "fpv", static: true }, token);
      return kit.wait(ctx, delay, token).then(function (ok) {
        return ok ? travel(key, { duration: 620, carrier: "fpv", kind: "fpv" }, token) : false;
      });
    }

    function infiltration(step, token, staticState) {
      if (step === 1) return travel("infiltration", { duration: 2200, kind: "ground", static: staticState }, token);
      trace("infiltration", 0, 1, "ground");
      if (step === 2) {
        placeCarrier("infiltration", 1, "main");
        addAlert();
        return Promise.all([
          launchFpv("fpv-a", 0, token, staticState),
          launchFpv("fpv-b", 100, token, staticState),
          launchFpv("fpv-c", 200, token, staticState)
        ]);
      }
      trace("fpv-a", 0, 1, "fpv");
      trace("fpv-b", 0, 1, "fpv");
      trace("fpv-c", 0, 1, "fpv");
      addAlert();
      return Promise.resolve(true);
    }

    function updateControls(step) {
      var data = MODE_DATA[mode];
      modeButtons.forEach(function (button) {
        var selected = button.getAttribute("data-str1-mode") === mode;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      momentButtons.forEach(function (button, index) {
        var selected = step === index + 1;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected || (!step && index === 0) ? 0 : -1;
        button.querySelector("[data-str1-moment-label]").textContent = data.labels[index];
      });
      architectureMode.textContent = data.name.toUpperCase();
      blueElements.textContent = data.blue;
      redElements.textContent = data.red;
      autoButton.setAttribute("aria-pressed", String(autoActive));
      autoState.textContent = autoActive ? "ON" : "OFF";
    }

    function updateText(step, source) {
      var data = MODE_DATA[mode];
      if (!step) {
        count.textContent = "00/03";
        readingTitle.textContent = "Tre modi di attraversare la difesa.";
        readingText.textContent = "Avanza o seleziona un momento per osservare quale componente assume la penetrazione e dove compare l’esposizione.";
        desc.textContent = "Campo iniziale in modalità " + data.name + ". Le basi e le difese Blue e Red sono visibili; nessun vettore ha ancora attraversato la difesa.";
        return;
      }
      count.textContent = "0" + step + "/03";
      readingTitle.textContent = data.readings[step - 1][0];
      readingText.textContent = data.readings[step - 1][1];
      desc.textContent = data.descriptions[step - 1];
      if (source === "manual" && live) live.textContent = data.live[step - 1];
    }

    function guardOffState(token, offMode) {
      [0, 60, 260].forEach(function (delay) {
        kit.wait(ctx, delay, token).then(function (ok) {
          if (ok && sequence.isOff() && mode === offMode) layer.textContent = "";
        });
      });
    }

    async function render(step, source, options) {
      options = options || {};
      clearScene();
      var token = ctx.token;
      updateControls(step);
      updateText(step, source);
      if (!step) {
        guardOffState(token, mode);
        return true;
      }
      var result;
      if (mode === "stand-off") result = await standOff(step, token, options.static);
      if (mode === "stand-in") result = await standIn(step, token, options.static);
      if (mode === "infiltrazione") result = await infiltration(step, token, options.static);
      return Array.isArray(result) ? result.every(Boolean) : !!result;
    }

    function stopAuto() {
      if (!autoActive) return;
      autoActive = false;
      autoEpoch += 1;
      updateControls(sequence.current());
    }

    async function autoLoop(epoch, renderCurrent) {
      if (renderCurrent) {
        var first = sequence.isOff() ? sequence.start("auto") : sequence.current();
        if (!(await render(first, "auto"))) return;
      }
      while (autoActive && !suspended && epoch === autoEpoch) {
        var pause = kit.reducedMotion() ? 2600 : 1500;
        var token = ctx.token;
        if (!(await kit.wait(ctx, pause, token))) return;
        if (!autoActive || suspended || epoch !== autoEpoch) return;
        if (sequence.current() === 3) {
          await kit.fade(ctx, layer, 1, .18, kit.reducedMotion() ? 0 : 240, ctx.token);
          if (!autoActive || suspended || epoch !== autoEpoch) return;
        }
        var next = sequence.next("auto");
        if (!(await render(next, "auto"))) return;
      }
    }

    function startAuto() {
      autoActive = true;
      autoEpoch += 1;
      updateControls(sequence.current());
      autoLoop(autoEpoch, true);
    }

    function chooseMode(nextMode) {
      stopAuto();
      mode = nextMode;
      sequence.reset("manual");
      if (live) live.textContent = MODE_DATA[mode].name + ". Stato iniziale; nessun momento selezionato.";
      render(null, "manual");
    }

    function chooseMoment(step) {
      stopAuto();
      sequence.set(step, "manual");
      render(step, "manual");
    }

    function advance() {
      stopAuto();
      var step = sequence.next("manual");
      render(step, "manual");
    }

    function roving(buttons, event, activate) {
      var index = buttons.indexOf(event.currentTarget);
      var next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(event.currentTarget);
        return;
      } else return;
      event.preventDefault();
      buttons.forEach(function (button, i) { button.tabIndex = i === next ? 0 : -1; });
      buttons[next].focus();
    }

    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () { chooseMode(button.getAttribute("data-str1-mode")); });
      button.addEventListener("keydown", function (event) { roving(modeButtons, event, function (target) { chooseMode(target.getAttribute("data-str1-mode")); }); });
    });
    momentButtons.forEach(function (button) {
      button.addEventListener("click", function () { chooseMoment(Number(button.getAttribute("data-str1-moment"))); });
      button.addEventListener("keydown", function (event) { roving(momentButtons, event, function (target) { chooseMoment(Number(target.getAttribute("data-str1-moment"))); }); });
    });
    nextButton.addEventListener("click", advance);
    autoButton.addEventListener("click", function () { if (autoActive) stopAuto(); else startAuto(); });

    kit.observeLifecycle(ctx, {
      root: root,
      threshold: .08,
      onSuspend: function () {
        suspended = true;
        autoEpoch += 1;
        clearScene();
        render(sequence.current(), "resume", { static: true });
      },
      onResume: function () {
        suspended = false;
        render(sequence.current(), "resume", { static: true }).then(function () {
          if (autoActive) {
            autoEpoch += 1;
            autoLoop(autoEpoch, false);
          }
        });
      }
    });

    updateControls(null);
    updateText(null, "init");
  }

  kit.list(document.querySelectorAll('[data-schema-kit="str1-allocazione-penetrazione"]')).forEach(init);
})(window, document);
