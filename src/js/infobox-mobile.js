/* =====================================================================
   Richiamo mobile unificato degli infobox.
   Sotto 900px sposta temporaneamente — senza clonarlo — il pannello prodotto
   dal dispatcher in un dialogo liquid glass. Su desktop non crea alcun nodo.
   ===================================================================== */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) api.autoInit(root);
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MOBILE_QUERY = "(max-width: 899px)";
  var HAPTIC_MS = 12;
  var OPEN_MS = 320;
  var CLOSE_MS = 250;

  function pulseHaptic(navigatorObject) {
    if (!navigatorObject || typeof navigatorObject.vibrate !== "function") return false;
    try {
      return navigatorObject.vibrate(HAPTIC_MS) === true;
    } catch (error) {
      return false;
    }
  }

  function canOpen(state) {
    return state === "available";
  }

  function canClose(state) {
    return state === "opening" || state === "open";
  }

  function scrollLockCompensation(viewportWidth, clientWidth, unlockedBodyWidth, lockedBodyWidth) {
    var scrollbarWidth = Math.max(0, viewportWidth - clientWidth);
    var bodyExpansion = Math.max(0, lockedBodyWidth - unlockedBodyWidth);
    return Math.min(scrollbarWidth, bodyExpansion);
  }

  function createController(win) {
    var doc = win.document;
    var hook = doc.querySelector("[data-infobox-mobile-hook]");
    if (!hook) return null;
    var panel = hook.querySelector(".infobox-panel");
    var sentinel = hook.querySelector("[data-infobox-mobile-sentinel]");
    if (!panel || !sentinel) return null;

    var mobileMQ = win.matchMedia(MOBILE_QUERY);
    var reducedMQ = win.matchMedia("(prefers-reduced-motion: reduce)");
    var state = "unavailable";
    var trigger = null;
    var overlay = null;
    var dialog = null;
    var content = null;
    var closeButton = null;
    var observer = null;
    var headerObserver = null;
    var transitionTimer = null;
    var headerBottom = 0;
    var lockedY = 0;
    var bodyStyles = null;
    var inertRecords = [];
    var fallbackScrollBound = false;
    var visualViewportBound = false;
    var destroyed = false;

    function labelText() {
      var title = panel.querySelector(".analisi-info-title, .infobox-panel-title");
      return (title && title.textContent.trim()) || hook.getAttribute("data-infobox-label") || "Infobox";
    }

    function buildUI() {
      if (trigger || !mobileMQ.matches) return;

      trigger = doc.createElement("button");
      trigger.type = "button";
      trigger.className = "infobox-mobile-trigger";
      trigger.setAttribute("aria-label", "Apri infobox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", "frontiera-infobox-mobile-dialog");
      trigger.setAttribute("aria-hidden", "true");
      trigger.tabIndex = -1;
      trigger.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M6.5 4.75h11a1.75 1.75 0 0 1 1.75 1.75v11a1.75 1.75 0 0 1-1.75 1.75h-11a1.75 1.75 0 0 1-1.75-1.75v-11A1.75 1.75 0 0 1 6.5 4.75Z"/>' +
        '<path d="M8.25 9h7.5M8.25 12h7.5M8.25 15h4.5"/></svg>';

      overlay = doc.createElement("div");
      overlay.className = "infobox-mobile-overlay";
      overlay.hidden = true;

      dialog = doc.createElement("section");
      dialog.className = "infobox-mobile-dialog";
      dialog.id = "frontiera-infobox-mobile-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "frontiera-infobox-mobile-title");
      dialog.tabIndex = -1;

      var toolbar = doc.createElement("div");
      toolbar.className = "infobox-mobile-toolbar";
      var title = doc.createElement("div");
      title.className = "infobox-mobile-title";
      title.id = "frontiera-infobox-mobile-title";
      title.textContent = labelText();

      closeButton = doc.createElement("button");
      closeButton.type = "button";
      closeButton.className = "infobox-mobile-close";
      closeButton.setAttribute("aria-label", "Chiudi infobox e torna all’articolo");
      closeButton.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="m7 7 10 10M17 7 7 17"/></svg>';

      content = doc.createElement("div");
      content.className = "infobox-mobile-content";

      toolbar.appendChild(title);
      toolbar.appendChild(closeButton);
      dialog.appendChild(toolbar);
      dialog.appendChild(content);
      overlay.appendChild(dialog);
      doc.body.appendChild(trigger);
      doc.body.appendChild(overlay);

      trigger.addEventListener("click", open);
      closeButton.addEventListener("click", function () { close(true, false); });
      overlay.addEventListener("click", onBackdropClick);
      overlay.addEventListener("keydown", onDialogKeydown);
    }

    function setTriggerVisible(visible) {
      if (!trigger) return;
      var show = visible && state !== "opening" && state !== "open" && state !== "closing";
      trigger.classList.toggle("is-visible", show);
      trigger.setAttribute("aria-hidden", show ? "false" : "true");
      trigger.tabIndex = show ? 0 : -1;
    }

    function measureHeader() {
      var header = doc.querySelector(".nav");
      headerBottom = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 56;
      doc.documentElement.style.setProperty("--infobox-mobile-top", headerBottom + 8 + "px");
    }

    function isPastInfobox() {
      return sentinel.getBoundingClientRect().top <= headerBottom + 1;
    }

    function updateAvailability() {
      if (!mobileMQ.matches || !trigger || state === "opening" || state === "open" || state === "closing") return;
      var available = isPastInfobox();
      state = available ? "available" : "hidden";
      setTriggerVisible(available);
    }

    function setupSentinelObserver() {
      if (observer) observer.disconnect();
      observer = null;
      if (typeof win.IntersectionObserver === "function") {
        observer = new win.IntersectionObserver(updateAvailability, {
          root: null,
          rootMargin: -headerBottom + "px 0px 0px 0px",
          threshold: [0, 1],
        });
        observer.observe(sentinel);
      } else if (!fallbackScrollBound) {
        win.addEventListener("scroll", updateAvailability, { passive: true });
        fallbackScrollBound = true;
      }
    }

    function onHeaderResize() {
      var previous = headerBottom;
      measureHeader();
      if (previous !== headerBottom) setupSentinelObserver();
      updateAvailability();
    }

    function setBackgroundInert(enabled) {
      var targets = doc.querySelectorAll("header.nav, main, footer, .mobilemenu, .scrim");
      if (enabled) {
        inertRecords = [];
        for (var i = 0; i < targets.length; i++) {
          var target = targets[i];
          var record = { element: target, inert: target.inert, ariaHidden: target.getAttribute("aria-hidden"), focusables: [] };
          if ("inert" in target) {
            target.inert = true;
          } else {
            target.setAttribute("aria-hidden", "true");
            var focusables = target.querySelectorAll("a[href],button,input,select,textarea,[tabindex]");
            for (var j = 0; j < focusables.length; j++) {
              record.focusables.push({ element: focusables[j], tabindex: focusables[j].getAttribute("tabindex") });
              focusables[j].setAttribute("tabindex", "-1");
            }
          }
          inertRecords.push(record);
        }
      } else {
        for (var k = 0; k < inertRecords.length; k++) {
          var saved = inertRecords[k];
          if ("inert" in saved.element) saved.element.inert = saved.inert;
          if (saved.ariaHidden === null) saved.element.removeAttribute("aria-hidden");
          else saved.element.setAttribute("aria-hidden", saved.ariaHidden);
          for (var m = 0; m < saved.focusables.length; m++) {
            var focusable = saved.focusables[m];
            if (focusable.tabindex === null) focusable.element.removeAttribute("tabindex");
            else focusable.element.setAttribute("tabindex", focusable.tabindex);
          }
        }
        inertRecords = [];
      }
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
        rootOverflowAnchor: doc.documentElement.style.overflowAnchor,
        rootScrollBehavior: doc.documentElement.style.scrollBehavior,
      };
      doc.documentElement.style.overflowAnchor = "none";
      doc.documentElement.style.scrollBehavior = "auto";
      style.position = "fixed";
      style.top = -lockedY + "px";
      style.left = "0";
      style.right = "0";
      style.width = "100%";
      style.overflow = "hidden";
      // Se il browser o la pagina riservano già un gutter, il body non si
      // allarga e la compensazione resta nulla. Lo stesso accade con le
      // scrollbar overlay: niente doppio gutter né spazio artificiale.
      var lockedBodyWidth = doc.body.getBoundingClientRect().width;
      var compensation = scrollLockCompensation(viewportWidth, clientWidth, unlockedBodyWidth, lockedBodyWidth);
      if (compensation > 0) style.paddingRight = computedPaddingRight + compensation + "px";
      doc.documentElement.classList.add("infobox-mobile-open");
    }

    function unlockPage() {
      if (!bodyStyles) return lockedY;
      var restoreY = lockedY;
      var style = doc.body.style;
      style.position = bodyStyles.position;
      style.top = bodyStyles.top;
      style.left = bodyStyles.left;
      style.right = bodyStyles.right;
      style.width = bodyStyles.width;
      style.overflow = bodyStyles.overflow;
      style.paddingRight = bodyStyles.paddingRight;
      var rootOverflowAnchor = bodyStyles.rootOverflowAnchor;
      var rootScrollBehavior = bodyStyles.rootScrollBehavior;
      bodyStyles = null;
      doc.documentElement.classList.remove("infobox-mobile-open");
      win.scrollTo(0, restoreY);
      // Il ripristino da body fixed può essere applicato prima del nuovo layout
      // su alcuni browser mobili. Un secondo allineamento nel frame successivo
      // evita salti senza introdurre animazioni o cambiare l'ancora di lettura.
      win.requestAnimationFrame(function () {
        win.scrollTo(0, restoreY);
        win.requestAnimationFrame(function () {
          win.scrollTo(0, restoreY);
          doc.documentElement.style.overflowAnchor = rootOverflowAnchor;
          doc.documentElement.style.scrollBehavior = rootScrollBehavior;
        });
      });
      return restoreY;
    }

    function transitionDelay(opening) {
      return reducedMQ.matches ? 20 : opening ? OPEN_MS : CLOSE_MS;
    }

    function focusPanel() {
      try { panel.focus({ preventScroll: true }); }
      catch (error) { dialog.focus(); }
    }

    function open() {
      if (!canOpen(state) || !mobileMQ.matches) return;
      state = "opening";
      pulseHaptic(win.navigator);
      setTriggerVisible(false);
      trigger.setAttribute("aria-expanded", "true");

      var originalHeight = Math.max(hook.getBoundingClientRect().height, panel.getBoundingClientRect().height);
      hook.style.height = Math.ceil(originalHeight) + "px";
      content.appendChild(panel);
      content.scrollTop = 0;
      lockPage();
      setBackgroundInert(true);
      overlay.hidden = false;
      overlay.getBoundingClientRect();
      overlay.classList.add("is-open");
      focusPanel();

      clearTimeout(transitionTimer);
      transitionTimer = win.setTimeout(function () {
        if (state === "opening") state = "open";
      }, transitionDelay(true));
    }

    function finishClose(returnFocus) {
      if (panel.parentNode !== hook) hook.insertBefore(panel, sentinel);
      hook.style.height = "";
      if (content) content.scrollTop = 0;
      setBackgroundInert(false);
      var restoreY = unlockPage();
      overlay.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      state = "hidden";
      setTriggerVisible(false);
      win.requestAnimationFrame(function () {
        win.scrollTo(0, restoreY);
        win.requestAnimationFrame(function () {
          win.scrollTo(0, restoreY);
          updateAvailability();
          if (returnFocus && state === "available") {
            try { trigger.focus(); } catch (error) {}
          }
        });
      });
    }

    function close(userInitiated, immediate) {
      if (!canClose(state)) return;
      state = "closing";
      clearTimeout(transitionTimer);
      if (userInitiated) pulseHaptic(win.navigator);
      overlay.classList.remove("is-open");
      if (immediate) {
        finishClose(false);
        return;
      }
      transitionTimer = win.setTimeout(function () {
        if (state === "closing") finishClose(true);
      }, transitionDelay(false));
    }

    function onBackdropClick(event) {
      if (event.target === overlay) close(true, false);
    }

    function focusableInDialog() {
      var nodes = dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      var visible = [];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].getClientRects().length) visible.push(nodes[i]);
      }
      return visible;
    }

    function onDialogKeydown(event) {
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        close(true, false);
        return;
      }
      if (event.key !== "Tab") return;
      var focusables = focusableInDialog();
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function setupMobile() {
      if (destroyed || trigger || !mobileMQ.matches) return;
      buildUI();
      measureHeader();
      setupSentinelObserver();
      var header = doc.querySelector(".nav");
      if (header && typeof win.ResizeObserver === "function") {
        headerObserver = new win.ResizeObserver(onHeaderResize);
        headerObserver.observe(header);
      }
      win.addEventListener("resize", onHeaderResize, { passive: true });
      if (win.visualViewport) {
        win.visualViewport.addEventListener("resize", onHeaderResize, { passive: true });
        visualViewportBound = true;
      }
      state = "hidden";
      updateAvailability();
    }

    function teardownMobile() {
      if (!trigger) {
        state = "unavailable";
        return;
      }
      clearTimeout(transitionTimer);
      if (state === "opening" || state === "open" || state === "closing") {
        overlay.classList.remove("is-open");
        if (panel.parentNode !== hook) hook.insertBefore(panel, sentinel);
        hook.style.height = "";
        setBackgroundInert(false);
        unlockPage();
      }
      if (observer) observer.disconnect();
      if (headerObserver) headerObserver.disconnect();
      observer = null;
      headerObserver = null;
      if (fallbackScrollBound) {
        win.removeEventListener("scroll", updateAvailability);
        fallbackScrollBound = false;
      }
      win.removeEventListener("resize", onHeaderResize);
      if (visualViewportBound && win.visualViewport) {
        win.visualViewport.removeEventListener("resize", onHeaderResize);
        visualViewportBound = false;
      }
      trigger.remove();
      overlay.remove();
      trigger = overlay = dialog = content = closeButton = null;
      doc.documentElement.style.removeProperty("--infobox-mobile-top");
      state = "unavailable";
    }

    function onBreakpointChange() {
      if (mobileMQ.matches) setupMobile();
      else teardownMobile();
    }

    function destroy() {
      if (destroyed) return;
      teardownMobile();
      if (typeof mobileMQ.removeEventListener === "function") mobileMQ.removeEventListener("change", onBreakpointChange);
      else mobileMQ.removeListener(onBreakpointChange);
      destroyed = true;
    }

    if (typeof mobileMQ.addEventListener === "function") mobileMQ.addEventListener("change", onBreakpointChange);
    else mobileMQ.addListener(onBreakpointChange);
    if (mobileMQ.matches) setupMobile();

    return {
      destroy: destroy,
      getState: function () { return state; },
      update: updateAvailability,
    };
  }

  function autoInit(win) {
    if (win.__frontieraInfoboxMobileInitialized) return win.__frontieraInfoboxMobileInitialized;
    function init() {
      if (win.__frontieraInfoboxMobileInitialized) return;
      win.__frontieraInfoboxMobileInitialized = createController(win) || true;
    }
    if (win.document.readyState === "loading") win.document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
    return win.__frontieraInfoboxMobileInitialized;
  }

  return {
    MOBILE_QUERY: MOBILE_QUERY,
    HAPTIC_MS: HAPTIC_MS,
    pulseHaptic: pulseHaptic,
    canOpen: canOpen,
    canClose: canClose,
    scrollLockCompensation: scrollLockCompensation,
    createController: createController,
    autoInit: autoInit,
  };
});
