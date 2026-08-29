/* S2 — Palantir. Tempi e quantità sono regia editoriale comparativa. */
(function () {
  "use strict";

  var CONFIG = {
    OBSERVATION_DRAW: 920,
    T_INPUT: 1100,
    T_PALANTIR: 800,
    WORK_PAUSE: 500,
    T2_MIN: 1900,
    T2_MAX: 3600,
    T2_MIN_SEPARATION: 520,
    OUTPUT_PATH_DRAW: 450,
    OUTPUT_HEAD_REVEAL: 140,
    OUTPUT_ITEM_FADE: 280,
    OUTPUT_ITEM_STAGGER: 160,
    OUTPUT_BOX_FADE: 280,
    OUTPUT_EXCLUDED_FADE: 280,
    PHASE_STAY: 4200,
    G2_NOMINAL_SPEED: 0.42,
    G2_NECK_SPEED_FACTOR: 0.33,
    G2_PROFILE_SAMPLE: 900,
    G2_TRANSFER_FADE: 500,
    G2_CYCLE_GAP: 700,
    SIGNAL_DASH_LENGTH: 11,
    SIGNAL_DASH_GAP: 200,
    SIGNAL_DASH_END: -100
  };
  var READINGS = [null,
    { title: "01 — Osservazione", text: "I sensori osservano lo stesso campo reale. Restano costanti sia gli elementi disponibili sia le fonti che li rilevano." },
    { title: "02 — Lavorazione", text: "Con Palantir i flussi convergono nell’Ontology e alimentano un ambiente condiviso. Senza uno strato comune, diversi centri separati lavorano in modo più o meno efficiente." },
    { title: "03 — Quadro operativo", text: "La lavorazione integrata produce un quadro più completo e unitario. Nello scenario disperso una parte maggiore del campo reale rimane fuori dal quadro." }
  ];
  var G2_READINGS = {
    integrated: "L’analisi integrata produce più rapidamente opportunità d’ingaggio: il collo di bottiglia si sposta verso la capacità di fuoco.",
    dispersed: "L’analisi dispersa produce opportunità d’ingaggio più lentamente: il collo di bottiglia rimane nella lavorazione."
  };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var roots = document.querySelectorAll("[data-palantir-schema]");
  if (!roots.length) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function list(nodes) { return Array.prototype.slice.call(nodes || []); }
  function pageVisible() { return document.visibilityState !== "hidden"; }
  function pathLength(path) { try { return path.getTotalLength(); } catch (_) { return 100; } }
  function removeChildren(layer) { if (layer) layer.textContent = ""; }
  function setOpacity(nodes, value) { list(nodes).forEach(function (el) { el.style.opacity = value; }); }
  function resetOpacity(nodes) { list(nodes).forEach(function (el) { el.style.removeProperty("opacity"); }); }

  function createContext(root) {
    return { root: root, token: 0, animations: new Set(), timers: new Map(), inView: true };
  }
  function valid(ctx, token) { return token === ctx.token; }
  function cancelContext(ctx) {
    ctx.token += 1;
    ctx.animations.forEach(function (rec) { rec.finish(false); });
    ctx.animations.clear();
    ctx.timers.forEach(function (resolve, id) { clearTimeout(id); resolve(false); });
    ctx.timers.clear();
    list(ctx.root.querySelectorAll(".palantir-schema__signal")).forEach(function (el) { el.remove(); });
    return ctx.token;
  }
  function wait(ctx, ms, token) {
    return new Promise(function (resolve) {
      if (!valid(ctx, token)) return resolve(false);
      var id = window.setTimeout(function () { ctx.timers.delete(id); resolve(valid(ctx, token)); }, ms);
      ctx.timers.set(id, resolve);
    });
  }
  function animate(ctx, el, keyframes, options, token) {
    return new Promise(function (resolve) {
      if (!el || !valid(ctx, token)) return resolve(false);
      if (typeof el.animate !== "function") {
        var last = keyframes[keyframes.length - 1] || {};
        Object.keys(last).forEach(function (key) { if (key !== "offset" && key !== "easing") el.style[key] = last[key]; });
        return wait(ctx, options.duration || 0, token).then(resolve);
      }
      var animation = el.animate(keyframes, options);
      var done = false;
      var rec = { animation: animation, finish: finish };
      ctx.animations.add(rec);
      function finish(ok) {
        if (done) return;
        done = true;
        ctx.animations.delete(rec);
        animation.onfinish = null; animation.oncancel = null;
        try { animation.cancel(); } catch (_) {}
        resolve(ok && valid(ctx, token));
      }
      animation.onfinish = function () { finish(true); };
      animation.oncancel = function () { finish(false); };
    });
  }
  function pulse(ctx, path, layer, duration, token, keyframes) {
    if (!path || !layer || !valid(ctx, token)) return Promise.resolve(false);
    var signal = document.createElementNS(SVG_NS, "path");
    signal.setAttribute("d", path.getAttribute("d"));
    signal.setAttribute("pathLength", "100");
    signal.setAttribute("class", "palantir-schema__signal");
    signal.style.opacity = "0";
    /* 11 + 200 > 11 - (-100): the next periodic dash cannot re-enter the path. */
    signal.style.strokeDasharray = CONFIG.SIGNAL_DASH_LENGTH + " " + CONFIG.SIGNAL_DASH_GAP;
    signal.style.strokeDashoffset = String(CONFIG.SIGNAL_DASH_LENGTH);
    layer.appendChild(signal);
    /* Opacity is set and WAAPI is started in one task, so the initial dash cannot paint alone. */
    signal.style.opacity = "1";
    var frames = keyframes || [{ strokeDashoffset: String(CONFIG.SIGNAL_DASH_LENGTH) }, { strokeDashoffset: String(CONFIG.SIGNAL_DASH_END) }];
    return animate(ctx, signal, frames, { duration: duration, easing: "linear", fill: "forwards" }, token).then(function (ok) { signal.remove(); return ok; });
  }
  function fade(ctx, el, from, to, duration, token) {
    if (!el) return Promise.resolve(false);
    el.style.opacity = String(from);
    return animate(ctx, el, [{ opacity: from }, { opacity: to }], { duration: duration, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }, token).then(function (ok) { if (ok) el.style.opacity = String(to); return ok; });
  }

  function initQuadro(root) {
    var ctx = createContext(root);
    var moment = 0, started = false, entered = false, outputBuilt = false, auto = false, autoTimer = null;
    var controls = root.querySelector("[data-controls]");
    var buttons = list(root.querySelectorAll("[data-q-moment]"));
    var next = root.querySelector("[data-q-next]");
    var autoButton = root.querySelector("[data-q-auto]");
    var autoState = root.querySelector("[data-q-auto-state]");
    var count = root.querySelector("[data-q-count]");
    var title = root.querySelector("[data-q-title]");
    var reading = root.querySelector("[data-q-reading]");
    var live = root.querySelector("[data-q-live]");
    if (!controls || !next || !title || !reading || !autoButton || !autoState) return;
    root.classList.add("is-enhanced");
    if (reduced) root.classList.add("is-reduced");

    function clearLayers() { list(root.querySelectorAll("[data-q1-pulses],[data-q2-pulses]")).forEach(removeChildren); }
    function cancelAutoTimer() { if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; } }
    function scheduleAuto() {
      cancelAutoTimer();
      if (!started || moment === 0 || !auto || !ctx.inView || !pageVisible()) return;
      autoTimer = window.setTimeout(function () {
        autoTimer = null;
        if (started && moment > 0) render(moment >= 3 ? 1 : moment + 1, false, true);
      }, CONFIG.PHASE_STAY);
    }
    function resetOutput() {
      resetOpacity(root.querySelectorAll("[data-output-path],[data-output-head],[data-output-clear],[data-output-box],[data-output-excluded]"));
      outputBuilt = false;
    }
    function initializeOff() {
      moment = 0; started = false; entered = false; auto = false;
      cancelAutoTimer(); cancelContext(ctx); clearLayers(); resetOutput();
      root.classList.remove("has-observation", "is-moment-1", "is-moment-2", "is-moment-3");
      setOpacity(root.querySelectorAll("[data-observation-line],[data-observation-head]"), "0");
      buttons.forEach(function (button, index) {
        button.setAttribute("aria-selected", "false");
        button.tabIndex = index === 0 ? 0 : -1;
      });
      autoButton.setAttribute("aria-pressed", "false");
      autoState.textContent = "OFF";
      next.disabled = false;
    }
    function showObservationFinal() {
      root.classList.add("has-observation");
      list(root.querySelectorAll("[data-observation-line]")).forEach(function (p) { p.style.opacity = "1"; p.style.strokeDasharray = "none"; p.style.strokeDashoffset = "0"; });
      setOpacity(root.querySelectorAll("[data-observation-head]"), "1");
    }
    async function drawObservation(token) {
      var lines = list(root.querySelectorAll("[data-observation-line]"));
      var heads = list(root.querySelectorAll("[data-observation-head]"));
      root.classList.remove("has-observation"); setOpacity(heads, "0");
      var jobs = lines.map(function (path) {
        path.style.opacity = "1";
        return animate(ctx, path, [{ strokeDasharray: "100 100", strokeDashoffset: "100" }, { strokeDasharray: "100 100", strokeDashoffset: "0" }], { duration: CONFIG.OBSERVATION_DRAW, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }, token);
      });
      if (!(await wait(ctx, Math.round(CONFIG.OBSERVATION_DRAW * .78), token))) return;
      await Promise.all(heads.map(function (head) { return fade(ctx, head, 0, 1, CONFIG.OUTPUT_HEAD_REVEAL, token); }));
      await Promise.all(jobs);
      if (valid(ctx, token)) showObservationFinal();
    }
    async function integratedLoop(token) {
      var layer = root.querySelector("[data-q1-pulses]");
      var inputs = list(root.querySelectorAll("[data-q1-input]"));
      var perimeter = list(root.querySelectorAll("[data-q1-perimeter]"));
      while (valid(ctx, token) && moment >= 2 && ctx.inView && pageVisible()) {
        var arrived = await Promise.all(inputs.map(function (p) { return pulse(ctx, p, layer, CONFIG.T_INPUT, token); }));
        if (!arrived.every(Boolean)) return;
        var processed = await Promise.all(perimeter.map(function (p) { return pulse(ctx, p, layer, CONFIG.T_PALANTIR, token); }));
        if (!processed.every(Boolean)) return;
        if (!(await wait(ctx, CONFIG.WORK_PAUSE, token))) return;
      }
    }
    function firstDurations() { return [CONFIG.T2_MIN, Math.round((CONFIG.T2_MIN + CONFIG.T2_MAX) / 2), CONFIG.T2_MAX]; }
    function nextClusterDuration(previous) {
      var value, tries = 0;
      do { value = CONFIG.T2_MIN + Math.round(Math.random() * (CONFIG.T2_MAX - CONFIG.T2_MIN)); tries += 1; }
      while (tries < 8 && Math.abs(value - previous) < CONFIG.T2_MIN_SEPARATION * .45);
      return value;
    }
    async function clusterLoop(index, first, token) {
      var layer = root.querySelector("[data-q2-pulses]");
      var input = root.querySelector('[data-q2-input="' + index + '"]');
      var cluster = root.querySelector('[data-q2-cluster="' + index + '"]');
      var halves = cluster ? list(cluster.querySelectorAll("[data-q2-perimeter]")) : [];
      var duration = first;
      while (valid(ctx, token) && moment >= 2 && ctx.inView && pageVisible()) {
        if (!(await pulse(ctx, input, layer, CONFIG.T_INPUT, token))) return;
        var processed = await Promise.all(halves.map(function (p) { return pulse(ctx, p, layer, duration, token); }));
        if (!processed.every(Boolean)) return;
        if (!(await wait(ctx, CONFIG.WORK_PAUSE, token))) return;
        duration = nextClusterDuration(duration);
      }
    }
    function startProcessing(token) {
      if (reduced || moment < 2 || !ctx.inView || !pageVisible()) return;
      integratedLoop(token);
      firstDurations().forEach(function (duration, index) { clusterLoop(index, duration, token); });
    }
    async function outputScenario(scenario, token) {
      var clear = list(scenario.querySelectorAll("[data-output-clear]"));
      await Promise.all(clear.map(async function (el, index) {
        if (!(await wait(ctx, index * CONFIG.OUTPUT_ITEM_STAGGER, token))) return false;
        return fade(ctx, el, 0, 1, CONFIG.OUTPUT_ITEM_FADE, token);
      }));
      if (!valid(ctx, token)) return;
      var box = scenario.querySelector("[data-output-box]");
      if (!(await fade(ctx, box, 0, 1, CONFIG.OUTPUT_BOX_FADE, token))) return;
      await fade(ctx, scenario.querySelector("[data-output-excluded]"), 0, .32, CONFIG.OUTPUT_EXCLUDED_FADE, token);
    }
    async function drawOutputVectors(token) {
      var paths = list(root.querySelectorAll("[data-output-path]"));
      var heads = list(root.querySelectorAll("[data-output-head]"));
      setOpacity(paths, "1"); setOpacity(heads, "0");
      paths.forEach(function (path) { path.style.strokeDasharray = "100 100"; path.style.strokeDashoffset = "100"; });
      var jobs = paths.map(function (path) {
        return animate(ctx, path, [{ strokeDasharray: "100 100", strokeDashoffset: "100" }, { strokeDasharray: "100 100", strokeDashoffset: "0" }], { duration: CONFIG.OUTPUT_PATH_DRAW, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }, token);
      });
      if (!(await wait(ctx, Math.round(CONFIG.OUTPUT_PATH_DRAW * .76), token))) return false;
      var headJobs = heads.map(function (head) { return fade(ctx, head, 0, 1, CONFIG.OUTPUT_HEAD_REVEAL, token); });
      var result = await Promise.all(jobs.concat(headJobs));
      if (!result.every(Boolean)) return false;
      paths.forEach(function (path) { path.style.strokeDasharray = "none"; path.style.strokeDashoffset = "0"; });
      setOpacity(heads, "1");
      return true;
    }
    async function buildOutput(token) {
      if (outputBuilt || moment !== 3 || !ctx.inView || !pageVisible()) return;
      outputBuilt = true;
      if (!(await drawOutputVectors(token))) { outputBuilt = false; return; }
      await Promise.all(list(root.querySelectorAll(".palantir-schema__scenario")).map(function (s) { return outputScenario(s, token); }));
    }
    function render(n, announce, animateObservation) {
      if (moment === 0 && n !== 1) n = 1;
      started = true;
      moment = n; cancelAutoTimer(); var token = cancelContext(ctx); clearLayers(); resetOutput();
      root.classList.remove("is-moment-1", "is-moment-2", "is-moment-3"); root.classList.add("is-moment-" + n);
      count.textContent = "0" + n + "/03"; title.textContent = READINGS[n].title; reading.textContent = READINGS[n].text;
      buttons.forEach(function (button, index) { var active = index + 1 === n; button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1; });
      next.disabled = false;
      if (announce) live.textContent = READINGS[n].title + ". " + READINGS[n].text;
      if (n === 1) {
        root.classList.remove("has-observation");
        setOpacity(root.querySelectorAll("[data-observation-line],[data-observation-head]"), "0");
        if (reduced) showObservationFinal(); else if (animateObservation && ctx.inView && pageVisible()) drawObservation(token);
      } else {
        showObservationFinal(); startProcessing(token);
        if (n === 3) { if (reduced) outputBuilt = true; else buildOutput(token); }
      }
      scheduleAuto();
    }
    function resumeActive() {
      if (!started || moment === 0 || !ctx.inView || !pageVisible()) return;
      var token = ctx.token;
      scheduleAuto();
      if (moment === 1 && !root.classList.contains("has-observation") && !reduced) drawObservation(token);
      if (moment >= 2) startProcessing(token);
      if (moment === 3 && !outputBuilt) buildOutput(token);
    }
    function setAuto(active) {
      auto = active; autoButton.setAttribute("aria-pressed", String(auto)); autoState.textContent = auto ? "ON" : "OFF";
      if (!auto) cancelAutoTimer(); else scheduleAuto();
    }
    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        if (moment === 0 && index !== 0) buttons[0].focus();
        render(index + 1, true, true);
      });
      button.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault(); var target = (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length; buttons[target].focus(); buttons[target].click();
      });
    });
    next.addEventListener("click", function () {
      if (moment === 0) render(1, true, true);
      else render(moment >= 3 ? 1 : moment + 1, true, true);
    });
    autoButton.addEventListener("click", function () {
      if (!auto) {
        setAuto(true);
        if (moment === 0) render(1, true, true);
      } else setAuto(false);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { entries.forEach(function (entry) {
        if (entry.target !== root) return; var was = ctx.inView; ctx.inView = entry.isIntersecting;
        if (ctx.inView && !entered) {
          entered = true;
          if (!was) resumeActive();
        } else if (!ctx.inView && was) {
          cancelAutoTimer();
          if (started) { cancelContext(ctx); clearLayers(); if (moment === 3) resetOutput(); }
        } else if (ctx.inView && !was) resumeActive();
      }); }, { threshold: .12 }).observe(root);
    } else { entered = true; }
    document.addEventListener("visibilitychange", function () {
      if (!pageVisible()) { cancelAutoTimer(); cancelContext(ctx); clearLayers(); if (moment === 3) resetOutput(); }
      else if (ctx.inView) resumeActive();
    });
    initializeOff();
    controls.hidden = false;
  }

  function nearestProgress(path, target) {
    var total = pathLength(path), best = 0, bestDistance = Infinity;
    if (!path || typeof path.getPointAtLength !== "function") return target.fallback || 0;
    for (var i = 0; i <= CONFIG.G2_PROFILE_SAMPLE; i += 1) {
      var progress = i / CONFIG.G2_PROFILE_SAMPLE, point;
      try { point = path.getPointAtLength(total * progress); } catch (_) { break; }
      var dx = point.x - target.x, dy = point.y - target.y, distance = dx * dx + dy * dy;
      if (distance < bestDistance) { bestDistance = distance; best = progress; }
    }
    return best;
  }
  function profileOffsets(weights) {
    var total = weights.reduce(function (sum, value) { return sum + value; }, 0), result = [0], elapsed = 0;
    weights.forEach(function (weight) { elapsed += weight; result.push(elapsed / total); });
    return result;
  }
  function dashAt(progress) { return String(Math.round(CONFIG.SIGNAL_DASH_LENGTH - (CONFIG.SIGNAL_DASH_LENGTH - CONFIG.SIGNAL_DASH_END) * progress)); }
  function neckFrames(path, mode) {
    var slow = 1 / CONFIG.G2_NECK_SPEED_FACTOR;
    var points, positions, weights, offsets;
    if (mode === "integrated") {
      var bottom = path.getAttribute("d").indexOf("316") !== -1;
      points = bottom ? [{ x: 430, y: 316, fallback: .38 }, { x: 530, y: 194, fallback: .59 }, { x: 630, y: 316, fallback: .76 }] : [{ x: 430, y: 24, fallback: .38 }, { x: 530, y: 146, fallback: .59 }, { x: 630, y: 24, fallback: .76 }];
      positions = points.map(function (target) { return nearestProgress(path, target); });
      weights = [positions[0], (positions[1] - positions[0]) * slow, (positions[2] - positions[1]) * slow, 1 - positions[2]];
      offsets = profileOffsets(weights);
      return [{ strokeDashoffset: String(CONFIG.SIGNAL_DASH_LENGTH), offset: 0, easing: "linear" }, { strokeDashoffset: dashAt(positions[0]), offset: offsets[1], easing: "cubic-bezier(.38,.08,.65,.66)" }, { strokeDashoffset: dashAt(positions[1]), offset: offsets[2], easing: "linear" }, { strokeDashoffset: dashAt(positions[2]), offset: offsets[3], easing: "cubic-bezier(.25,.75,.55,1)" }, { strokeDashoffset: String(CONFIG.SIGNAL_DASH_END), offset: 1, easing: "linear" }];
    }
    if (mode === "pre") {
      var preBottom = path.getAttribute("d").indexOf("316") !== -1;
      points = preBottom ? [{ x: 315, y: 316, fallback: .6 }, { x: 382, y: 194, fallback: .8 }, { x: 392, y: 170, fallback: .98 }] : [{ x: 315, y: 24, fallback: .6 }, { x: 382, y: 146, fallback: .8 }, { x: 392, y: 170, fallback: .98 }];
      positions = points.map(function (target) { return nearestProgress(path, target); });
      weights = [positions[0], (positions[1] - positions[0]) * slow, (positions[2] - positions[1]) * slow, 1 - positions[2]];
      offsets = profileOffsets(weights);
      return [{ strokeDashoffset: String(CONFIG.SIGNAL_DASH_LENGTH), offset: 0, easing: "linear" }, { strokeDashoffset: dashAt(positions[0]), offset: offsets[1], easing: "cubic-bezier(.38,.08,.65,.66)" }, { strokeDashoffset: dashAt(positions[1]), offset: offsets[2], easing: "linear" }, { strokeDashoffset: String(CONFIG.SIGNAL_DASH_END), offset: 1, easing: "cubic-bezier(.25,.75,.55,1)" }];
    }
    var postBottom = path.getAttribute("d").indexOf("316") !== -1;
    var start = nearestProgress(path, postBottom ? { x: 528, y: 194, fallback: .08 } : { x: 528, y: 146, fallback: .08 });
    var nominal = nearestProgress(path, postBottom ? { x: 634, y: 316, fallback: .62 } : { x: 634, y: 24, fallback: .62 });
    weights = [start * slow, (nominal - start) * 1.5, 1 - nominal]; offsets = profileOffsets(weights);
    return [{ strokeDashoffset: String(CONFIG.SIGNAL_DASH_LENGTH), offset: 0, easing: "cubic-bezier(.55,0,.8,.45)" }, { strokeDashoffset: dashAt(start), offset: offsets[1], easing: "linear" }, { strokeDashoffset: dashAt(nominal), offset: offsets[2], easing: "cubic-bezier(.32,.7,.55,1)" }, { strokeDashoffset: String(CONFIG.SIGNAL_DASH_END), offset: 1, easing: "linear" }];
  }

  function initCollo(root) {
    var ctx = createContext(root);
    var mode = "integrated", looping = false, loopFrame = null, loopTimer = null;
    var frameCache = typeof WeakMap === "function" ? new WeakMap() : null;
    var controls = root.querySelector("[data-controls]");
    var tabs = list(root.querySelectorAll("[data-g2-mode]"));
    var reading = root.querySelector("[data-g2-reading]");
    var live = root.querySelector("[data-g2-live]");
    var hasObserver = "IntersectionObserver" in window;
    if (!controls || !reading) return;
    ctx.inView = !hasObserver;
    controls.hidden = false; root.classList.add("is-enhanced", "is-mode-integrated");
    if (reduced) root.classList.add("is-reduced");

    function animationAllowed() { return !reduced && ctx.inView && pageVisible(); }
    function cancelScheduledLoop() {
      if (loopFrame !== null) { window.cancelAnimationFrame(loopFrame); loopFrame = null; }
      if (loopTimer !== null) { window.clearTimeout(loopTimer); loopTimer = null; }
    }
    function cancelPlayback() {
      cancelScheduledLoop();
      var token = cancelContext(ctx); looping = false;
      list(root.querySelectorAll("[data-g2-pulses]")).forEach(removeChildren);
      return token;
    }
    function cachedNeckFrames(path, modeName) {
      if (!frameCache) return neckFrames(path, modeName);
      var cached = frameCache.get(path);
      if (cached && cached.mode === modeName) return cached.frames;
      var frames = neckFrames(path, modeName);
      frameCache.set(path, { mode: modeName, frames: frames });
      return frames;
    }
    function movingPair(paths, layer, duration, modeName, token) {
      return Promise.all(paths.map(function (path) { return pulse(ctx, path, layer, duration, token, cachedNeckFrames(path, modeName)); }));
    }
    async function integratedCycle(group, token) {
      var paths = [group.querySelector('[data-g2-path="integrated-top"]'), group.querySelector('[data-g2-path="integrated-bottom"]')];
      var layer = group.querySelector("[data-g2-pulses]"); var duration = Math.round(pathLength(paths[0]) / CONFIG.G2_NOMINAL_SPEED);
      var result = await movingPair(paths, layer, duration, "integrated", token); return result.every(Boolean);
    }
    async function dispersedCycle(group, token) {
      var layer = group.querySelector("[data-g2-pulses]");
      var pre = [group.querySelector('[data-g2-path="dispersed-pre-top"]'), group.querySelector('[data-g2-path="dispersed-pre-bottom"]')];
      var preDuration = Math.round(pathLength(pre[0]) / CONFIG.G2_NOMINAL_SPEED);
      var reached = await movingPair(pre, layer, preDuration, "pre", token); if (!reached.every(Boolean)) return false;
      if (!(await wait(ctx, CONFIG.G2_TRANSFER_FADE, token))) return false;
      var post = [group.querySelector('[data-g2-path="dispersed-post-top"]'), group.querySelector('[data-g2-path="dispersed-post-bottom"]')];
      var postDuration = Math.round(pathLength(post[0]) / CONFIG.G2_NOMINAL_SPEED);
      var left = await movingPair(post, layer, postDuration, "post", token); return left.every(Boolean);
    }
    async function loop(token) {
      if (looping || !animationAllowed()) return; looping = true;
      while (valid(ctx, token) && animationAllowed()) {
        var group = root.querySelector('[data-g2-state="' + mode + '"]');
        var ok = mode === "integrated" ? await integratedCycle(group, token) : await dispersedCycle(group, token);
        if (!ok || !valid(ctx, token)) break;
        if (!(await wait(ctx, CONFIG.G2_CYCLE_GAP, token))) break;
      }
      if (valid(ctx, token)) looping = false;
    }
    /* Lascia al browser un frame completo per mostrare il nuovo stato prima
       dei calcoli geometrici necessari alla successiva animazione. */
    function startLoopAfterPaint() {
      cancelScheduledLoop();
      if (!animationAllowed() || looping) return;
      var token = ctx.token;
      if (typeof window.requestAnimationFrame === "function") {
        loopFrame = window.requestAnimationFrame(function () {
          loopFrame = window.requestAnimationFrame(function () {
            loopFrame = null;
            if (valid(ctx, token) && animationAllowed() && !looping) loop(token);
          });
        });
      } else {
        loopTimer = window.setTimeout(function () {
          loopTimer = null;
          if (valid(ctx, token) && animationAllowed() && !looping) loop(token);
        }, 0);
      }
    }
    function syncAnimation() { if (animationAllowed()) startLoopAfterPaint(); else cancelPlayback(); }
    function setMode(nextMode, announce) {
      mode = nextMode; cancelPlayback();
      root.classList.toggle("is-mode-dispersed", mode === "dispersed"); root.classList.toggle("is-mode-integrated", mode === "integrated");
      reading.textContent = G2_READINGS[mode];
      tabs.forEach(function (tab) { var active = tab.getAttribute("data-g2-mode") === mode; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; });
      if (announce && live) live.textContent = (mode === "integrated" ? "Stato 1, Palantir integrato. " : "Stato 2, senza Palantir. ") + G2_READINGS[mode];
      startLoopAfterPaint();
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { setMode(tab.getAttribute("data-g2-mode"), true); });
      tab.addEventListener("keydown", function (event) { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); var target = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; tabs[target].focus(); tabs[target].click(); });
    });
    if (hasObserver) new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.target === root) { ctx.inView = entry.isIntersecting; syncAnimation(); } }); }, { threshold: .1 }).observe(root);
    document.addEventListener("visibilitychange", syncAnimation);
    setMode("integrated", false);
  }

  list(roots).forEach(function (root) { if (root.getAttribute("data-palantir-schema") === "quadro") initQuadro(root); else if (root.getAttribute("data-palantir-schema") === "collo") initCollo(root); });
}());
