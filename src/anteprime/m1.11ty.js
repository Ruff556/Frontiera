"use strict";
const fs = require("node:fs");
const path = require("node:path");
const model = require("../js/model-m1");
const renderContent = require("../_lib/modelli/content");
module.exports = class {
  data() {
    return {
      layout: "layouts/modello.njk",
      permalink: "/anteprime/modelli/m1/",
      titolo: "M1 — Ritorno alla coerenza",
      descrizione: "Anteprima del lettore Modelli di Frontiera. Prima stesura editoriale, canone del 3 ottobre 2026.",
      noindex: true,
      eleventyExcludeFromCollections: true,
      model: {
        id: "m1", code: "M1", title: "Ritorno alla coerenza",
        defs: model.defs, phases: model.phases,
        panels: model.panels.map((p, i) => ({ ...p, index: i, defs: model.defs.filter(d => d.panel === i), svg: model.render(i) }))
      }
    };
  }
  render() {
    return renderContent(fs.readFileSync(path.join(__dirname, "../_includes/modelli/m1.md"), "utf8"), model);
  }
};
