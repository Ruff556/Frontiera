/* Carosello home — miglioramento progressivo.
   Senza JS: il primo slide resta visibile (gestito dal CSS). */
(function () {
  var slidesWrap = document.getElementById("slides");
  if (!slidesWrap) return;
  var slides = Array.prototype.slice.call(slidesWrap.querySelectorAll(".slide"));

  var dotsWrap = document.getElementById("dots");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var carbtns = document.querySelector(".carbtns");

  // Con 0 o 1 slide non c'è nulla da ruotare: niente timer, niente indicatori,
  // controlli precedente/successivo nascosti. La home resta funzionante e non
  // vengono lasciati controlli inerti o dot ridondanti.
  if (slides.length < 2) {
    if (carbtns) carbtns.hidden = true;
    if (dotsWrap) dotsWrap.hidden = true;
    return;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileMQ = window.matchMedia("(max-width: 879px)");
  var cur = 0;
  var timer = null;
  var swipe = null;
  var suppressClick = false;
  var suppressClickT = null;

  var dots = slides.map(function (s, i) {
    var b = document.createElement("button");
    b.className = "dot" + (i === 0 ? " on" : "");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "Slide " + (i + 1));
    b.addEventListener("click", function () {
      show(i);
      rest();
    });
    if (dotsWrap) dotsWrap.appendChild(b);
    return b;
  });

  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) {
      s.classList.toggle("show", n === cur);
    });
    dots.forEach(function (d, n) {
      d.classList.toggle("on", n === cur);
    });
  }
  function next() { show(cur + 1); }
  function prev() { show(cur - 1); }
  function start() { if (!reduce) timer = setInterval(next, 6500); }
  function rest() {
    clearInterval(timer);
    timer = null;
    start();
  }

  if (nextBtn) nextBtn.addEventListener("click", function () { next(); rest(); });
  if (prevBtn) prevBtn.addEventListener("click", function () { prev(); rest(); });

  function armClickSuppression() {
    suppressClick = true;
    if (suppressClickT) clearTimeout(suppressClickT);
    suppressClickT = setTimeout(function () {
      suppressClickT = null;
      suppressClick = false;
    }, 700);
  }

  // Il riconoscimento resta confinato a .slides e usa touch-action:pan-y:
  // lo scroll verticale continua quindi a essere gestito nativamente dal browser.
  if (window.PointerEvent) {
    slidesWrap.addEventListener("pointerdown", function (ev) {
      if (!mobileMQ.matches || ev.pointerType !== "touch") return;
      swipe = {
        id: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        vertical: false,
        recognized: false,
      };
    }, { passive: true });

    slidesWrap.addEventListener("pointermove", function (ev) {
      if (!swipe || swipe.id !== ev.pointerId || swipe.recognized || swipe.vertical) return;
      var dx = ev.clientX - swipe.x;
      var dy = ev.clientY - swipe.y;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);
      if (absY >= 24 && absY > absX * 1.15) {
        swipe.vertical = true;
        return;
      }
      if (absX < 45 || absX <= absY * 1.15) return;

      swipe.recognized = true;
      armClickSuppression();
      if (dx < 0) next();
      else prev();
      rest();
    }, { passive: true });

    function endSwipe(ev) {
      if (!swipe || swipe.id !== ev.pointerId) return;
      swipe = null;
    }
    slidesWrap.addEventListener("pointerup", endSwipe, { passive: true });
    slidesWrap.addEventListener("pointercancel", endSwipe, { passive: true });

    // Il click viene soppresso solo dopo un riconoscimento positivo dello swipe;
    // i tap brevi su titolo e immagine restano normali link.
    slidesWrap.addEventListener("click", function (ev) {
      if (!suppressClick) return;
      ev.preventDefault();
      ev.stopPropagation();
      suppressClick = false;
      if (suppressClickT) {
        clearTimeout(suppressClickT);
        suppressClickT = null;
      }
    }, true);
  }

  start();
})();
