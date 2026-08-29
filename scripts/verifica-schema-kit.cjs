"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const runtimePath = path.join(root, "src/js/schema-kit.js");
const partialPath = path.join(root, "src/_includes/partials/schema-kit.njk");
const cssPath = path.join(root, "src/css/schema-kit.css");
const basePath = path.join(root, "src/_includes/layouts/base.njk");
const str1PartialPath = path.join(root, "src/_includes/partials/schema-str1.njk");
const str1CssPath = path.join(root, "src/css/schema-str1.css");
const str1JsPath = path.join(root, "src/js/schema-str1.js");
const str1ArticlePath = path.join(root, "contenuti/analisi/capacita-residua-bombardamento.md");

for (const file of [runtimePath, partialPath, cssPath, basePath, str1PartialPath, str1CssPath, str1JsPath, str1ArticlePath]) {
  assert.ok(fs.existsSync(file), `File richiesto assente: ${path.relative(root, file)}`);
}

const listeners = new Map();
const fakeDocument = {
  visibilityState: "visible",
  addEventListener(type, callback) { listeners.set(type, callback); },
  removeEventListener(type, callback) { if (listeners.get(type) === callback) listeners.delete(type); },
  createElementNS() { throw new Error("createElementNS non previsto in questo test"); }
};
let reducedMotionEnabled = false;
const fakeWindow = {
  setTimeout,
  clearTimeout,
  matchMedia(query) { return { matches: reducedMotionEnabled && query === "(prefers-reduced-motion: reduce)" }; }
};
const sandbox = {
  window: fakeWindow,
  document: fakeDocument,
  Promise,
  Map,
  Set,
  Object,
  Array,
  String,
  Math,
  Error
};

vm.runInNewContext(fs.readFileSync(runtimePath, "utf8"), sandbox, { filename: runtimePath });
const kit = fakeWindow.FrontieraSchemaKit;
assert.equal(kit.version, "1.0.0");
assert.equal(kit.reducedMotion(), false);
reducedMotionEnabled = true;
assert.equal(kit.reducedMotion(), true, "Il runtime deve riconoscere prefers-reduced-motion");
reducedMotionEnabled = false;

const changes = [];
const sequence = kit.createSequence({
  states: ["momento-1", "momento-2", "momento-3"],
  onChange(change) { changes.push(change); }
});
assert.equal(sequence.isOff(), true, "La sequenza deve nascere nello stato off");
assert.equal(sequence.next("test"), "momento-1");
assert.equal(sequence.next("test"), "momento-2");
assert.equal(sequence.set("momento-3", "test"), "momento-3");
assert.equal(sequence.next("test"), "momento-1", "Il ciclo non deve tornare allo stato off");
assert.equal(sequence.reset("test"), null);
assert.equal(sequence.isOff(), true);
assert.equal(changes.length, 5);

const rootElement = { querySelectorAll() { return []; } };
const context = kit.createContext(rootElement);
const token = context.token;
const pending = kit.wait(context, 100, token);
kit.cancel(context);

pending.then((result) => {
  assert.equal(result, false, "La cancellazione deve risolvere le attese pendenti");
  assert.equal(kit.valid(context, token), false);
  kit.destroy(context);

  const base = fs.readFileSync(basePath, "utf8");
  const runtimeIndex = base.indexOf('/js/schema-kit.js');
  const starlinkIndex = base.indexOf('/js/schema-starlink.js');
  const palantirIndex = base.indexOf('/js/schema-palantir.js');
  const str1Index = base.indexOf('/js/schema-str1.js');
  assert.ok(runtimeIndex >= 0, "Il runtime Schema Kit non e caricato dal layout base");
  assert.ok(runtimeIndex < starlinkIndex && runtimeIndex < palantirIndex, "Il runtime deve precedere gli schemi specifici");
  assert.ok(runtimeIndex < str1Index, "Il runtime deve precedere STR1");
  assert.ok(base.indexOf('/css/schema-kit.css') < base.indexOf('/css/schema-str1.css'), "Il CSS del kit deve precedere STR1");

  const str1Partial = fs.readFileSync(str1PartialPath, "utf8");
  for (const contract of ["schemaFrame", "schemaStage", "schemaConsole", "schemaReading", "schemaControls", "schemaCaption", "data-str1-dynamic", "data-str1-desc"]) {
    assert.ok(str1Partial.includes(contract), `STR1: contratto mancante ${contract}`);
  }
  assert.ok(!str1Partial.includes("data:image"), "STR1 non deve incorporare immagini data URI");
  assert.ok(str1Partial.includes("str1-schema__copy-sizer") && str1Partial.includes('aria-hidden="true"'), "STR1: sizer testuali accessibili mancanti");
  const str1Css = fs.readFileSync(str1CssPath, "utf8");
  assert.ok(str1Css.includes("@media (hover: hover) and (pointer: fine)") && str1Css.includes("str1-schema__button--next:not(:disabled):hover"), "STR1: hover locale di AVANZA mancante");
  assert.ok(str1Css.includes(".str1-schema__alert-pulse") && !str1Css.includes(".str1-schema__alert {"), "STR1: il pulse deve essere separato dall’anchor");
  assert.match(str1Css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.str1-schema__alert-pulse\s*\{[^}]*animation:\s*none;[^}]*transform:\s*none;/, "STR1: stato statico dell’allerta in reduced-motion mancante");
  const str1Js = fs.readFileSync(str1JsPath, "utf8");
  assert.ok(str1Js.includes('"data-alert-anchor"') && str1Js.includes('"data-alert-pulse"'), "STR1: struttura anchor/pulse dell’allerta mancante");
  assert.ok(str1Js.includes('placeCarrier("stand-off-out", 1, "transport")'), "STR1: carrier di trasporto congelato mancante al momento 02");
  assert.ok(str1Js.includes("at >= length - 1.5"), "STR1: tangente terminale del carrier non preservata");
  const str1Article = fs.readFileSync(str1ArticlePath, "utf8");
  const schemaIndex = str1Article.indexOf("schemaStr1");
  const decisionIndex = str1Article.indexOf("Questa decisione è");
  assert.ok(schemaIndex >= 0 && schemaIndex < decisionIndex, "STR1 deve precedere il paragrafo sull’allocazione");

  const partial = fs.readFileSync(partialPath, "utf8");
  for (const macro of ["schemaFrame", "schemaStage", "schemaConsole", "schemaReading", "schemaControls", "schemaCaption"]) {
    assert.match(partial, new RegExp(`macro ${macro}\\b`));
  }

  console.log("Schema Kit v1: contratto, sequenza off e cancellazione verificati.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
