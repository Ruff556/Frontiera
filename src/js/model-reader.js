/* Shared scientific/editorial reader. Model modules supply only canonical
   rendering and definitions. Spatial and temporal state stay independent of
   the unified mobile interaction mode. No wheel interception or scroll snapping. */
(() => {
  "use strict";
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  document.querySelectorAll("[data-model-reader]").forEach(root => {
    const model = window.FrontieraModels?.[root.dataset.modelReader];
    if (!model) return; // Static SVGs and the entire article remain readable.
    const q = selector => root.querySelector(selector);
    const all = selector => [...root.querySelectorAll(selector)];
    const graph = q(".mr-graph"), reading = q(".mr-reading"), workspace = q(".mr-workspace");
    const track = q(".mr-plots"), plotWindow = q(".mr-plots-window");
    const panels = all("[data-model-panel]"), charts = all(".mr-chart");
    const staticCharts = charts.map(svg => ({viewBox: svg.getAttribute("viewBox"), markup: svg.innerHTML}));
    const segments = all("[data-context-panel]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const state = {
      layout: null, space: "overview", panel: 0, focus: null, time: 3,
      mode: "auto", freePanel: null, manualFocus: null,
      desktopFocus: null, contextPanel: 0, contextFocus: null, progress: 0,
    };
    let dimensions = {}, contexts = [], frame = 0, measureFrame = 0, animationTimer, failed = false;
    let lastRenderSizes = [], lastFocus, pointer, panelAnimationTimer, suppressSelectorClick = false;

    // An inert, hidden intrinsic-size probe uses the same desktop CSS. It has
    // no IDs, landmarks or event handlers and is never a second state source.
    const probe = document.createElement("div");
    probe.className = "model-reader mr-measure";
    probe.dataset.layout = "desktop";
    probe.setAttribute("aria-hidden", "true");
    probe.inert = true;
    probe.append(graph.cloneNode(true));
    probe.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    document.body.append(probe);

    function measureContexts() {
      const base = reading.getBoundingClientRect().top;
      contexts = segments.map(el => ({
        panel: Number(el.dataset.contextPanel), variable: el.dataset.contextVariable || null,
        top: el.getBoundingClientRect().top - base + reading.scrollTop,
        bottom: el.getBoundingClientRect().bottom - base + reading.scrollTop,
      }));
    }
    function scheduleMeasure() {
      if (!failed && !measureFrame) measureFrame = requestAnimationFrame(measure);
    }
    function measure() {
      measureFrame = 0;
      if (failed) return;
      root.dataset.ready = "true";
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const viewport = window.visualViewport;
      const height = viewport ? viewport.height : innerHeight;
      const width = Math.min(root.clientWidth, viewport ? viewport.width : innerWidth);
      const navHeight = document.querySelector(".nav")?.getBoundingClientRect().height || 0;
      root.style.setProperty("--mr-nav-h", `${navHeight}px`);
      root.style.setProperty("--mr-viewport-h", `${height}px`);
      const rootStyle = getComputedStyle(root), heading = q(".mr-heading");
      const headingStyle = getComputedStyle(heading);
      // Intrinsic heights only: never use a coordinate affected by outer scroll.
      const reserved = navHeight + parseFloat(rootStyle.paddingTop) +
        heading.getBoundingClientRect().height + parseFloat(headingStyle.marginBottom);
      let available = Math.max(0, height - reserved);
      const tabHeight = 2.75 * rem + (parseFloat(rootStyle.getPropertyValue("--mr-safe-bottom")) || 0);
      const gap = parseFloat(getComputedStyle(root).getPropertyValue("--mr-gap")) * rem;
      const column = (workspace.clientWidth - gap) / 2;
      probe.style.width = `${Math.max(28 * rem, column)}px`;
      // X is the actual intrinsic graph height; Y includes the real global
      // header, model masthead and vertical margins. Measured only on resize.
      const minimum = Math.ceil(probe.firstElementChild.getBoundingClientRect().height);
      const desktopBottom = parseFloat(rootStyle.paddingTop);
      const fits = width >= 56 * rem && column >= 26 * rem && available - desktopBottom >= minimum + 2;
      if (fits) available -= desktopBottom;
      const layout = fits ? "desktop" : "mobile";
      const old = state.layout;
      const anchor = contexts.find(c => c.bottom > reading.scrollTop + (old === "mobile" ? dimensions.compact + 24 : 24));
      const anchorElement = anchor ? segments[contexts.indexOf(anchor)] : null;
      const anchorOffset = anchor ? reading.scrollTop - anchor.top : 0;
      dimensions = {
        available, minimum, compact: Math.min(available - tabHeight - gap, Math.max(12.5 * rem, Math.min(17 * rem, available * .53))),
        expanded: available - tabHeight - gap, gap,
      };
      root.style.setProperty("--mr-available", `${available}px`);
      root.style.setProperty("--mr-expanded", `${dimensions.expanded}px`);
      root.style.setProperty("--mr-compact", `${dimensions.compact}px`);
      root.dataset.minimumHeight = String(minimum);
      root.dataset.reservedHeight = String(Math.round(height - available));
      root.dataset.layout = layout;
      root.dataset.ready = "true";
      state.layout = layout;
      if (old && old !== layout && anchorElement) {
        measureContexts();
        const next = contexts[segments.indexOf(anchorElement)];
        reading.scrollTop = Math.max(0, next.top + anchorOffset);
      }
      measureContexts();
      lastRenderSizes = [];
      update();
    }
    function context() {
      const line = reading.scrollTop + dimensions.compact + 32;
      const current = contexts.find(c => line >= c.top && line < c.bottom);
      state.contextFocus = current?.variable || null;
      const starts = model.panels.map((_, i) => contexts.find(c => c.panel === i)?.top ?? Infinity);
      let progress = 0;
      const zone = Math.max(80, Math.min(180, (dimensions.available - dimensions.compact) * .42));
      for (let i = 1; i < starts.length; i++) {
        progress += clamp((line - starts[i] + zone / 2) / zone, 0, 1);
      }
      state.progress = progress;
      state.contextPanel = Math.round(progress);
    }
    function resolveInteraction() {
      if (state.layout === "desktop") { state.focus = state.desktopFocus; return; }
      if (state.mode === "focus") {
        state.focus = state.manualFocus;
        state.panel = model.defs.find(d => d.id === state.manualFocus).panel;
      } else if (state.mode === "free") {
        state.focus = null;
        state.panel = state.freePanel;
      } else {
        state.panel = state.contextPanel;
        state.focus = state.space === "overview" ? null : state.contextFocus;
      }
    }
    function realign() {
      state.mode = "auto";
      state.manualFocus = state.freePanel = state.desktopFocus = null;
    }
    function focus() {
      const next = state.focus;
      if (next === lastFocus) return;
      lastFocus = next;
      all("[data-focus]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.focus === next)));
      all("[data-series]").forEach(series => {
        series.classList.toggle("is-muted", Boolean(next) && series.dataset.series !== next);
        series.classList.toggle("is-focused", series.dataset.series === next);
      });
      all("[data-term]").forEach(term => term.classList.toggle("is-focused", term.dataset.term === next));
      const def = model.defs.find(d => d.id === next);
      q("[data-description-title]").textContent = def ? `${def.symbol} · ${def.name}` : "Nessuna variabile in focus";
      q("[data-description]").textContent = def?.description || "Seleziona una sigla nel grafico o nel testo per seguirne il significato.";
      root.dataset.focus = next || "";
    }
    function renderCharts() {
      charts.forEach((svg, i) => {
        const width = Math.round(svg.clientWidth), height = Math.round(svg.clientHeight);
        const key = `${width}:${height}:${state.time}`;
        if (width < 1 || height < 1 || lastRenderSizes[i] === key) return;
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.innerHTML = model.render(i, width, height, state.time);
        lastRenderSizes[i] = key;
        lastFocus = undefined;
      });
    }
    function update() {
      frame = 0;
      if (failed || !state.layout) return;
      if (state.layout === "mobile") {
        if (state.space !== "expanded") state.space = reading.scrollTop > 1 ? "reading" : "overview";
        context();
        resolveInteraction();
        const distance = Math.max(1, dimensions.expanded - dimensions.compact);
        const collapse = state.space === "expanded" ? 0 : clamp(reading.scrollTop / distance, 0, 1);
        const graphHeight = state.space === "expanded" ? dimensions.expanded : dimensions.expanded - collapse * distance;
        root.style.setProperty("--mr-graph-h", `${graphHeight}px`);
        root.dataset.overview = String(collapse < 1);
        // Each panel grows continuously from a third of the overview to one
        // complete slot. Only its contents translate; the cell stays fixed.
        const plotHeight = plotWindow.getBoundingClientRect().height;
        const headerHeight = Math.max(...panels.map(panel => panel.querySelector("header").getBoundingClientRect().height));
        const minimumSlot = headerHeight + 66;
        const constrained = plotHeight < minimumSlot * 3 && collapse < 1;
        root.dataset.constrained = String(constrained);
        const slot = constrained ? Math.max(minimumSlot, plotHeight * (1 / 3 + 2 / 3 * collapse)) : plotHeight * (1 / 3 + 2 / 3 * collapse);
        if (!constrained) plotWindow.scrollTop = 0;
        panels.forEach(panel => { panel.style.height = `${slot}px`; panel.style.flexBasis = `${slot}px`; });
        const position = state.mode === "auto" ? (reduced.matches ? state.contextPanel : state.progress) : state.panel;
        track.style.transform = `translateY(${-position * slot * collapse}px)`;
        panels.forEach((panel, i) => {
          const visible = collapse < 1 || Math.abs(i - position) < 1;
          panel.inert = !visible;
          panel.setAttribute("aria-hidden", String(!visible));
        });
      } else {
        resolveInteraction();
        track.style.transform = "";
        panels.forEach(panel => { panel.style.height = ""; panel.style.flexBasis = ""; panel.inert = false; panel.removeAttribute("aria-hidden"); });
      }
      root.dataset.space = state.space;
      root.dataset.panel = String(state.panel);
      root.dataset.sync = state.mode;
      q("[data-panel-name]").textContent = model.panels[state.panel].name;
      q("[data-sync-label]").textContent = state.mode === "auto" ? "Segue il testo" : state.mode === "focus" ? "Focus manuale · tocca per allineare" : "Libero · tocca per allineare";
      q("[data-panel-sync]").setAttribute("aria-pressed", String(state.mode === "auto"));
      all("[data-panel-step]").forEach(b => b.disabled = state.panel + Number(b.dataset.panelStep) < 0 || state.panel + Number(b.dataset.panelStep) >= panels.length);
      q("[data-expand]").setAttribute("aria-expanded", String(state.space === "expanded"));
      q("[data-expand]").setAttribute("aria-label", state.space === "expanded" ? "Torna alla lettura" : "Espandi la rappresentazione");
      q("[data-resume]").firstChild.textContent = state.space === "expanded" ? "Riprendi la lettura " : "Leggi il modello ";
      q("[data-focus-sync]").hidden = state.mode === "auto";
      renderCharts();
      focus();
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    function animateGeometry() {
      root.dataset.animating = "true";
      clearTimeout(animationTimer);
      animationTimer = setTimeout(() => { delete root.dataset.animating; schedule(); }, 300);
    }
    function resume() {
      if (state.space === "expanded") {
        animateGeometry();
        state.space = "reading";
        // Expansion and resumption preserve even a partial entry offset.
      } else {
        reading.scrollTop = dimensions.expanded - dimensions.compact;
      }
      update();
      reading.focus({ preventScroll: true });
    }
    function animatePanel() {
      root.dataset.panelAnimating = "true";
      clearTimeout(panelAnimationTimer);
      panelAnimationTimer = setTimeout(() => { delete root.dataset.panelAnimating; }, 300);
    }
    function navigate(delta) {
      animatePanel();
      state.freePanel = clamp(state.panel + delta, 0, panels.length - 1);
      state.mode = "free";
      state.manualFocus = state.desktopFocus = null;
      update();
    }
    root.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-focus")) {
        const key = button.dataset.focus;
        if (state.layout === "desktop") {
          state.desktopFocus = state.desktopFocus === key ? null : key;
          state.manualFocus = state.desktopFocus;
          state.mode = state.manualFocus ? "focus" : "auto";
          state.freePanel = null;
        } else if (state.mode === "focus" && state.manualFocus === key) {
          realign();
        } else {
          state.mode = "focus";
          state.manualFocus = state.desktopFocus = key;
          state.freePanel = null;
        }
      } else if (button.hasAttribute("data-focus-sync")) {
        animatePanel(); realign();
      } else if (button.hasAttribute("data-panel-step")) {
        navigate(Number(button.dataset.panelStep)); return;
      } else if (button.hasAttribute("data-panel-sync")) {
        animatePanel(); realign();
      } else if (button.hasAttribute("data-expand")) {
        if (state.space === "expanded") { resume(); return; }
        animateGeometry(); state.space = "expanded";
      } else if (button.hasAttribute("data-resume")) { resume(); return;
      } else if (button.hasAttribute("data-model-event")) {
        state.time = Number(button.dataset.modelEvent);
        all("[data-model-event]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
        q("[data-phase]").textContent = model.phases[state.time];
      }
      update();
    });
    const selector = q("[data-panel-selector]");
    selector.addEventListener("pointerdown", e => {
      suppressSelectorClick = false;
      pointer = {x:e.clientX,y:e.clientY,id:e.pointerId};
    });
    selector.addEventListener("click", e => {
      if (suppressSelectorClick && e.detail > 0) { e.preventDefault(); e.stopPropagation(); }
      suppressSelectorClick = false;
    }, {capture:true});
    selector.addEventListener("pointerup", e => {
      if (!pointer || e.pointerId !== pointer.id) return;
      const dx=e.clientX-pointer.x, dy=e.clientY-pointer.y; pointer=null;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.5) {
        navigate(dx<0?1:-1);
        // Some touch swipes produce no click. Scope suppression to this gesture:
        // the next pointerdown (or a keyboard click) must remain actionable.
        suppressSelectorClick = true;
      }
    });
    selector.addEventListener("pointercancel", () => { pointer=null; });
    reading.addEventListener("scroll", () => { delete root.dataset.panelAnimating; schedule(); }, {passive:true});
    window.addEventListener("resize", scheduleMeasure, {passive:true});
    window.visualViewport?.addEventListener("resize", scheduleMeasure, {passive:true});
    reduced.addEventListener("change", schedule);
    // ResizeObserver records chart size changes during a spatial animation;
    // it never writes dimensions of the observed element itself.
    new ResizeObserver(schedule).observe(plotWindow);
    new ResizeObserver(scheduleMeasure).observe(q(".mr-heading"));
    const nav = document.querySelector(".nav");
    if (nav) new ResizeObserver(scheduleMeasure).observe(nav);
    document.fonts.ready.then(scheduleMeasure);
    try {
      measure();
      document.documentElement.dataset.modelReaderReady = "true";
    } catch (error) {
      // Failed enhancement must leave the complete static document accessible.
      failed = true;
      state.layout = null;
      track.style.transform = "";
      panels.forEach(panel => { panel.style.height = ""; panel.style.flexBasis = ""; panel.inert = false; panel.removeAttribute("aria-hidden"); });
      delete root.dataset.ready;
      delete root.dataset.layout;
      delete document.documentElement.dataset.modelReaderReady;
      charts.forEach((svg, i) => { svg.setAttribute("viewBox", staticCharts[i].viewBox); svg.innerHTML = staticCharts[i].markup; });
      probe.remove();
      console.error("Model Reader initialization failed", error);
    }
  });
})();
