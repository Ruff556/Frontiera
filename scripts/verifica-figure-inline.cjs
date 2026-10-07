"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { normalizeFigura } = require("../src/_lib/figura");
const img = { file: "/immagini/prova.webp", alt: "Descrizione" };
assert.equal(normalizeFigura(img).lato, "block");
assert.equal(normalizeFigura(img, "2/4").lato, "left");
assert.equal(normalizeFigura(img, "4/4", "right").lato, "block");
assert.equal(normalizeFigura({...img, alt: ""}).img.alt, "");
for (const [input, misura, lato, error] of [
  [undefined, undefined, undefined, /immagine indefinita/],
  [img, "1/4", undefined, /misura ammessa/],
  [img, "2/4", "center", /lato ammesso/],
  [{file:img.file}, undefined, undefined, /alt obbligatorio/],
  [{...img, alt:" "}, undefined, undefined, /alt obbligatorio/],
  [{...img, fit:"stretch"}, undefined, undefined, /fit ammesso/],
  [{...img, file:"https://example.org/x.png"}, undefined, undefined, /asset locale/],
  [{...img, didascalia:{}}, undefined, undefined, /didascalia deve essere testo/],
]) assert.throws(() => normalizeFigura(input, misura, lato, "prova.md"), error);
const root = path.resolve(__dirname, "..", "_site");
const html = fs.readFileSync(path.join(root, "demo/immagini-inline/index.html"), "utf8");
assert.match(html, /name="robots" content="noindex, follow"/);
assert.doesNotMatch(html, /<p>\s*<figure/);
for (const figure of html.matchAll(/<figure class="media figura-inline[\s\S]*?<\/figure>/g)) {
  assert.doesNotMatch(figure[0], /<p>/, "Il Markdown non deve interpretare i campi della figura");
}
assert.doesNotMatch(html, /data-image-lightbox|data-full-src/);
assert.match(html, /<strong>grassetti<\/strong>/);
for (const match of html.matchAll(/(?:src|srcset)="([^"<>]+)"/g)) {
  for (const value of match[1].split(",")) {
    const url = value.trim().split(/\s+/)[0];
    if (url.startsWith("/immagini/")) assert.ok(fs.existsSync(path.join(root, url)), `Asset assente: ${url}`);
  }
}
for (const file of ["sitemap.xml", "feed.xml", "index.html"]) {
  assert.ok(!fs.readFileSync(path.join(root, file), "utf8").includes("/demo/immagini-inline/"));
}
console.log("[verify:figure-inline] OK — diagnostica, HTML, asset e isolamento demo.");
// Lo stesso partial resta sicuro anche con autoescape disattivato nell'ambiente.
const nunjucks = require("nunjucks");
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, "../src/_includes")), {autoescape:false});
env.addFilter("responsiveImage", () => '<img alt="test">');
const hostile = normalizeFigura({...img, didascalia:'<script>alert(1)</script>', credito:'<a href="javascript:alert(1)">X</a>', licenza:'A & B'});
const rendered = env.renderString('{% from "partials/media.njk" import figuraInline %}{{ figuraInline(m) }}', {m:hostile});
assert.ok(rendered.includes("&lt;script&gt;"));
assert.ok(rendered.includes("A &amp; B"));
assert.doesNotMatch(rendered, /<script|<a href/);
