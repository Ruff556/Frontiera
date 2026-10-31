"use strict";
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt({ html: true, typographer: false });

// Explicit, editorial markers: no text matching, inferred sections or global
// replacement of variable names at runtime. Each segment has one context.
module.exports = function renderModelContent(source, model) {
  return source.split(/^:::segment /m).map((part, index) => {
    if (!index) {
      if (part.trim()) throw new Error("Model content must start with a segment marker");
      return "";
    }
    const newline = part.indexOf("\n");
    const [panelId, variable = ""] = part.slice(0, newline).trim().split(/\s+/);
    const panel = Number(panelId);
    const def = variable ? model.defs.find(d => d.id === variable && d.panel === panel) : null;
    if (!model.panels[panel] || (variable && !def)) throw new Error(`Invalid model segment: ${panelId} ${variable}`);
    const control = def ? `<button type="button" class="mr-variable mr-margin" data-focus="${def.id}" aria-pressed="false"><strong>${def.symbol}</strong><span>${def.name}</span></button>` : "";
    const stop = def ? ` id="mr-variable-${def.id.toLowerCase()}" data-section-navigation-stop data-section-navigation-label="${md.utils.escapeHtml(`${def.symbol} · ${def.name}`)}" data-section-navigation-short-label="${md.utils.escapeHtml(def.symbol)}"` : "";
    return `<section class="mr-segment${def ? " mr-segment--variable" : ""}" data-context-panel="${panel}" data-context-variable="${variable}"${stop}>${control}<div class="mr-prose">${md.render(part.slice(newline + 1))}</div></section>`;
  }).join("\n");
};
