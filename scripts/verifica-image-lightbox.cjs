"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const lightbox = require("../src/js/image-lightbox.js");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

// Geometria contain: conserva il rapporto, centra e non ingrandisce oltre
// la dimensione naturale quando l'area disponibile è più grande.
assert.deepEqual(
  lightbox.containRect({ left: 10, top: 20, width: 800, height: 600 }, 1600, 900, false),
  { left: 10, top: 95, width: 800, height: 450 }
);
assert.deepEqual(
  lightbox.containRect({ left: 0, top: 0, width: 1000, height: 800 }, 400, 300, false),
  { left: 300, top: 250, width: 400, height: 300 }
);

// Limiti del pan: assi più piccoli della viewport restano centrati; gli altri
// non possono uscire oltre metà dell'eccedenza scalata.
assert.deepEqual(
  lightbox.clampTransform(2, 999, -999, 500, 200, 600, 500),
  { scale: 2, x: 200, y: 0 }
);
assert.deepEqual(
  lightbox.clampTransform(1, 80, 90, 500, 400, 300, 200),
  { scale: 1, x: 0, y: 0 }
);

// Il calcolo focale conserva il punto sotto le dita anche quando il punto medio
// del pinch cambia posizione insieme alla distanza.
const start = { scale: 1.5, x: 18, y: -12 };
const p0 = { x: 220, y: 310 };
const p1 = { x: 245, y: 295 };
const center = { x: 200, y: 250 };
const next = lightbox.focalTransform(start, 2.4, p0, p1, center);
const localX = (p0.x - center.x - start.x) / start.scale;
const localY = (p0.y - center.y - start.y) / start.scale;
assert.ok(Math.abs(center.x + next.x + next.scale * localX - p1.x) < 1e-9);
assert.ok(Math.abs(center.y + next.y + next.scale * localY - p1.y) < 1e-9);

assert.equal(lightbox.canOpen("closed"), true);
assert.equal(lightbox.canOpen("opening"), false);
assert.equal(lightbox.canClose("opening"), true);
assert.equal(lightbox.canClose("open"), true);
assert.equal(lightbox.canClose("closing"), false);
assert.equal(lightbox.transformAtRest({ scale: 1, x: 0, y: 0 }), true);
assert.equal(lightbox.transformAtRest({ scale: 1.001, x: 0.01, y: -0.01 }), true);
assert.equal(lightbox.transformAtRest({ scale: 1.01, x: 0, y: 0 }), false);
assert.equal(lightbox.transformAtRest({ scale: 1, x: 2, y: 0 }), false);

// La cella mobile segue il rapporto naturale finché c'è spazio; nei rapporti
// molto verticali mantiene invece invariata la fascia esterna disponibile.
assert.deepEqual(
  lightbox.mobileGeometry(390, 700, 96, 1600, 900),
  { width: 390, imageWidth: 390, imageHeight: 219.375, captionHeight: 96, totalHeight: 315.375, constrained: false }
);
assert.deepEqual(
  lightbox.mobileGeometry(390, 700, 120, 600, 1600),
  { width: 390, imageWidth: 217.5, imageHeight: 580, captionHeight: 120, totalHeight: 700, constrained: true }
);
assert.equal(lightbox.ZOOM_EPSILON, 0.01);
assert.equal(
  lightbox.MOBILE_QUERY,
  "(max-width: 899px), (max-width: 959px) and (max-height: 499px) and (pointer: coarse)"
);
assert.equal(lightbox.doubleTapTargetScale(1), 2);
assert.equal(lightbox.doubleTapTargetScale(1.005), 2);
assert.equal(lightbox.doubleTapTargetScale(1.3), 1);
assert.equal(lightbox.doubleTapTargetScale(2.7), 1);
assert.equal(lightbox.doubleTapTargetScale(4), 1);

let pulses = 0;
const navigatorMock = { vibrate(ms) { pulses += 1; assert.equal(ms, 12); return true; } };
assert.equal(lightbox.pulseHaptic(navigatorMock, false), false);
assert.equal(pulses, 0);
assert.equal(lightbox.pulseHaptic(navigatorMock, true), true);
assert.equal(pulses, 1);
const touchNavigatorMock = {
  maxTouchPoints: 2,
  vibrate(ms) { pulses += 1; assert.equal(ms, 12); return true; },
};
assert.equal(lightbox.shouldUseHaptics(touchNavigatorMock, false), true);
assert.equal(lightbox.pulseHaptic(touchNavigatorMock, false), true);
assert.equal(pulses, 2);
assert.equal(lightbox.shouldUseHaptics({ maxTouchPoints: 0 }, false), false);
assert.equal(lightbox.pulseHaptic({ vibrate() { throw new Error("negato"); } }, true), false);

const fase = read("src/_includes/layouts/scheda-fase.njk");
const profondita = read("src/_includes/layouts/scheda-profondita.njk");
const analisi = read("src/_includes/layouts/analisi.njk");
const scheda = read("src/_includes/layouts/scheda.njk");
const base = read("src/_includes/layouts/base.njk");
const media = read("src/_includes/partials/media.njk");
const css = read("src/css/image-lightbox.css");

assert.match(fase, /class="fasefig" data-image-lightbox-scope/);
assert.match(profondita, /class="fasefig" data-image-lightbox-scope/);
assert.doesNotMatch(analisi, /data-image-lightbox-scope/);
assert.doesNotMatch(scheda, /data-image-lightbox-scope/);
assert.match(base, /<script src="\/js\/image-lightbox\.js" defer><\/script>/);
assert.match(base, /usesImageLightbox/);
assert.match(media, /responsiveImage\("lightboxInline", \{ alt:.*full: true \}\)/);
assert.match(css, /\.image-lightbox-overlay/);
assert.match(css, /touch-action:none/);
assert.match(css, /\.image-lightbox-caption:focus-visible/);
assert.match(css, /@media\(max-width:899px\)/);
assert.match(css, /--image-lightbox-mobile-height/);
assert.match(css, /\.image-lightbox-overlay\.is-zoomed \.image-lightbox-image\{z-index:8\}/);
assert.match(css, /\.image-lightbox-overlay\.is-zoomed \.image-lightbox-close\{/);
assert.match(css, /opacity:0;pointer-events:none/);
assert.match(css, /@supports not \(\(backdrop-filter:blur\(2px\)\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
const controller = read("src/js/image-lightbox.js");
assert.match(controller, /event\.type === "pointerup"/);
assert.match(controller, /event\.pointerType === "mouse" && event\.button !== 0/);
assert.match(controller, /clone\.addEventListener\("transitionend"/);
assert.match(controller, /animateClone\(sourceRect, renderedImageRect\(\), duration, "14px", "4px"\)/);
assert.match(controller, /animateClone\(from, to, duration, "4px", "14px"\)/);
assert.match(controller, /applyMobileGeometry\(\)/);
assert.match(controller, /overlay\.classList\.add\("is-zoomed"\)/);
assert.match(controller, /transform\.scale > MIN_SCALE \+ ZOOM_EPSILON/);
assert.match(controller, /getAttribute\("data-full-src"\)/);
assert.match(controller, /requestFullImage\(activeSourceImage, token\)/);
assert.match(controller, /data-image-lightbox-full-error/);

console.log("[verify:image-lightbox] OK — geometria, stati, aptica e ambito F/P verificati.");
