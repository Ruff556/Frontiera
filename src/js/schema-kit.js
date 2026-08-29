/* Schema Kit Frontiera v1
   Primitive opt-in per schemi autonomi: nessuna geometria o sequenza imposta. */
(function (global, document) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function list(nodes) {
    return Array.from(nodes || []);
  }

  function pageVisible() {
    return !document || document.visibilityState !== "hidden";
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function pathLength(path) {
    try { return path.getTotalLength(); } catch (_) { return 100; }
  }

  function createContext(root) {
    if (!root) throw new Error("Schema Kit: createContext richiede un elemento radice.");
    return {
      root: root,
      token: 0,
      animations: new Set(),
      timers: new Map(),
      cleanups: new Set(),
      inView: true,
      destroyed: false
    };
  }

  function valid(ctx, token) {
    return !!ctx && !ctx.destroyed && token === ctx.token;
  }

  function clearSignals(ctx) {
    if (!ctx || !ctx.root || typeof ctx.root.querySelectorAll !== "function") return;
    list(ctx.root.querySelectorAll("[data-schema-signal]")).forEach(function (node) { node.remove(); });
  }

  function cancel(ctx) {
    if (!ctx || ctx.destroyed) return 0;
    ctx.token += 1;
    list(ctx.animations).forEach(function (record) { record.finish(false); });
    ctx.animations.clear();
    ctx.timers.forEach(function (record, id) {
      global.clearTimeout(id);
      record.resolve(false);
    });
    ctx.timers.clear();
    clearSignals(ctx);
    return ctx.token;
  }

  function destroy(ctx) {
    if (!ctx || ctx.destroyed) return;
    cancel(ctx);
    list(ctx.cleanups).forEach(function (cleanup) { cleanup(); });
    ctx.cleanups.clear();
    ctx.destroyed = true;
  }

  function wait(ctx, milliseconds, token) {
    return new Promise(function (resolve) {
      if (!valid(ctx, token)) return resolve(false);
      var id = global.setTimeout(function () {
        ctx.timers.delete(id);
        resolve(valid(ctx, token));
      }, Math.max(0, milliseconds || 0));
      ctx.timers.set(id, { resolve: resolve });
    });
  }

  function animate(ctx, element, keyframes, options, token) {
    options = options || {};
    return new Promise(function (resolve) {
      if (!element || !valid(ctx, token)) return resolve(false);
      if (typeof element.animate !== "function" || reducedMotion()) {
        var finalFrame = keyframes[keyframes.length - 1] || {};
        Object.keys(finalFrame).forEach(function (key) {
          if (key !== "offset" && key !== "easing") element.style[key] = finalFrame[key];
        });
        return resolve(valid(ctx, token));
      }

      var animation = element.animate(keyframes, options);
      var completed = false;
      var record = { animation: animation, finish: finish };
      ctx.animations.add(record);

      function finish(ok) {
        if (completed) return;
        completed = true;
        ctx.animations.delete(record);
        animation.onfinish = null;
        animation.oncancel = null;
        try { animation.cancel(); } catch (_) {}
        resolve(ok && valid(ctx, token));
      }

      animation.onfinish = function () { finish(true); };
      animation.oncancel = function () { finish(false); };
    });
  }

  function clearLayer(layer, selector) {
    if (!layer) return;
    if (!selector) {
      layer.textContent = "";
      return;
    }
    list(layer.querySelectorAll(selector)).forEach(function (node) { node.remove(); });
  }

  function setOpacity(nodes, value) {
    list(nodes).forEach(function (element) { element.style.opacity = String(value); });
  }

  function resetOpacity(nodes) {
    list(nodes).forEach(function (element) { element.style.removeProperty("opacity"); });
  }

  function fade(ctx, element, from, to, duration, token, options) {
    if (!element) return Promise.resolve(false);
    element.style.opacity = String(from);
    return animate(ctx, element, [{ opacity: from }, { opacity: to }], {
      duration: duration,
      easing: (options && options.easing) || "cubic-bezier(.22,.61,.36,1)",
      fill: "forwards"
    }, token).then(function (ok) {
      if (ok) element.style.opacity = String(to);
      return ok;
    });
  }

  function drawPath(ctx, path, duration, token, options) {
    options = options || {};
    if (!path) return Promise.resolve(false);
    var length = options.pathLength || 100;
    path.style.opacity = "1";
    return animate(ctx, path, [
      { strokeDasharray: length + " " + length, strokeDashoffset: String(length) },
      { strokeDasharray: length + " " + length, strokeDashoffset: "0" }
    ], {
      duration: duration,
      easing: options.easing || "cubic-bezier(.22,.61,.36,1)",
      fill: "forwards"
    }, token).then(function (ok) {
      if (ok && options.finalDasharray !== undefined) {
        path.style.strokeDasharray = options.finalDasharray;
        path.style.strokeDashoffset = "0";
      }
      return ok;
    });
  }

  function pulse(ctx, path, layer, duration, token, options) {
    options = options || {};
    if (!path || !layer || !valid(ctx, token)) return Promise.resolve(false);
    var signal = document.createElementNS(SVG_NS, "path");
    var dashLength = options.dashLength || 11;
    var dashGap = options.dashGap || 200;
    var start = options.startOffset === undefined ? dashLength : options.startOffset;
    var end = options.endOffset === undefined ? -100 : options.endOffset;
    signal.setAttribute("d", path.getAttribute("d"));
    signal.setAttribute("pathLength", String(options.pathLength || 100));
    signal.setAttribute("class", options.className || "schema-kit__signal");
    signal.setAttribute("data-schema-signal", "");
    signal.style.fill = "none";
    signal.style.strokeDasharray = dashLength + " " + dashGap;
    signal.style.strokeDashoffset = String(start);
    signal.style.opacity = "1";
    layer.appendChild(signal);

    var frames = options.keyframes || [
      { strokeDashoffset: String(start) },
      { strokeDashoffset: String(end) }
    ];
    return animate(ctx, signal, frames, {
      duration: duration,
      easing: options.easing || "linear",
      fill: "forwards"
    }, token).then(function (ok) {
      signal.remove();
      return ok;
    });
  }

  function observeLifecycle(ctx, options) {
    options = options || {};
    var root = options.root || ctx.root;
    var intersecting = true;
    var visible = pageVisible();
    var active = intersecting && visible;
    var observer = null;

    function publish(reason) {
      var next = intersecting && visible;
      ctx.inView = intersecting;
      if (next !== active) {
        active = next;
        if (active && options.onResume) options.onResume(reason);
        if (!active && options.onSuspend) options.onSuspend(reason);
      }
      if (options.onChange) options.onChange({ active: active, inView: intersecting, pageVisible: visible, reason: reason });
    }

    function onVisibility() {
      visible = pageVisible();
      publish("document");
    }

    if ("IntersectionObserver" in global) {
      observer = new global.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target !== root) return;
          intersecting = entry.isIntersecting;
          publish("viewport");
        });
      }, { threshold: options.threshold === undefined ? .1 : options.threshold });
      observer.observe(root);
    }

    if (document && document.addEventListener) document.addEventListener("visibilitychange", onVisibility);

    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (observer) observer.disconnect();
      if (document && document.removeEventListener) document.removeEventListener("visibilitychange", onVisibility);
      ctx.cleanups.delete(cleanup);
    }
    ctx.cleanups.add(cleanup);
    return cleanup;
  }

  /*
    Sequenza pura. Lo stato off e rappresentato da null e non entra mai nel ciclo:
    start/next lo abbandonano; i successivi next percorrono soltanto states.
  */
  function createSequence(options) {
    options = options || {};
    var states = list(options.states);
    if (!states.length) throw new Error("Schema Kit: createSequence richiede almeno uno stato.");
    var wrap = options.wrap !== false;
    var current = options.initial === undefined || options.initial === null ? null : options.initial;
    if (current !== null && states.indexOf(current) === -1) throw new Error("Schema Kit: stato iniziale non valido.");
    var started = current !== null;

    function publish(previous, source) {
      if (options.onChange) options.onChange({
        state: current,
        previous: previous,
        source: source || "api",
        started: started,
        index: current === null ? -1 : states.indexOf(current)
      });
      return current;
    }

    function set(state, source) {
      if (states.indexOf(state) === -1) throw new Error("Schema Kit: stato sconosciuto " + state + ".");
      var previous = current;
      current = state;
      started = true;
      return publish(previous, source);
    }

    function start(source) {
      return started ? current : set(states[0], source || "start");
    }

    function next(source) {
      if (!started) return start(source || "next");
      var index = states.indexOf(current);
      if (index === states.length - 1 && !wrap) return current;
      return set(states[(index + 1) % states.length], source || "next");
    }

    function reset(source) {
      var previous = current;
      current = null;
      started = false;
      return publish(previous, source || "reset");
    }

    return Object.freeze({
      states: states.slice(),
      current: function () { return current; },
      index: function () { return current === null ? -1 : states.indexOf(current); },
      isOff: function () { return current === null; },
      hasStarted: function () { return started; },
      start: start,
      next: next,
      set: set,
      reset: reset
    });
  }

  function createAutoplay(options) {
    options = options || {};
    if (!options.sequence) throw new Error("Schema Kit: createAutoplay richiede una sequenza.");
    var timer = null;
    var playing = false;
    var delay = Math.max(0, options.delay || 4200);

    function eligible() {
      return playing && (!options.canRun || options.canRun());
    }

    function clear() {
      if (timer !== null) global.clearTimeout(timer);
      timer = null;
    }

    function schedule() {
      clear();
      if (!eligible()) return;
      timer = global.setTimeout(function () {
        timer = null;
        options.sequence.next("auto");
        schedule();
      }, delay);
    }

    function set(active) {
      playing = !!active;
      if (playing && options.sequence.isOff()) options.sequence.start("auto");
      schedule();
      if (options.onChange) options.onChange(playing);
      return playing;
    }

    return Object.freeze({
      set: set,
      toggle: function () { return set(!playing); },
      refresh: schedule,
      stop: function () { return set(false); },
      destroy: function () { playing = false; clear(); },
      isPlaying: function () { return playing; }
    });
  }

  global.FrontieraSchemaKit = Object.freeze({
    version: "1.0.0",
    list: list,
    pageVisible: pageVisible,
    reducedMotion: reducedMotion,
    pathLength: pathLength,
    createContext: createContext,
    valid: valid,
    cancel: cancel,
    destroy: destroy,
    wait: wait,
    animate: animate,
    clearLayer: clearLayer,
    setOpacity: setOpacity,
    resetOpacity: resetOpacity,
    fade: fade,
    drawPath: drawPath,
    pulse: pulse,
    observeLifecycle: observeLifecycle,
    createSequence: createSequence,
    createAutoplay: createAutoplay
  });
})(window, document);
