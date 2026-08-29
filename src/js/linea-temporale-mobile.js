/*
 * Linee F/P della homepage — miglioramento progressivo mobile/touch.
 *
 * Lo scorrimento e lo snap restano interamente nativi. Questo controller si
 * limita a tradurre la porzione visibile di ogni card in presenza grafica, a
 * scegliere l'unica card dominante e a sincronizzare il focus da tastiera.
 */
(() => {
  "use strict";

  const tracks = [...document.querySelectorAll(".linea-fasi")];
  if (!tracks.length) return;

  const desktopFine = window.matchMedia(
    "(min-width: 1000px) and (hover: hover) and (pointer: fine)"
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  tracks.forEach((track) => {
    const cards = [...track.querySelectorAll(":scope > .lf")];
    if (!cards.length) return;

    let frame = 0;
    let pointer = null;
    let pendingClick = null;
    let suppressClick = false;

    const targetScrollLeft = (card) => {
      const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
      return Math.min(card.offsetLeft, maximum);
    };

    const isLocked = (card) =>
      Math.abs(track.scrollLeft - targetScrollLeft(card)) <= 5;

    const bringForward = (card, behavior) => {
      track.scrollTo({
        left: targetScrollLeft(card),
        behavior,
      });
    };

    const setActive = (activeCard) => {
      cards.forEach((card) => {
        card.classList.toggle("lf--attiva", card === activeCard);
      });
    };

    const setPresence = (card, presence) => {
      const p = clamp(presence, 0, 1);
      card.style.setProperty("--lf-mobile-opacity", (0.72 + p * 0.28).toFixed(3));
      card.style.setProperty("--lf-mobile-scene-opacity", (0.5 + p * 0.5).toFixed(3));
      card.style.setProperty("--lf-mobile-saturazione", (0.72 + p * 0.36).toFixed(3));
      card.style.setProperty("--lf-mobile-contrasto", (1.04 - p * 0.01).toFixed(3));
      card.style.setProperty("--lf-mobile-luminosita", (0.82 + p * 0.26).toFixed(3));
      card.style.setProperty("--lf-mobile-testo", (0.62 + p * 0.38).toFixed(3));
      card.style.setProperty("--lf-mobile-anteprima", (0.2 + p * 0.8).toFixed(3));
      card.style.setProperty("--lf-mobile-credito", (0.15 + p * 0.85).toFixed(3));
    };

    const measure = () => {
      frame = 0;
      if (desktopFine.matches) return;

      const trackRect = track.getBoundingClientRect();
      const trackCenter = (trackRect.left + trackRect.right) / 2;
      let activeCard = cards[0];
      let bestPresence = -1;
      let bestDistance = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const visible = Math.max(
          0,
          Math.min(rect.right, trackRect.right) - Math.max(rect.left, trackRect.left)
        );
        const presence = rect.width ? clamp(visible / rect.width, 0, 1) : 0;
        const distance = Math.abs((rect.left + rect.right) / 2 - trackCenter);

        setPresence(card, presence);

        if (
          presence > bestPresence + 0.001 ||
          (Math.abs(presence - bestPresence) <= 0.001 && distance < bestDistance)
        ) {
          activeCard = card;
          bestPresence = presence;
          bestDistance = distance;
        }
      });

      setActive(activeCard);
    };

    const queueMeasure = () => {
      if (desktopFine.matches || frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    track.addEventListener("scroll", queueMeasure, { passive: true });
    track.addEventListener("scrollend", queueMeasure, { passive: true });
    window.addEventListener("resize", queueMeasure, { passive: true });

    track.addEventListener("focusin", (event) => {
      if (desktopFine.matches) return;
      const card = event.target.closest(".lf");
      if (!card || !track.contains(card)) return;

      /* Un tap può assegnare focus fra pointerdown e click. Non deve essere il
         focus generato dal puntatore a promuovere in anticipo la cella: lo farà
         il click usando lo stato fotografato al pointerdown. */
      if (pointer) return;

      setActive(card);
      /* Il focus deve produrre subito uno stato stabile: così Invio apre il
         collegamento senza introdurre una semantica di doppio tap temporizzata. */
      bringForward(card, "auto");
      queueMeasure();
    });

    track.addEventListener(
      "pointerdown",
      (event) => {
        if (desktopFine.matches || event.button !== 0) return;
        const card = event.target.closest(".lf");
        pointer = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          dragged: false,
          card,
          wasProtagonist: Boolean(
            card && card.classList.contains("lf--attiva") && isLocked(card)
          ),
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
      } else if (event.type === "pointerup" && pointer.card) {
        pendingClick = {
          card: pointer.card,
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
        if (desktopFine.matches) return;

        const link = event.target.closest(".lf-link[href]");
        if (!link || !track.contains(link)) return;

        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
          return;
        }

        const card = link.closest(".lf");
        /* Lo stato viene letto prima di qualsiasi scorrimento avviato da questo
           evento: una cella laterale non può diventare attiva e aprirsi nello
           stesso tap. */
        const pointerSnapshot = pendingClick?.card === card ? pendingClick : null;
        pendingClick = null;
        const wasProtagonist = pointerSnapshot
          ? pointerSnapshot.wasProtagonist
          : card.classList.contains("lf--attiva") && isLocked(card);
        if (wasProtagonist) return;

        event.preventDefault();
        event.stopPropagation();
        setActive(card);
        bringForward(card, reducedMotion.matches ? "auto" : "smooth");
        queueMeasure();
      },
      true
    );

    const syncMode = () => {
      if (desktopFine.matches) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      queueMeasure();
    };

    desktopFine.addEventListener("change", syncMode);
    reducedMotion.addEventListener("change", queueMeasure);
    syncMode();
  });
})();
