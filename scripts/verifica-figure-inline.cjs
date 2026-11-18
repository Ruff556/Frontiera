"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DomUtils, parseDocument } = require("htmlparser2");
const { creditiIconografici, riferimentoFigura } = require("../src/_lib/crediti-iconografici");
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
// Lo stesso partial resta sicuro anche con autoescape disattivato nell'ambiente.
const nunjucks = require("nunjucks");
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, "../src/_includes")), {autoescape:false});
env.addFilter("responsiveImage", () => '<img alt="test">');
const hostile = normalizeFigura({...img, didascalia:'<script>alert(1)</script>', credito:'<a href="javascript:alert(1)">X</a>', licenza:'A & B'});
const rendered = env.renderString('{% from "partials/media.njk" import figuraInline %}{{ figuraInline(m) }}', {m:hostile});
assert.ok(rendered.includes("&lt;script&gt;"));
assert.ok(rendered.includes("A &amp; B"));
assert.doesNotMatch(rendered, /<script|<a href/);

const linkify = require("markdown-it")().linkify;
const partial = '{% from "partials/crediti-iconografici.njk" import richiamoCredito, registroCrediti %}';
const preparaCrediti = (body, hero, images) => creditiIconografici(body, hero, images, linkify,
  voce => env.renderString(partial + "{{ richiamoCredito(voce) }}", { voce }));
const diritti = {
  ...img,
  didascalia: "Foto con attribuzione completa",
  credito: 'Autore & <script>alert(1)</script> · https://example.org/autore?a=1&b=2',
  fonte: "Foto (https://commons.wikimedia.org/wiki/File:Prova_(2025).jpg).",
  licenza: "CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/ — Ritaglio e conversione WebP.\n" +
    "Autorizzazione https://commons.wikimedia.org/wiki/Template:Mil.ru (ticket VRT 123). javascript:alert(1)",
};
const minima = { file: "/immagini/minima.webp", alt: "" };
const images = { completa: diritti, minima, inutilizzata: img };
const figura = (image) => env.renderString(
  '{% from "partials/media.njk" import figuraInline %}{{ figuraInline(modello, riferimento) }}',
  { modello: normalizeFigura(image), riferimento: riferimentoFigura(image, images, normalizeFigura(image)) }
);
const prosa = `<p>Un paragrafo da conservare &amp; invariato.</p><!-- ${figura(img)} -->`;
const model = preparaCrediti(prosa + figura(minima) + figura(diritti) + figura(diritti), diritti, images);
assert.ok(model.corpo.startsWith(prosa));
assert.deepEqual(model.voci.map(({ numero, nome }) => [numero, nome]), [
  ["01", diritti.didascalia], ["02", "minima.webp"], ["03", diritti.didascalia],
]);
assert.equal(model.voci[1].campi.length, 0);
assert.equal(model.voci[2].usi.length, 2);
assert.notEqual(model.voci[2].usi[0].id, model.voci[2].usi[1].id);
assert.equal(preparaCrediti(figura(diritti), null, images).voci[0].id, model.voci[2].id);
const diretta = { ...img, licenza: "Consultare https://creativecommons.org.example.com/licenses/by/4.0/" };
const modelDiretto = preparaCrediti(figura(diretta), null, images);
assert.equal(modelDiretto.voci[0].nome, img.alt);
assert.equal(modelDiretto.voci[0].campi[0].segmenti[1].testo, "Riferimento per la licenza");
for (const [i, campo] of ["credito", "fonte", "licenza"].entries()) {
  assert.equal(model.voci[2].campi[i].segmenti.map(p => p.url || p.testo).join(""), diritti[campo]);
}
const registro = (voci) => env.renderString(partial + "{{ registroCrediti(voci) }}", { voci }).trim();
assert.equal(registro(preparaCrediti(prosa, null, images).voci), "");
const credits = registro(model.voci);
assert.doesNotMatch(credits, /<script|href="javascript:|>https?:\/\//);
assert.match(credits, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.match(credits, /href="https:\/\/example\.org\/autore\?a=1&amp;b=2"/);
assert.match(credits, /Licenza CC BY-SA 4\.0<\/a> — Ritaglio e conversione WebP/);
assert.match(credits, /Scheda Wikimedia Commons<\/a>\)\./);
assert.match(credits, /Riferimento Wikimedia Commons<\/a> \(ticket VRT 123\)/);

const elements = (source, predicate) => DomUtils.findAll(predicate, parseDocument(source).children);
const figureDemo = elements(html, el => el.name === "figure" && el.attribs.class?.includes("figura-inline"));
assert.equal(figureDemo.length, 10);
assert.ok(figureDemo.every(f => DomUtils.findOne(el => el.attribs.class === "credito-immagine-link", f.children)));
assert.equal(elements(html, el => el.attribs.class === "rights").length, 0);
console.log("[verify:figure-inline] OK — diagnostica, HTML, asset, isolamento demo e registro dei crediti.");
