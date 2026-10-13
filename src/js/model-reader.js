/* Shared scientific/editorial reader. Model modules supply only canonical
   rendering and definitions; spatial, focus and synchronization states are
   deliberately independent. No wheel interception or scroll snapping. */
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
    const segments = all("[data-context-panel]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const state = {
      layout: null, space: "overview", panel: 0, focus: null, time: 3,
      syncPanel: true, syncFocus: true, manualFocus: null,
      desktopFocus: null, contextPanel: 0, contextFocus: null, progress: 0,
    };
    let dimensions = {}, contexts = [], frame = 0, measureFrame = 0, animationTimer;
    let lastRenderSizes = [], lastFocus, pointer, panelAnimationTimer;

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
      if (!measureFrame) measureFrame = requestAnimationFrame(measure);
    }
    function measure() {
      measureFrame = 0;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const viewport = window.visualViewport;
      const height = viewport ? viewport.height : innerHeight;
      const width = Math.min(root.clientWidth, viewport ? viewport.width : innerWidth);
      const navHeight = document.querySelector(".nav")?.getBoundingClientRect().height || 0;
      root.style.setProperty("--mr-nav-h", `${navHeight}px`);
      const workspaceTop = workspace.getBoundingClientRect().top;
      const padding = parseFloat(getComputedStyle(root).paddingBottom);
      const available = Math.max(240, height - workspaceTop - padding);
      const gap = parseFloat(getComputedStyle(root).getPropertyValue("--mr-gap")) * rem;
      const column = (workspace.clientWidth - gap) / 2;
      probe.style.width = `${Math.max(28 * rem, column)}px`;
      // X is the actual intrinsic graph height; Y includes the real global
      // header, model masthead and vertical margins. Measured only on resize.
      const minimum = Math.ceil(probe.firstElementChild.getBoundingClientRect().height);
      const fits = width >= 56 * rem && column >= 26 * rem && available >= minimum + 2;
      const layout = fits ? "desktop" : "mobile";
      const old = state.layout;
      const anchor = contexts.find(c => c.bottom > reading.scrollTop + (old === "mobile" ? dimensions.compact + 24 : 24));
      const anchorElement = anchor ? segments[contexts.indexOf(anchor)] : null;
      const anchorOffset = anchor ? reading.scrollTop - anchor.top : 0;
      dimensions = {
        available, minimum, compact: Math.min(available - 30 - gap, Math.max(12.5 * rem, Math.min(17 * rem, available * .53))),
        expanded: available - 30 - gap, gap,
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
      if (state.syncPanel) state.panel = state.contextPanel;
    }
    function focus() {
      const next = state.layout === "desktop" ? state.desktopFocus :
        !state.syncFocus ? state.manualFocus : state.syncPanel && state.space !== "overview" ? state.contextFocus : null;
      state.focus = next;
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
      if (!state.layout) return;
      if (state.layout === "mobile") {
        if (state.space !== "expanded") state.space = reading.scrollTop > 1 ? "reading" : "overview";
        context();
        const distance = Math.max(1, dimensions.expanded - dimensions.compact);
        const collapse = state.space === "expanded" ? 1 : clamp(reading.scrollTop / distance, 0, 1);
        const graphHeight = state.space === "expanded" ? dimensions.expanded : dimensions.expanded - collapse * distance;
        root.style.setProperty("--mr-graph-h", `${graphHeight}px`);
        root.dataset.overview = String(collapse < 1 && state.space !== "expanded");
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
        const position = state.syncPanel ? (reduced.matches ? state.contextPanel : state.progress) : state.panel;
        track.style.transform = `translateY(${-position * slot * collapse}px)`;
        panels.forEach((panel, i) => {
          const visible = collapse < 1 || Math.abs(i - position) < 1;
          panel.inert = !visible;
          panel.setAttribute("aria-hidden", String(!visible));
        });
      } else {
        track.style.transform = "";
        panels.forEach(panel => { panel.style.height = ""; panel.style.flexBasis = ""; panel.inert = false; panel.removeAttribute("aria-hidden"); });
      }
      root.dataset.space = state.space;
      root.dataset.panel = String(state.panel);
      root.dataset.sync = state.syncPanel ? "auto" : "free";
      q("[data-panel-name]").textContent = model.panels[state.panel].name;
      q("[data-sync-label]").textContent = state.syncPanel ? "Segue il testo" : "Libero · tocca per allineare";
      q("[data-panel-sync]").setAttribute("aria-pressed", String(state.syncPanel));
      all("[data-panel-step]").forEach(b => b.disabled = state.panel + Number(b.dataset.panelStep) < 0 || state.panel + Number(b.dataset.panelStep) >= panels.length);
      q("[data-expand]").setAttribute("aria-expanded", String(state.space === "expanded"));
      q("[data-expand]").setAttribute("aria-label", state.space === "expanded" ? "Torna alla lettura" : "Espandi la rappresentazione");
      q("[data-resume]").firstChild.textContent = state.space === "expanded" ? "Riprendi la lettura " : "Leggi il modello ";
      q("[data-focus-sync]").hidden = state.syncFocus;
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
        // Once the article has entered reading, scrollTop is untouched.
        // If a panel was explored from the opening overview, expose the same
        // beginning of the article by completing the entry contraction.
        const entry = dimensions.expanded - dimensions.compact;
        if (reading.scrollTop < entry) reading.scrollTop = entry;
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
      state.panel = clamp(state.panel + delta, 0, panels.length - 1);
      state.syncPanel = false;
      // A manual overview selection becomes an expanded single-panel view,
      // without changing the article offset or requiring a prior expansion.
      if (state.space === "overview") state.space = "expanded";
      update();
    }
    root.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-focus")) {
        const key = button.dataset.focus;
        const selected = state.focus === key ? null : key;
        if (state.layout === "desktop") state.desktopFocus = selected;
        else { state.syncFocus = false; state.manualFocus = selected; }
        // A manual selection remains one selection across layout changes.
        state.desktopFocus = selected;
        state.manualFocus = selected;
        state.syncFocus = false;
      } else if (button.hasAttribute("data-focus-sync")) {
        state.syncFocus = true;
      } else if (button.hasAttribute("data-panel-step")) {
        navigate(Number(button.dataset.panelStep)); return;
      } else if (button.hasAttribute("data-panel-sync")) {
        animatePanel(); state.syncPanel = true;
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
    selector.addEventListener("pointerdown", e => { pointer = {x:e.clientX,y:e.clientY,id:e.pointerId}; });
    selector.addEventListener("pointerup", e => {
      if (!pointer || e.pointerId !== pointer.id) return;
      const dx=e.clientX-pointer.x, dy=e.clientY-pointer.y; pointer=null;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.5) {
        navigate(dx<0?1:-1);
        // Suppress only the click generated by this recognized horizontal swipe.
        selector.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); }, {once:true,capture:true});
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
    measure();
  });
})();
