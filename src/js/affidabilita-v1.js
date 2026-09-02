(() => {
  "use strict";

  const panel = document.querySelector("[data-aff-v1-panel]");
  if (!panel) return;

  const ui = {
    title: panel.querySelector("[data-aff-v1-title]"),
    level: panel.querySelector("[data-aff-v1-level]"),
    reason: panel.querySelector("[data-aff-v1-reason]"),
    sources: panel.querySelector("[data-aff-v1-sources]"),
  };
  const mediaMobile = window.matchMedia("(max-width: 919px)");
  const COSTANTI = Object.freeze({
    gap: 8,
    safe: 16,
    sogliaTap: 12,
    larghezzaDesktop: 320,
    rientroMobile: 12,
  });
  const state = {
    anchor: null,
    record: null,
    orizzontale: "left",
    mobile: mediaMobile.matches,
    frame: 0,
    pointer: null,
  };

  const visuale = () => {
    const vv = window.visualViewport;
    return {
      left: vv ? vv.offsetLeft : 0,
      top: vv ? vv.offsetTop : 0,
      width: vv ? vv.width : document.documentElement.clientWidth,
      height: vv ? vv.height : document.documentElement.clientHeight,
      pageLeft: vv && Number.isFinite(vv.pageLeft) ? vv.pageLeft : window.scrollX,
      pageTop: vv && Number.isFinite(vv.pageTop) ? vv.pageTop : window.scrollY,
    };
  };

  function formattaData(iso) {
    if (!iso) return "";
    const data = new Date(`${iso}T00:00:00Z`);
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(data);
  }

  function creaFonte(fonte) {
    const riga = document.createElement("div");
    riga.className = "aff-v1-panel__source";
    const nome = fonte.url ? document.createElement("a") : document.createElement("span");
    nome.className = fonte.url ? "" : "aff-v1-panel__source-name";
    nome.textContent = fonte.nome;
    if (fonte.url) {
      nome.href = fonte.url;
      const destinazione = new URL(fonte.url, window.location.href);
      if (destinazione.origin !== window.location.origin) {
        nome.target = "_blank";
        nome.rel = "noopener noreferrer";
      }
    }
    riga.append(nome);
    if (fonte.data) {
      const data = document.createElement("time");
      data.className = "aff-v1-panel__source-date";
      data.dateTime = fonte.data;
      data.textContent = formattaData(fonte.data);
      riga.append(data);
    }
    return riga;
  }

  function popola(record) {
    ui.title.textContent = record.titolo;
    ui.level.textContent = record.etichetta;
    ui.reason.textContent = record.motivazione;
    ui.sources.replaceChildren(...record.fonti.map(creaFonte));
    panel.classList.remove(
      "aff-v1-panel--conf",
      "aff-v1-panel--plaus",
      "aff-v1-panel--nonver",
      "aff-v1-panel--disinfo"
    );
    panel.classList.add(`aff-v1-panel--${record.classe}`);
  }

  function recordDa(anchor) {
    try {
      return JSON.parse(decodeURIComponent(anchor.dataset.affV1Record));
    } catch (errore) {
      console.error("[affidabilita V1] record non leggibile", errore);
      return null;
    }
  }

  function larghezzaPanel(vv, mobile) {
    if (!mobile) return Math.min(COSTANTI.larghezzaDesktop, vv.width - COSTANTI.safe * 2);
    const articolo = state.anchor.closest(".reading") || document.querySelector(".reading");
    const corpo = articolo ? articolo.getBoundingClientRect().width : vv.width;
    return Math.max(
      224,
      Math.min(COSTANTI.larghezzaDesktop, corpo - COSTANTI.rientroMobile * 2, vv.width - COSTANTI.safe * 2)
    );
  }

  function posiziona() {
    state.frame = 0;
    if (!state.anchor || panel.hidden) return;

    const vv = visuale();
    const mobile = mediaMobile.matches;
    if (mobile !== state.mobile) {
      state.mobile = mobile;
      state.orizzontale = mobile ? "centered" : "left";
    }

    const anchorRect = state.anchor.getBoundingClientRect();
    const viewRight = vv.left + vv.width;
    const viewBottom = vv.top + vv.height;
    const panelWidth = larghezzaPanel(vv, mobile);
    const limiteBase = mobile ? Math.min(380, vv.height * .56) : Math.min(480, vv.height * .72);

    panel.dataset.affV1Measuring = "true";
    panel.style.width = `${panelWidth}px`;
    panel.style.setProperty("--aff-v1-available-height", `${Math.max(144, limiteBase)}px`);
    let panelRect = panel.getBoundingClientRect();

    const spazioSopra = anchorRect.top - vv.top;
    const altezzaDisponibile = Math.max(
      144,
      Math.min(limiteBase, spazioSopra - COSTANTI.gap - COSTANTI.safe)
    );
    panel.style.setProperty("--aff-v1-available-height", `${altezzaDisponibile}px`);
    panelRect = panel.getBoundingClientRect();

    let x;
    if (mobile) {
      state.orizzontale = "centered";
      x = vv.pageLeft + (vv.width - panelRect.width) / 2;
    } else {
      const sinistra = window.scrollX + anchorRect.left;
      const destra = window.scrollX + anchorRect.right - panelRect.width;
      const safeLeft = vv.pageLeft + COSTANTI.safe;
      const safeRight = vv.pageLeft + vv.width - COSTANTI.safe;
      if (state.orizzontale === "left" && sinistra + panelRect.width > safeRight) {
        state.orizzontale = "right";
      } else if (state.orizzontale === "right" && destra < safeLeft && sinistra + panelRect.width <= safeRight) {
        state.orizzontale = "left";
      }
      x = state.orizzontale === "right" ? destra : sinistra;
      x = Math.max(safeLeft, Math.min(x, safeRight - panelRect.width));
    }

    const y = window.scrollY + anchorRect.top - panelRect.height - COSTANTI.gap;

    panel.style.left = `${Math.round(x)}px`;
    panel.style.top = `${Math.round(y)}px`;
    panel.dataset.orizzontale = state.orizzontale;

    const anchorVisibile =
      anchorRect.bottom >= vv.top && anchorRect.top <= viewBottom &&
      anchorRect.right >= vv.left && anchorRect.left <= viewRight;
    const panelVisibile =
      y + panelRect.height >= vv.pageTop && y <= vv.pageTop + vv.height &&
      x + panelRect.width >= vv.pageLeft && x <= vv.pageLeft + vv.width;
    panel.dataset.anchorState = anchorVisibile || panelVisibile ? "anchored" : "offscreen";
    delete panel.dataset.affV1Measuring;
  }

  function programmaPosizione() {
    if (!state.frame) state.frame = window.requestAnimationFrame(posiziona);
  }

  const resizeObserver = "ResizeObserver" in window
    ? new ResizeObserver(programmaPosizione)
    : null;

  function osserva() {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(panel);
    if (state.anchor) resizeObserver.observe(state.anchor);
  }

  function chiudi({ restituisciFocus = false } = {}) {
    if (!state.anchor) return;
    const precedente = state.anchor;
    precedente.setAttribute("aria-expanded", "false");
    state.anchor = null;
    state.record = null;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.removeAttribute("data-anchor-state");
    resizeObserver?.disconnect();
    if (state.frame) {
      window.cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    if (restituisciFocus) precedente.focus({ preventScroll: true });
  }

  function apri(anchor, daTastiera) {
    const record = recordDa(anchor);
    if (!record) return;
    if (state.anchor && state.anchor !== anchor) state.anchor.setAttribute("aria-expanded", "false");
    state.anchor = anchor;
    state.record = record;
    state.mobile = mediaMobile.matches;
    state.orizzontale = state.mobile ? "centered" : "left";
    anchor.setAttribute("aria-expanded", "true");
    popola(record);
    panel.hidden = false;
    panel.removeAttribute("aria-hidden");
    osserva();
    posiziona();
    if (daTastiera) panel.focus({ preventScroll: true });
  }

  document.addEventListener("click", (evento) => {
    const anchor = evento.target.closest?.("[data-aff-v1-trigger]");
    if (!anchor) return;
    if (state.anchor === anchor) chiudi();
    else apri(anchor, evento.detail === 0);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && state.anchor) {
      evento.preventDefault();
      chiudi({ restituisciFocus: true });
    }
  });

  document.addEventListener("pointerdown", (evento) => {
    if (!evento.isPrimary || !state.anchor) return;
    state.pointer = {
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      interno: Boolean(evento.target.closest?.("[data-aff-v1-trigger], [data-aff-v1-panel]")),
    };
  }, { passive: true });

  document.addEventListener("pointerup", (evento) => {
    const partenza = state.pointer;
    state.pointer = null;
    if (!partenza || partenza.id !== evento.pointerId || partenza.interno || !state.anchor) return;
    const spostamento = Math.hypot(evento.clientX - partenza.x, evento.clientY - partenza.y);
    const arrivoInterno = evento.target.closest?.("[data-aff-v1-trigger], [data-aff-v1-panel]");
    if (spostamento <= COSTANTI.sogliaTap && !arrivoInterno) chiudi();
  }, { passive: true });

  window.addEventListener("scroll", programmaPosizione, { passive: true });
  window.addEventListener("resize", programmaPosizione, { passive: true });
  mediaMobile.addEventListener?.("change", programmaPosizione);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", programmaPosizione, { passive: true });
    window.visualViewport.addEventListener("resize", programmaPosizione, { passive: true });
  }
  document.fonts?.ready.then(programmaPosizione);
})();
