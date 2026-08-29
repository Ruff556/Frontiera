/* Esempio minimo: lo stato off esiste solo al caricamento. */
(function () {
  "use strict";
  var kit = window.FrontieraSchemaKit;
  var root = document.querySelector("#schema-esempio");
  if (!kit || !root) return;

  var ctx = kit.createContext(root);
  var controls = root.querySelector("[data-schema-controls]");
  var next = root.querySelector("[data-schema-next]");
  var autoButton = root.querySelector("[data-schema-auto]");
  var count = root.querySelector("[data-schema-count]");
  var live = root.querySelector("[data-schema-live]");

  function render(change) {
    var token = kit.cancel(ctx);
    root.dataset.moment = change.state || "off";
    count.textContent = change.state ? "0" + change.index + "/03" : "00/03";
    if (change.source !== "init") live.textContent = change.state ? "Attivato " + change.state : "Schema pronto";
    /* Usare token con kit.pulse/fade/drawPath per la regia specifica. */
    return token;
  }

  var sequence = kit.createSequence({
    states: ["momento-1", "momento-2", "momento-3"],
    onChange: render
  });
  var autoplay = kit.createAutoplay({
    sequence: sequence,
    delay: 4200,
    canRun: function () { return ctx.inView && kit.pageVisible(); },
    onChange: function (playing) { autoButton.setAttribute("aria-pressed", String(playing)); }
  });

  next.addEventListener("click", function () { sequence.next("manual"); autoplay.refresh(); });
  autoButton.addEventListener("click", function () { autoplay.toggle(); });
  kit.observeLifecycle(ctx, {
    onResume: autoplay.refresh,
    onSuspend: function () { kit.cancel(ctx); autoplay.refresh(); }
  });

  controls.hidden = false;
  render({ state: null, index: -1, source: "init" });
})();
