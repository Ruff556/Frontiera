/* =====================================================================
   Lightbox delle immagini principali delle Linee F e P.
   Miglioramento progressivo: il controllo nasce solo dopo l'inizializzazione,
   mentre il portale, lo scroll lock e i gesti restano indipendenti dall'infobox.
   ===================================================================== */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) api.autoInit(root);
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var SELECTOR = "[data-image-lightbox-scope] figure.media:not(.ph) .frame";
  var MOBILE_QUERY = "(max-width: 899px), (max-width: 959px) and (max-height: 499px) and (pointer: coarse)";
  var OPEN_MS = 390;
  var CLOSE_MS = 220;
  var REDUCED_MS = 80;
  var HAPTIC_MS = 12;
  var MIN_SCALE = 1;
  var DOUBLE_TAP_SCALE = 2;
  var MAX_SCALE = 4;
  var ZOOM_EPSILON = 0.01;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function canOpen(state) {
    return state === "closed";
  }

  function canClose(state) {
    return state === "opening" || state === "open";
  }

  function shouldUseHaptics(navigatorObject, coarse) {
    return !!(coarse || (navigatorObject && Number(navigatorObject.maxTouchPoints) > 0));
  }

  function pulseHaptic(navigatorObject, coarse) {
    if (!shouldUseHaptics(navigatorObject, coarse) ||
        !navigatorObject || typeof navigatorObject.vibrate !== "function") return false;
    try {
      return navigatorObject.vibrate(HAPTIC_MS) === true;
    } catch (error) {
      return false;
    }
  }

  function containRect(container, naturalWidth, naturalHeight, allowUpscale) {
    var width = Math.max(0, Number(container.width) || 0);
    var height = Math.max(0, Number(container.height) || 0);
    var nw = Math.max(1, Number(naturalWidth) || width || 1);
    var nh = Math.max(1, Number(naturalHeight) || height || 1);
    var ratio = Math.min(width / nw, height / nh);
    if (!allowUpscale) ratio = Math.min(1, ratio);
    if (!isFinite(ratio) || ratio <= 0) ratio = 1;
    var renderedWidth = nw * ratio;
    var renderedHeight = nh * ratio;
    return {
      left: container.left + (width - renderedWidth) / 2,
      top: container.top + (height - renderedHeight) / 2,
      width: renderedWidth,
      height: renderedHeight,
    };
  }

  function clampTransform(scale, x, y, baseWidth, baseHeight, viewportWidth, viewportHeight) {
    var nextScale = clamp(Number(scale) || MIN_SCALE, MIN_SCALE, MAX_SCALE);
    if (nextScale <= MIN_SCALE + 0.001) return { scale: MIN_SCALE, x: 0, y: 0 };
    var maxX = Math.max(0, ((Number(baseWidth) || 0) * nextScale - (Number(viewportWidth) || 0)) / 2);
    var maxY = Math.max(0, ((Number(baseHeight) || 0) * nextScale - (Number(viewportHeight) || 0)) / 2);
    return {
      scale: nextScale,
      x: maxX ? clamp(Number(x) || 0, -maxX, maxX) : 0,
      y: maxY ? clamp(Number(y) || 0, -maxY, maxY) : 0,
    };
  }

  // Mantiene fermo il punto focale mentre scala e punto medio cambiano insieme.
  function focalTransform(start, nextScale, startPoint, nextPoint, center) {
    var ratio = nextScale / Math.max(MIN_SCALE, start.scale);
    return {
      scale: nextScale,
      x: nextPoint.x - center.x - ratio * (startPoint.x - center.x - start.x),
      y: nextPoint.y - center.y - ratio * (startPoint.y - center.y - start.y),
    };
  }

  function transformAtRest(value) {
    return !!value && Math.abs(value.scale - MIN_SCALE) <= 0.001 &&
      Math.abs(value.x) <= 0.01 && Math.abs(value.y) <= 0.01;
  }

  function doubleTapTargetScale(currentScale) {
    return Number(currentScale) > MIN_SCALE + ZOOM_EPSILON ? MIN_SCALE : DOUBLE_TAP_SCALE;
  }

  function mobileGeometry(areaWidth, availableHeight, captionHeight, naturalWidth, naturalHeight) {
    var width = Math.max(1, Number(areaWidth) || 1);
    var available = Math.max(1, Number(availableHeight) || 1);
    var caption = clamp(Number(captionHeight) || 0, 0, available - 1);
    var nw = Math.max(1, Number(naturalWidth) || width);
    var nh = Math.max(1, Number(naturalHeight) || nw * 0.75);
    var idealImageHeight = width * nh / nw;
    var imageHeight = Math.max(1, Math.min(idealImageHeight, available - caption));
    var imageWidth = Math.min(width, imageHeight * nw / nh);
    return {
      width: width,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
      captionHeight: caption,
      totalHeight: imageHeight + caption,
      constrained: imageHeight < idealImageHeight - 0.5,
    };
  }

  function conciseLabel(img, caption) {
    var text = ((img && img.getAttribute("alt")) || (caption && caption.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 120) text = text.slice(0, 117).replace(/\s+\S*$/, "") + "…";
    return text ? "Apri immagine ingrandita: " + text : "Apri immagine ingrandita";
  }

  function createController(win) {
    var doc = win.document;
    var frames = Array.prototype.slice.call(doc.querySelectorAll(SELECTOR)).filter(function (frame) {
      return !!frame.querySelector("img");
    });
    if (!frames.length) return null;

    var reducedMQ = win.matchMedia("(prefers-reduced-motion: reduce)");
    var coarseMQ = win.matchMedia("(pointer: coarse)");
    var mobileMQ = win.matchMedia(MOBILE_QUERY);
    var state = "closed";
    var activeFrame = null;
    var activeSourceImage = null;
    var sourceRect = null;
    var openedViewport = null;
    var overlay = null;
    var dialog = null;
    var figure = null;
    var stage = null;
    var image = null;
    var caption = null;
    var closeButton = null;
    var animationClone = null;
    var fullImageLoader = null;
    var activeAnimation = null;
    var transitionTimer = null;
    var transitionWaitCancel = null;
    var settleTimer = null;
    var transitionId = 0;
    var lockedY = 0;
    var bodyStyles = null;
    var inertRecords = [];
    var destroyed = false;
    var backdropPointer = null;
    var resizeFrame = 0;
    var transformFrame = 0;
    var transform = { scale: MIN_SCALE, x: 0, y: 0 };
    var pointers = new Map();
    var panStart = null;
    var pinchStart = null;
    var tapCandidate = null;
    var lastTap = null;
    var gestureHadMulti = false;

    function buildUI() {
      overlay = doc.createElement("div");
      overlay.className = "image-lightbox-overlay";
      overlay.hidden = true;

      dialog = doc.createElement("section");
      dialog.className = "image-lightbox-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "frontiera-image-lightbox-title");
      dialog.tabIndex = -1;

      var title = doc.createElement("h2");
      title.id = "frontiera-image-lightbox-title";
      title.className = "image-lightbox-a11y-title";
      title.textContent = "Immagine ingrandita";

      figure = doc.createElement("figure");
      figure.className = "image-lightbox-figure";

      stage = doc.createElement("div");
      stage.className = "image-lightbox-stage";

      image = doc.createElement("img");
      image.className = "image-lightbox-image";
      image.alt = "";
      image.draggable = false;
      image.decoding = "async";

      caption = doc.createElement("figcaption");
      caption.className = "image-lightbox-caption";

      closeButton = doc.createElement("button");
      closeButton.type = "button";
      closeButton.className = "image-lightbox-close";
      closeButton.setAttribute("aria-label", "Chiudi immagine e torna all’articolo");
      closeButton.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="m7 7 10 10M17 7 7 17"/></svg>';

      stage.appendChild(image);
      figure.appendChild(stage);
      figure.appendChild(caption);
      dialog.appendChild(title);
      dialog.appendChild(figure);
      dialog.appendChild(closeButton);
      overlay.appendChild(dialog);
      doc.body.appendChild(overlay);

      closeButton.addEventListener("click", function () { close(true); });
      overlay.addEventListener("pointerdown", onBackdropPointerDown);
      overlay.addEventListener("pointerup", onBackdropPointerUp);
      overlay.addEventListener("pointercancel", clearBackdropPointer);
      overlay.addEventListener("keydown", onDialogKeydown);
      stage.addEventListener("pointerdown", onImagePointerDown);
      stage.addEventListener("pointermove", onImagePointerMove);
      stage.addEventListener("pointerup", onImagePointerEnd);
      stage.addEventListener("pointercancel", onImagePointerEnd);
      stage.addEventListener("lostpointercapture", onImagePointerEnd);
      image.addEventListener("dragstart", preventDefault);
      win.addEventListener("resize", onViewportChange, { passive: true });
      if (win.visualViewport) win.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
    }

    function enhanceFrames() {
      frames.forEach(function (frame) {
        var sourceImage = frame.querySelector("img");
        var sourceCaption = frame.closest("figure").querySelector("figcaption");
        frame.setAttribute("data-image-lightbox-trigger", "");
        frame.setAttribute("role", "button");
        frame.setAttribute("tabindex", "0");
        frame.setAttribute("aria-haspopup", "dialog");
        frame.setAttribute("aria-label", conciseLabel(sourceImage, sourceCaption));
        frame.addEventListener("click", onTriggerClick);
        frame.addEventListener("keydown", onTriggerKeydown);
      });
    }

    function restoreFrames() {
      frames.forEach(function (frame) {
        frame.removeEventListener("click", onTriggerClick);
        frame.removeEventListener("keydown", onTriggerKeydown);
        frame.removeAttribute("data-image-lightbox-trigger");
        frame.removeAttribute("role");
        frame.removeAttribute("tabindex");
        frame.removeAttribute("aria-haspopup");
        frame.removeAttribute("aria-label");
      });
    }

    function preventDefault(event) {
      event.preventDefault();
    }

    function onTriggerClick(event) {
      open(event.currentTarget, true);
    }

    function onTriggerKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open(event.currentTarget, true);
    }

    function populate(frame) {
      var sourceImage = frame.querySelector("img");
      var sourceCaption = frame.closest("figure").querySelector("figcaption");
      image.src = sourceImage.currentSrc || sourceImage.src;
      image.alt = sourceImage.getAttribute("alt") || "";
      caption.replaceChildren();
      if (sourceCaption) {
        Array.prototype.forEach.call(sourceCaption.childNodes, function (node) {
          caption.appendChild(node.cloneNode(true));
        });
      }
      caption.hidden = !caption.childNodes.length;
      caption.removeAttribute("tabindex");
      return sourceImage;
    }

    function cancelFullImageLoad() {
      if (!fullImageLoader) return;
      fullImageLoader.onload = null;
      fullImageLoader.onerror = null;
      fullImageLoader.src = "";
      fullImageLoader = null;
    }

    function requestFullImage(sourceImage, token) {
      var fullSrc = sourceImage && sourceImage.getAttribute("data-full-src");
      if (!fullSrc || typeof win.Image !== "function") return;
      cancelFullImageLoad();
      var loader = new win.Image();
      fullImageLoader = loader;
      loader.decoding = "async";
      loader.onload = function () {
        if (loader !== fullImageLoader || token !== transitionId ||
            (state !== "opening" && state !== "open")) return;
        fullImageLoader = null;
        activeFrame.removeAttribute("data-image-lightbox-full-error");
        image.src = fullSrc;
        var decoded = typeof image.decode === "function" ? image.decode().catch(function () {}) : Promise.resolve();
        decoded.then(function () {
          if (token !== transitionId || (state !== "opening" && state !== "open")) return;
          applyMobileGeometry();
          updateCaptionAccessibility();
        });
      };
      loader.onerror = function () {
        if (loader !== fullImageLoader) return;
        fullImageLoader = null;
        if (activeFrame && activeFrame.isConnected) {
          activeFrame.setAttribute("data-image-lightbox-full-error", "");
        }
        // La derivata responsive già visibile resta il fallback funzionante.
      };
      // L'originale ad alta risoluzione entra in rete soltanto dopo il gesto
      // esplicito di apertura; l'attributo data-full-src non lo precarica.
      loader.src = fullSrc;
    }

    function updateCaptionAccessibility() {
      if (!caption || caption.hidden) return;
      if (caption.scrollHeight > caption.clientHeight + 1) caption.tabIndex = 0;
      else caption.removeAttribute("tabindex");
    }

    function naturalImageSize() {
      return {
        width: image.naturalWidth || (activeSourceImage && activeSourceImage.naturalWidth) || sourceRect.width || 1,
        height: image.naturalHeight || (activeSourceImage && activeSourceImage.naturalHeight) || sourceRect.height || 1,
      };
    }

    function clearMobileGeometry() {
      dialog.style.removeProperty("--image-lightbox-mobile-height");
      dialog.style.removeProperty("--image-lightbox-natural-ratio");
      dialog.style.removeProperty("--image-lightbox-mobile-close-inset");
    }

    function applyMobileGeometry() {
      if (!mobileMQ.matches) {
        clearMobileGeometry();
        return null;
      }

      var natural = naturalImageSize();
      dialog.style.setProperty("--image-lightbox-natural-ratio", natural.width + " / " + natural.height);

      // Una prima altezza ideale rende misurabile la didascalia senza mostrare
      // all'utente il vecchio pannello quasi fullscreen.
      var preliminaryWidth = Math.max(1, dialog.clientWidth || stage.clientWidth || win.innerWidth);
      dialog.style.setProperty(
        "--image-lightbox-mobile-height",
        (preliminaryWidth * natural.height / natural.width) + "px"
      );

      var overlayStyle = win.getComputedStyle(overlay);
      var paddingTop = parseFloat(overlayStyle.paddingTop) || 0;
      var paddingBottom = parseFloat(overlayStyle.paddingBottom) || 0;
      var layoutHeight = overlay.clientHeight || win.innerHeight;
      var visualHeight = win.visualViewport && win.visualViewport.height
        ? win.visualViewport.height
        : layoutHeight;
      var availableHeight = Math.max(1, Math.min(layoutHeight, visualHeight) - paddingTop - paddingBottom - 2);
      var areaWidth = Math.max(1, stage.clientWidth || dialog.clientWidth || preliminaryWidth);
      var captionHeight = caption.hidden ? 0 : caption.getBoundingClientRect().height;
      var geometry = mobileGeometry(
        areaWidth,
        availableHeight,
        captionHeight,
        natural.width,
        natural.height
      );
      dialog.style.setProperty("--image-lightbox-mobile-height", geometry.imageHeight + "px");
      dialog.style.setProperty(
        "--image-lightbox-mobile-close-inset",
        ((geometry.width - geometry.imageWidth) / 2 + 8.8) + "px"
      );
      return geometry;
    }

    function setBackgroundInert(enabled) {
      if (enabled) {
        inertRecords = [];
        Array.prototype.forEach.call(doc.body.children, function (element) {
          if (element === overlay || element === animationClone) return;
          var record = {
            element: element,
            inert: element.inert,
            ariaHidden: element.getAttribute("aria-hidden"),
            focusables: [],
          };
          if ("inert" in element) {
            element.inert = true;
          } else {
            element.setAttribute("aria-hidden", "true");
            var focusables = element.querySelectorAll("a[href],button,input,select,textarea,[tabindex]");
            Array.prototype.forEach.call(focusables, function (focusable) {
              record.focusables.push({ element: focusable, tabindex: focusable.getAttribute("tabindex") });
              focusable.setAttribute("tabindex", "-1");
            });
          }
          inertRecords.push(record);
        });
        return;
      }
      inertRecords.forEach(function (record) {
        if ("inert" in record.element) record.element.inert = record.inert;
        if (record.ariaHidden === null) record.element.removeAttribute("aria-hidden");
        else record.element.setAttribute("aria-hidden", record.ariaHidden);
        record.focusables.forEach(function (saved) {
          if (saved.tabindex === null) saved.element.removeAttribute("tabindex");
          else saved.element.setAttribute("tabindex", saved.tabindex);
        });
      });
      inertRecords = [];
    }

    function lockPage() {
      lockedY = win.scrollY || win.pageYOffset || 0;
      var style = doc.body.style;
      var viewportWidth = win.innerWidth;
      var clientWidth = doc.documentElement.clientWidth;
      var unlockedBodyWidth = doc.body.getBoundingClientRect().width;
      var computedPaddingRight = parseFloat(win.getComputedStyle(doc.body).paddingRight) || 0;
      bodyStyles = {
        position: style.position,
        top: style.top,
        left: style.left,
        right: style.right,
        width: style.width,
        overflow: style.overflow,
        paddingRight: style.paddingRight,
        overflowAnchor: doc.documentElement.style.overflowAnchor,
        scrollBehavior: doc.documentElement.style.scrollBehavior,
      };
      doc.documentElement.style.overflowAnchor = "none";
      doc.documentElement.style.scrollBehavior = "auto";
      style.position = "fixed";
      style.top = -lockedY + "px";
      style.left = "0";
      style.right = "0";
      style.width = "100%";
      style.overflow = "hidden";
      var lockedBodyWidth = doc.body.getBoundingClientRect().width;
      var scrollbarWidth = Math.max(0, viewportWidth - clientWidth);
      var bodyExpansion = Math.max(0, lockedBodyWidth - unlockedBodyWidth);
      var compensation = Math.min(scrollbarWidth, bodyExpansion);
      if (compensation > 0) style.paddingRight = computedPaddingRight + compensation + "px";
      doc.documentElement.classList.add("image-lightbox-open");
    }

    function unlockPage() {
      if (!bodyStyles) return;
      var restoreY = lockedY;
      var style = doc.body.style;
      style.position = bodyStyles.position;
      style.top = bodyStyles.top;
      style.left = bodyStyles.left;
      style.right = bodyStyles.right;
      style.width = bodyStyles.width;
      style.overflow = bodyStyles.overflow;
      style.paddingRight = bodyStyles.paddingRight;
      var overflowAnchor = bodyStyles.overflowAnchor;
      var scrollBehavior = bodyStyles.scrollBehavior;
      bodyStyles = null;
      doc.documentElement.classList.remove("image-lightbox-open");
      win.scrollTo(0, restoreY);
      win.requestAnimationFrame(function () {
        win.scrollTo(0, restoreY);
        win.requestAnimationFrame(function () {
          win.scrollTo(0, restoreY);
          doc.documentElement.style.overflowAnchor = overflowAnchor;
          doc.documentElement.style.scrollBehavior = scrollBehavior;
        });
      });
    }

    function nextFrame() {
      return new Promise(function (resolve) {
        win.requestAnimationFrame(function () { win.requestAnimationFrame(resolve); });
      });
    }

    function cancelTransitionWait() {
      if (transitionWaitCancel) {
        var cancel = transitionWaitCancel;
        transitionWaitCancel = null;
        cancel();
      } else if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
      }
    }

    function delay(ms, token) {
      cancelTransitionWait();
      return new Promise(function (resolve) {
        var settled = false;
        function finish(result) {
          if (settled) return;
          settled = true;
          if (transitionTimer) clearTimeout(transitionTimer);
          transitionTimer = null;
          transitionWaitCancel = null;
          resolve(result);
        }
        transitionWaitCancel = function () { finish(false); };
        transitionTimer = win.setTimeout(function () { finish(token === transitionId); }, ms);
      });
    }

    function removeAnimationClone() {
      if (activeAnimation) {
        try { activeAnimation.cancel(); } catch (error) {}
      }
      activeAnimation = null;
      if (animationClone) animationClone.remove();
      animationClone = null;
    }

    function cssCloneTransition(clone, to, duration, token, endRadius) {
      cancelTransitionWait();
      return new Promise(function (resolve) {
        var settled = false;
        function finish(result) {
          if (settled) return;
          settled = true;
          clone.removeEventListener("transitionend", onTransitionEnd);
          if (transitionTimer) clearTimeout(transitionTimer);
          transitionTimer = null;
          transitionWaitCancel = null;
          resolve(result);
        }
        function onTransitionEnd(event) {
          if (event.target === clone && event.propertyName === "width") finish(token === transitionId);
        }
        transitionWaitCancel = function () { finish(false); };
        clone.addEventListener("transitionend", onTransitionEnd);
        clone.style.transition =
          "left " + duration + "ms cubic-bezier(.22,.78,.24,1)," +
          "top " + duration + "ms cubic-bezier(.22,.78,.24,1)," +
          "width " + duration + "ms cubic-bezier(.22,.78,.24,1)," +
          "height " + duration + "ms cubic-bezier(.22,.78,.24,1)," +
          "border-radius " + duration + "ms cubic-bezier(.22,.78,.24,1)";
        clone.getBoundingClientRect();
        win.requestAnimationFrame(function () {
          clone.style.left = to.left + "px";
          clone.style.top = to.top + "px";
          clone.style.width = to.width + "px";
          clone.style.height = to.height + "px";
          clone.style.borderRadius = endRadius;
        });
        transitionTimer = win.setTimeout(function () { finish(token === transitionId); }, duration + 100);
      });
    }

    function baseMobileImageRect() {
      var stageRect = stage.getBoundingClientRect();
      var natural = naturalImageSize();
      return containRect(stageRect, natural.width, natural.height, true);
    }

    function renderedImageRect() {
      if (mobileMQ.matches) return baseMobileImageRect();
      var rect = image.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) return rect;
      var stageRect = stage.getBoundingClientRect();
      return containRect(
        stageRect,
        image.naturalWidth || activeSourceImage.naturalWidth || sourceRect.width,
        image.naturalHeight || activeSourceImage.naturalHeight || sourceRect.height,
        false
      );
    }

    function animateClone(from, to, duration, startRadius, endRadius) {
      removeAnimationClone();
      animationClone = doc.createElement("img");
      animationClone.className = "image-lightbox-flight";
      animationClone.alt = "";
      animationClone.setAttribute("aria-hidden", "true");
      animationClone.src = activeSourceImage.currentSrc || activeSourceImage.src;
      animationClone.style.left = from.left + "px";
      animationClone.style.top = from.top + "px";
      animationClone.style.width = from.width + "px";
      animationClone.style.height = from.height + "px";
      animationClone.style.borderRadius = startRadius;
      doc.body.appendChild(animationClone);
      if (typeof animationClone.animate !== "function") {
        return cssCloneTransition(animationClone, to, duration, transitionId, endRadius);
      }
      activeAnimation = animationClone.animate([
        {
          left: from.left + "px", top: from.top + "px",
          width: from.width + "px", height: from.height + "px",
          borderRadius: startRadius, opacity: 1,
        },
        {
          left: to.left + "px", top: to.top + "px",
          width: to.width + "px", height: to.height + "px",
          borderRadius: endRadius, opacity: 1,
        },
      ], {
        duration: duration,
        easing: "cubic-bezier(.22,.78,.24,1)",
        fill: "forwards",
      });
      var animation = activeAnimation;
      return Promise.race([
        animation.finished.then(function () { return true; }).catch(function () { return false; }),
        delay(duration + 80, transitionId),
      ]);
    }

    async function open(frame, userInitiated) {
      if (!canOpen(state) || destroyed) return;
      state = "opening";
      var token = ++transitionId;
      activeFrame = frame;
      activeSourceImage = populate(frame);
      requestFullImage(activeSourceImage, token);
      sourceRect = frame.getBoundingClientRect();
      openedViewport = { width: win.innerWidth, height: win.innerHeight };
      resetGestureState();
      if (userInitiated) pulseHaptic(win.navigator, coarseMQ.matches);

      lockPage();
      setBackgroundInert(true);
      overlay.hidden = false;
      overlay.classList.remove("is-closing");
      applyMobileGeometry();
      overlay.classList.add("is-visible", "is-transitioning");
      overlay.getBoundingClientRect();
      overlay.classList.add("is-open");
      try { closeButton.focus({ preventScroll: true }); } catch (error) { dialog.focus(); }

      // La risorsa è la stessa già caricata dalla miniatura: decode è solo un
      // affinamento e non può bloccare l'apertura in caso di errore.
      if (typeof image.decode === "function") image.decode().catch(function () {});
      await nextFrame();
      if (token !== transitionId || state !== "opening") return;
      applyMobileGeometry();
      updateCaptionAccessibility();

      var duration = reducedMQ.matches ? REDUCED_MS : OPEN_MS;
      if (reducedMQ.matches) {
        await delay(duration, token);
      } else {
        image.style.opacity = "0";
        await animateClone(sourceRect, renderedImageRect(), duration, "14px", "4px");
      }
      if (token !== transitionId || state !== "opening") return;
      removeAnimationClone();
      image.style.opacity = "";
      overlay.classList.remove("is-transitioning");
      state = "open";
    }

    function viewportStillMatches() {
      if (!activeFrame || !activeFrame.isConnected || !openedViewport) return false;
      var widthChange = Math.abs(win.innerWidth - openedViewport.width) / Math.max(1, openedViewport.width);
      var heightChange = Math.abs(win.innerHeight - openedViewport.height) / Math.max(1, openedViewport.height);
      return widthChange < 0.18 && heightChange < 0.22;
    }

    async function close(userInitiated) {
      if (!canClose(state)) return;
      state = "closing";
      var token = ++transitionId;
      cancelTransitionWait();
      removeAnimationClone();
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (userInitiated) pulseHaptic(win.navigator, coarseMQ.matches);
      clearBackdropPointer();
      clearPointers();

      var duration = reducedMQ.matches ? REDUCED_MS : CLOSE_MS;
      // Un'immagine ancora ingrandita o traslata non coincide più con la
      // geometria contain della cella: in quel caso la dissolvenza breve evita
      // un salto di contenuto prima del reset a 1×.
      var canReturn = !reducedMQ.matches && viewportStillMatches() && transformAtRest(transform);
      var from = canReturn ? renderedImageRect() : null;
      var to = canReturn ? activeFrame.getBoundingClientRect() : null;
      if (canReturn && (to.width < 2 || to.height < 2)) canReturn = false;
      if (canReturn) image.style.opacity = "0";
      overlay.classList.add("is-closing", "is-transitioning");
      overlay.classList.remove("is-open", "is-visible");

      if (canReturn) await animateClone(from, to, duration, "4px", "14px");
      else await delay(duration, token);
      if (token !== transitionId || state !== "closing") return;
      finishClose();
    }

    function finishClose() {
      cancelFullImageLoad();
      removeAnimationClone();
      image.style.opacity = "";
      image.style.transform = "";
      image.classList.remove("is-settling");
      overlay.className = "image-lightbox-overlay";
      overlay.hidden = true;
      caption.replaceChildren();
      caption.removeAttribute("tabindex");
      image.removeAttribute("src");
      image.alt = "";
      clearMobileGeometry();
      setBackgroundInert(false);
      unlockPage();
      var returnTarget = activeFrame;
      activeFrame = activeSourceImage = sourceRect = openedViewport = null;
      resetGestureState();
      state = "closed";
      win.requestAnimationFrame(function () {
        if (returnTarget && returnTarget.isConnected) {
          try { returnTarget.focus({ preventScroll: true }); } catch (error) { returnTarget.focus(); }
        }
      });
    }

    function onBackdropPointerDown(event) {
      var primaryAction = event.pointerType !== "mouse" || event.button === 0;
      backdropPointer = event.target === overlay && primaryAction ? event.pointerId : null;
    }

    function onBackdropPointerUp(event) {
      if (event.target === overlay && event.pointerId === backdropPointer) close(true);
      backdropPointer = null;
    }

    function clearBackdropPointer() {
      backdropPointer = null;
    }

    function focusables() {
      var nodes = dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])');
      return Array.prototype.slice.call(nodes).filter(function (node) { return node.getClientRects().length; });
    }

    function onDialogKeydown(event) {
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function stageMetrics() {
      var rect = stage.getBoundingClientRect();
      var baseRect = mobileMQ.matches ? baseMobileImageRect() : null;
      return {
        rect: rect,
        center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        baseWidth: baseRect ? baseRect.width : (image.offsetWidth || renderedImageRect().width),
        baseHeight: baseRect ? baseRect.height : (image.offsetHeight || renderedImageRect().height),
      };
    }

    function bounded(next) {
      var metrics = stageMetrics();
      return clampTransform(
        next.scale, next.x, next.y,
        metrics.baseWidth, metrics.baseHeight, metrics.rect.width, metrics.rect.height
      );
    }

    function scheduleTransform() {
      if (mobileMQ.matches && transform.scale > MIN_SCALE + ZOOM_EPSILON) {
        overlay.classList.add("is-zoomed");
      }
      if (transformFrame) return;
      transformFrame = win.requestAnimationFrame(function () {
        transformFrame = 0;
        image.style.transform = "translate3d(" + transform.x + "px," + transform.y + "px,0) scale(" + transform.scale + ")";
      });
    }

    function settle(next) {
      if (next.scale <= MIN_SCALE + ZOOM_EPSILON) next = { scale: MIN_SCALE, x: 0, y: 0 };
      transform = bounded(next);
      image.classList.add("is-settling");
      scheduleTransform();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = win.setTimeout(function () {
        settleTimer = null;
        image.classList.remove("is-settling");
        if (mobileMQ.matches && transformAtRest(transform)) overlay.classList.remove("is-zoomed");
      }, reducedMQ.matches ? REDUCED_MS : 190);
    }

    function midpoint(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function distance(a, b) {
      return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function startPinch() {
      var values = Array.from(pointers.values());
      if (values.length < 2) return;
      pinchStart = {
        distance: Math.max(1, distance(values[0], values[1])),
        point: midpoint(values[0], values[1]),
        transform: { scale: transform.scale, x: transform.x, y: transform.y },
      };
      panStart = null;
    }

    function onImagePointerDown(event) {
      if (state !== "open") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      try { stage.setPointerCapture(event.pointerId); } catch (error) {}
      if (!pointers.size) {
        gestureHadMulti = false;
        tapCandidate = {
          id: event.pointerId,
          pointerType: event.pointerType,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          moved: false,
        };
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        gestureHadMulti = true;
        tapCandidate = null;
        startPinch();
      } else if (transform.scale > MIN_SCALE) {
        panStart = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
      }
    }

    function onImagePointerMove(event) {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (tapCandidate && tapCandidate.id === event.pointerId &&
          Math.hypot(event.clientX - tapCandidate.x, event.clientY - tapCandidate.y) > 6) {
        tapCandidate.moved = true;
      }
      if (pointers.size >= 2 && pinchStart) {
        var values = Array.from(pointers.values());
        var point = midpoint(values[0], values[1]);
        var scale = clamp(
          pinchStart.transform.scale * distance(values[0], values[1]) / pinchStart.distance,
          MIN_SCALE,
          MAX_SCALE
        );
        var metrics = stageMetrics();
        transform = bounded(focalTransform(pinchStart.transform, scale, pinchStart.point, point, metrics.center));
        scheduleTransform();
      } else if (pointers.size === 1 && panStart && transform.scale > MIN_SCALE) {
        transform = bounded({
          scale: transform.scale,
          x: panStart.tx + event.clientX - panStart.x,
          y: panStart.ty + event.clientY - panStart.y,
        });
        scheduleTransform();
      }
    }

    function onImagePointerEnd(event) {
      if (!pointers.has(event.pointerId)) return;
      var candidate = tapCandidate;
      pointers.delete(event.pointerId);
      try { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); } catch (error) {}
      if (event.type === "pointerup" && !gestureHadMulti && candidate && candidate.id === event.pointerId &&
          candidate.pointerType !== "mouse" && !candidate.moved &&
          event.timeStamp - candidate.time < 280) {
        registerTap(event.clientX, event.clientY, event.timeStamp);
      }
      tapCandidate = null;
      if (pointers.size >= 2) {
        startPinch();
      } else if (pointers.size === 1) {
        var entry = Array.from(pointers.entries())[0];
        panStart = { id: entry[0], x: entry[1].x, y: entry[1].y, tx: transform.x, ty: transform.y };
        pinchStart = null;
      } else {
        panStart = pinchStart = null;
        gestureHadMulti = false;
        settle(transform);
      }
    }

    function registerTap(x, y, time) {
      if (lastTap && time - lastTap.time <= 330 && Math.hypot(x - lastTap.x, y - lastTap.y) <= 32) {
        var metrics = stageMetrics();
        if (doubleTapTargetScale(transform.scale) === MIN_SCALE) {
          settle({ scale: MIN_SCALE, x: 0, y: 0 });
        } else {
          settle(focalTransform(
            { scale: MIN_SCALE, x: 0, y: 0 },
            DOUBLE_TAP_SCALE,
            { x: x, y: y },
            { x: x, y: y },
            metrics.center
          ));
        }
        lastTap = null;
      } else {
        lastTap = { x: x, y: y, time: time };
      }
    }

    function clearPointers() {
      pointers.clear();
      panStart = pinchStart = tapCandidate = lastTap = null;
      gestureHadMulti = false;
    }

    function resetGestureState() {
      clearPointers();
      transform = { scale: MIN_SCALE, x: 0, y: 0 };
      if (image) image.style.transform = "";
      if (overlay) overlay.classList.remove("is-zoomed");
    }

    function onViewportChange() {
      if (state !== "open" && state !== "opening") return;
      if (resizeFrame) return;
      resizeFrame = win.requestAnimationFrame(function () {
        resizeFrame = 0;
        clearPointers();
        applyMobileGeometry();
        updateCaptionAccessibility();
        transform = bounded(transform.scale <= MIN_SCALE + 0.001 ? { scale: MIN_SCALE, x: 0, y: 0 } : transform);
        scheduleTransform();
      });
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      ++transitionId;
      cancelTransitionWait();
      if (settleTimer) clearTimeout(settleTimer);
      if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
      if (transformFrame) win.cancelAnimationFrame(transformFrame);
      cancelFullImageLoad();
      removeAnimationClone();
      if (state !== "closed") {
        setBackgroundInert(false);
        unlockPage();
      }
      restoreFrames();
      win.removeEventListener("resize", onViewportChange);
      if (win.visualViewport) win.visualViewport.removeEventListener("resize", onViewportChange);
      overlay.remove();
      state = "closed";
    }

    buildUI();
    enhanceFrames();

    return {
      destroy: destroy,
      getState: function () { return state; },
      open: open,
      close: close,
      getTransform: function () { return { scale: transform.scale, x: transform.x, y: transform.y }; },
    };
  }

  function autoInit(win) {
    if (win.__frontieraImageLightboxInitialized) return win.__frontieraImageLightboxInitialized;
    function init() {
      if (win.__frontieraImageLightboxInitialized) return;
      win.__frontieraImageLightboxInitialized = createController(win) || true;
    }
    if (win.document.readyState === "loading") win.document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
    return win.__frontieraImageLightboxInitialized;
  }

  return {
    SELECTOR: SELECTOR,
    MOBILE_QUERY: MOBILE_QUERY,
    OPEN_MS: OPEN_MS,
    CLOSE_MS: CLOSE_MS,
    REDUCED_MS: REDUCED_MS,
    HAPTIC_MS: HAPTIC_MS,
    MIN_SCALE: MIN_SCALE,
    MAX_SCALE: MAX_SCALE,
    ZOOM_EPSILON: ZOOM_EPSILON,
    clamp: clamp,
    canOpen: canOpen,
    canClose: canClose,
    pulseHaptic: pulseHaptic,
    containRect: containRect,
    clampTransform: clampTransform,
    focalTransform: focalTransform,
    transformAtRest: transformAtRest,
    doubleTapTargetScale: doubleTapTargetScale,
    mobileGeometry: mobileGeometry,
    shouldUseHaptics: shouldUseHaptics,
    createController: createController,
    autoInit: autoInit,
  };
});
