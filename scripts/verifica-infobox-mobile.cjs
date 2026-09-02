"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mobile = require("../src/js/infobox-mobile.js");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(mobile.MOBILE_QUERY, "(max-width: 899px)");
assert.equal(mobile.HAPTIC_MS, 12);
assert.equal(mobile.canOpen("available"), true);
assert.equal(mobile.canOpen("opening"), false);
assert.equal(mobile.canOpen("open"), false);
assert.equal(mobile.canClose("opening"), true);
assert.equal(mobile.canClose("open"), true);
assert.equal(mobile.canClose("closing"), false);
assert.equal(mobile.scrollLockCompensation(721, 706, 706, 721), 15, "scrollbar classica: compensa l'espansione reale");
assert.equal(mobile.scrollLockCompensation(721, 706, 706, 706), 0, "gutter già stabile: nessuna doppia compensazione");
assert.equal(mobile.scrollLockCompensation(721, 721, 721, 721), 0, "scrollbar overlay: nessuno spazio artificiale");
assert.equal(mobile.scrollLockCompensation(721, 706, 706, 711), 5, "la compensazione non supera l'espansione effettiva");

const pulses = [];
assert.equal(mobile.pulseHaptic({ vibrate: (duration) => (pulses.push(duration), true) }), true);
assert.deepEqual(pulses, [12]);
assert.equal(mobile.pulseHaptic({}), false);
assert.equal(mobile.pulseHaptic({ vibrate: () => false }), false);
assert.doesNotThrow(() => mobile.pulseHaptic({ vibrate: () => { throw new Error("non supportata"); } }));

const dispatcher = read("src/_includes/partials/infobox-dispatcher.njk");
assert.match(dispatcher, /data-infobox-mobile-hook/);
assert.match(dispatcher, /data-infobox-mobile-sentinel/);
assert.match(dispatcher, /infobox-tipo-4\.njk/);
assert.match(read("src/_includes/partials/infobox-tipo-4.njk"), /data-infobox-tipo="4"/);
assert.match(read("src/_includes/partials/infobox-tipo-4.njk"), /class="analisi-info-title infobox-contact-title"/);
assert.equal((dispatcher.match(/data-infobox-mobile-hook/g) || []).length, 1);

const base = read("src/_includes/layouts/base.njk");
assert.match(base, /\/js\/infobox-mobile\.js/);

const source = read("src/js/infobox-mobile.js");
assert.doesNotMatch(source, /cloneNode\s*\(/, "il nodo infobox non deve essere clonato");
assert.match(source, /content\.appendChild\(panel\)/, "apertura: trasferimento del nodo originale");
assert.match(source, /hook\.insertBefore\(panel, sentinel\)/, "chiusura: ripristino davanti al sentinel");
assert.match(source, /hook\.style\.height/, "la posizione originale deve conservare l'altezza");
assert.match(source, /overflowAnchor = "none"/, "il trasferimento deve neutralizzare lo scroll anchoring");
assert.match(source, /win\.scrollTo\(0, restoreY\)/, "il punto di lettura deve essere ripristinato");
assert.match(source, /win\.innerWidth/);
assert.match(source, /documentElement\.clientWidth/);
assert.match(source, /paddingRight: style\.paddingRight/, "il padding inline preesistente deve essere conservato");
assert.match(source, /style\.paddingRight = bodyStyles\.paddingRight/, "il padding inline preesistente deve essere ripristinato");
assert.match(source, /event\.target === overlay/, "il click interno non deve chiudere il backdrop");
assert.match(source, /aria-modal/);
assert.match(source, /aria-expanded/);
assert.match(source, /setBackgroundInert/);
assert.match(source, /prefers-reduced-motion/);
assert.match(source, /IntersectionObserver/);

const css = read("src/css/frontiera.css");
assert.match(css, /@media\(max-width:899px\)[\s\S]*?\.infobox-mobile-trigger/);
assert.match(css, /max-height:calc\(75dvh - var\(--infobox-mobile-top/);
assert.match(css, /overscroll-behavior:contain/);
assert.match(css, /width:44px;height:44px/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /@supports not \(\(backdrop-filter:blur\(2px\)\)/);
assert.match(css, /background:linear-gradient\(155deg,rgba\(25,58,73,\.32\),rgba\(5,20,29,\.22\) 55%,rgba\(7,18,26,\.34\)\)/);
assert.match(css, /backdrop-filter:blur\(16px\) saturate\(1\.14\) brightness\(\.72\)/);

console.log("Infobox mobile: hook unico, breakpoint, trasferimento DOM, stati, aptica e contratti CSS verificati.");
