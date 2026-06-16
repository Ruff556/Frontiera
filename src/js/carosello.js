/* Carosello home — miglioramento progressivo.
   Senza JS: il primo slide resta visibile (gestito dal CSS). */
(function () {
  var slidesWrap = document.getElementById("slides");
  if (!slidesWrap) return;
  var slides = Array.prototype.slice.call(slidesWrap.querySelectorAll(".slide"));
  if (slides.length < 2) return;

  var dotsWrap = document.getElementById("dots");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = 0;
  var timer = null;

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
  function rest() { clearInterval(timer); start(); }

  if (nextBtn) nextBtn.addEventListener("click", function () { next(); rest(); });
  if (prevBtn) prevBtn.addEventListener("click", function () { prev(); rest(); });
  start();
})();
