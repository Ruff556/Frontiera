/*
 * Catalogo Sistemi — cluster verticali a scorrimento orizzontale su touch.
 *
 * Le card originali sono spostate fra wrapper di gruppo, mai duplicate. Senza
 * JavaScript resta la griglia CSS della pagina; sul desktop fine la struttura
 * viene mantenuta piatta e conserva integralmente il comportamento esistente.
 */
(() => {
  "use strict";

  const sections = [...document.querySelectorAll(".sistemi")];
  if (!sections.length) return;

  const desktopFine = window.matchMedia(
    "(min-width: 1000px) and (hover: hover) and (pointer: fine)"
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  sections.forEach((section) => {
    const track = section.querySelector("[data-sistemi-track]");
    const controls = section.querySelector("[data-sistemi-controls]");
    const indicator = section.querySelector("[data-sistemi-indicator]");
    const toggle = section.querySelector("[data-sistemi-layout-toggle]");
    if (!track || !controls || !indicator || !toggle) return;

    const cards = [...track.querySelectorAll(":scope > .sistema-card")];
    if (!cards.length) return;

    let size = 2;
    let clusters = [];
    let activeCluster = null;
    let scrollTimer = 0;
    let resizeFrame = 0;
    let pointer = null;
    let pendingClick = null;
    let suppressClick = false;
    let enhanced = false;

    const pad = (value) => String(value).padStart(2, "0");

    const targetScrollLeft = (cluster) => {
      const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
      const trackRect = track.getBoundingClientRect();
      const clusterRect = cluster.getBoundingClientRect();
      const relativeLeft = track.scrollLeft + clusterRect.left - trackRect.left;
      return Math.min(Math.max(0, relativeLeft), maximum);
    };

    const isLocked = (cluster) =>
      Math.abs(track.scrollLeft - targetScrollLeft(cluster)) <= 5;

    const scrollToCluster = (cluster, behavior) => {
      track.scrollTo({ left: targetScrollLeft(cluster), behavior });
    };

    const updateControls = () => {
      const index = Math.max(0, clusters.indexOf(activeCluster));
      const current = index + 1;
      const total = Math.max(1, clusters.length);
      indicator.textContent = `${pad(current)} / ${pad(total)}`;
      indicator.setAttribute("aria-label", `Gruppo ${current} di ${total}`);
      const compact = size === 3;
      toggle.setAttribute("aria-pressed", String(compact));
      toggle.setAttribute(
        "aria-label",
        compact ? "Mostra due sistemi per gruppo" : "Mostra tre sistemi per gruppo"
      );
    };

    const setActive = (cluster) => {
      if (!cluster || cluster === activeCluster) return;
      activeCluster = cluster;
      clusters.forEach((item) => {
        const active = item === cluster;
        item.classList.toggle("sistema-cluster--attivo", active);
        item.setAttribute("aria-current", active ? "true" : "false");
      });
      updateControls();
    };

    const nearestCluster = () => {
      let nearest = clusters[0];
      let distance = Infinity;
      clusters.forEach((cluster) => {
        const nextDistance = Math.abs(track.scrollLeft - targetScrollLeft(cluster));
        if (nextDistance < distance) {
          nearest = cluster;
          distance = nextDistance;
        }
      });
      return nearest;
    };

    const settle = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = 0;
      if (!enhanced || desktopFine.matches) return;
      setActive(nearestCluster());
    };

    const scheduleSettle = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settle, 110);
    };

    const makeClusters = (anchorIndex = 0) => {
      const fragment = document.createDocumentFragment();
      cards.forEach((card) => fragment.append(card));
      track.replaceChildren();
      clusters = [];

      for (let start = 0; start < cards.length; start += size) {
        const cluster = document.createElement("div");
        cluster.className = "sistema-cluster";
        cluster.dataset.startIndex = String(start);
        cluster.setAttribute("role", "group");
        cluster.setAttribute("aria-label", `Gruppo ${clusters.length + 1}`);
        for (let index = start; index < Math.min(start + size, cards.length); index += 1) {
          cluster.append(cards[index]);
        }
        clusters.push(cluster);
        track.append(cluster);
      }

      track.classList.add("sistemi-grid--cluster");
      track.dataset.clusterSize = String(size);
      section.classList.add("sistemi--enhanced");
      controls.hidden = false;
      enhanced = true;

      const nextIndex = Math.min(Math.floor(anchorIndex / size), clusters.length - 1);
      activeCluster = null;
      setActive(clusters[Math.max(0, nextIndex)]);
      window.requestAnimationFrame(() => {
        if (!enhanced || desktopFine.matches) return;
        scrollToCluster(activeCluster, "auto");
        settle();
      });
    };

    const flatten = () => {
      if (!enhanced) return;
      window.clearTimeout(scrollTimer);
      cards.forEach((card) => track.append(card));
      clusters.forEach((cluster) => cluster.remove());
      clusters = [];
      activeCluster = null;
      track.classList.remove("sistemi-grid--cluster");
      delete track.dataset.clusterSize;
      section.classList.remove("sistemi--enhanced");
      controls.hidden = true;
      track.scrollLeft = 0;
      enhanced = false;
    };

    const syncMode = () => {
      if (desktopFine.matches) {
        flatten();
        return;
      }
      if (!enhanced) makeClusters(0);
    };

    toggle.addEventListener("click", () => {
      if (!enhanced || desktopFine.matches) return;
      settle();
      const anchorIndex = Number(activeCluster?.dataset.startIndex || 0);
      size = size === 2 ? 3 : 2;
      makeClusters(anchorIndex);
    });

    track.addEventListener("scroll", scheduleSettle, { passive: true });
    track.addEventListener("scrollend", settle, { passive: true });

    track.addEventListener("focusin", (event) => {
      if (!enhanced || desktopFine.matches) return;
      const cluster = event.target.closest(".sistema-cluster");
      if (!cluster || !track.contains(cluster)) return;
      if (pointer) return;
      setActive(cluster);
      scrollToCluster(cluster, "auto");
    });

    track.addEventListener(
      "pointerdown",
      (event) => {
        if (!enhanced || desktopFine.matches || event.button !== 0) return;
        const cluster = event.target.closest(".sistema-cluster");
        pointer = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          dragged: false,
          cluster,
          wasProtagonist: Boolean(cluster && cluster === activeCluster && isLocked(cluster)),
        };
        pendingClick = null;
      },
      { passive: true }
    );

    track.addEventListener(
      "pointermove",
      (event) => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const dx = Math.abs(event.clientX - pointer.x);
        const dy = Math.abs(event.clientY - pointer.y);
        if (dx > 8 && dx > dy * 0.75) pointer.dragged = true;
      },
      { passive: true }
    );

    const finishPointer = (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (pointer.dragged) {
        suppressClick = true;
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      } else if (event.type === "pointerup" && pointer.cluster) {
        pendingClick = {
          cluster: pointer.cluster,
          wasProtagonist: pointer.wasProtagonist,
        };
      }
      pointer = null;
    };

    track.addEventListener("pointerup", finishPointer, { passive: true });
    track.addEventListener("pointercancel", finishPointer, { passive: true });

    track.addEventListener(
      "click",
      (event) => {
        if (!enhanced || desktopFine.matches) return;
        const link = event.target.closest(".sistema-card-link[href]");
        if (!link || !track.contains(link)) return;

        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
          return;
        }

        const cluster = link.closest(".sistema-cluster");
        const pointerSnapshot = pendingClick?.cluster === cluster ? pendingClick : null;
        pendingClick = null;
        const wasProtagonist = pointerSnapshot
          ? pointerSnapshot.wasProtagonist
          : cluster === activeCluster && isLocked(cluster);
        if (wasProtagonist) return;

        event.preventDefault();
        event.stopPropagation();
        setActive(cluster);
        scrollToCluster(cluster, reducedMotion.matches ? "auto" : "smooth");
      },
      true
    );

    window.addEventListener(
      "resize",
      () => {
        if (!enhanced || desktopFine.matches || resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0;
          scrollToCluster(activeCluster, "auto");
          settle();
        });
      },
      { passive: true }
    );

    desktopFine.addEventListener("change", syncMode);
    syncMode();
  });
})();
