#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "_site");
const siteData = require(path.join(ROOT, "src", "_data", "site.js"));
const siteUrl = String(siteData.url || "").replace(/\/+$/, "");

const samples = [
  ["/", "website", "homepage"],
  ["/archivio/attualita/", "website", "archivio"],
  ["/analisi/storm-shadow-ucraina-fabbrica-profondita/", "article", "attualita"],
  ["/analisi/capacita-residua-bombardamento/", "article", "strategia"],
  ["/fasi/manovra-fallita/", "article", "fasi"],
  ["/profondita/asimmetria-iniziale-decisione-mancata/", "article", "profondita"],
  ["/schede/starlink/", "article", "sistemi"],
  ["/progetto/", "website", "istituzionale"],
  ["/404.html", "website", "404"],
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function htmlPath(url) {
  if (url === "/") return path.join(SITE, "index.html");
  if (url.endsWith(".html")) return path.join(SITE, url.replace(/^\//, ""));
  return path.join(SITE, url.replace(/^\//, ""), "index.html");
}

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    result[match[1].toLowerCase()] = match[3];
  }
  return result;
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
}

function meta(html, attribute, name) {
  return tags(html, "meta")
    .map(attrs)
    .filter((item) => item[attribute] === name)
    .map((item) => item.content || "");
}

function links(html, rel) {
  return tags(html, "link")
    .map(attrs)
    .filter((item) => (item.rel || "").split(/\s+/).includes(rel))
    .map((item) => item.href || "");
}

function title(html) {
  const values = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) => match[1].trim());
  assert.equal(values.length, 1, "<title> deve essere unico");
  return values[0];
}

function absolute(value, label) {
  let url;
  try { url = new URL(value); } catch { assert.fail(`${label} non assoluto: ${value}`); }
  assert.equal(url.protocol, "https:", `${label} deve usare HTTPS: ${value}`);
  assert.equal(url.origin, new URL(siteUrl).origin, `${label} fuori dal dominio canonico: ${value}`);
  return url;
}

function unique(values, label) {
  assert.equal(values.length, 1, `${label}: atteso un valore, trovati ${values.length}`);
  assert.ok(values[0], `${label}: valore vuoto`);
  return values[0];
}

function jsonLd(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.map((match) => JSON.parse(match[1]));
}

function localAssetFromAbsolute(value) {
  const url = absolute(value, "URL immagine");
  const relative = decodeURI(url.pathname).replace(/^\/+/, "").split("/").join(path.sep);
  const file = path.resolve(SITE, relative);
  assert.ok(file.startsWith(`${SITE}${path.sep}`), `asset fuori da _site: ${value}`);
  return file;
}

function decodeXml(value) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function validateXml(xml) {
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/i, "entità XML non escaped");
  const stack = [];
  for (const match of xml.matchAll(/<\/?([A-Za-z_][\w:.-]*)\b[^>]*>/g)) {
    const token = match[0];
    const name = match[1];
    if (token.startsWith("</")) {
      assert.equal(stack.pop(), name, `chiusura XML inattesa: ${token}`);
    } else if (!token.endsWith("/>")) {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], "tag XML non chiusi");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function verifyNotFoundCss() {
  const cssFile = path.join(SITE, "css", "frontiera.css");
  assert.ok(fs.existsSync(cssFile), `CSS Frontiera assente (${cssFile})`);
  const css = fs.readFileSync(cssFile, "utf8");
  for (const selector of [
    ".not-found",
    ".not-found__panel",
    ".not-found__code",
    ".not-found__copy",
    ".not-found__actions",
    ".not-found__action",
  ]) {
    assert.match(css, new RegExp(`${escapeRegExp(selector)}\\s*\\{`), `selettore 404 assente nel CSS: ${selector}`);
  }
}

async function verifyPage(url, expectedType, family) {
  const file = htmlPath(url);
  assert.ok(fs.existsSync(file), `${url}: pagina assente (${file})`);
  const html = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(html, /\bundefined\b|\bnull\b|\[object Object\]|frontiera\.(?:example|invalid)/i, `${url}: valore proibito nell'HTML`);
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  assert.ok(headMatch, `${url}: <head> assente o non chiuso`);
  const head = headMatch[1];

  const pageTitle = title(head);
  assert.ok(pageTitle.length <= 85, `${url}: title eccessivo (${pageTitle.length} caratteri)`);
  assert.match(pageTitle, /\| Frontiera$|^Frontiera \| /, `${url}: convenzione title non rispettata`);
  const description = unique(meta(head, "name", "description"), `${url}: description`);
  const decodedDescription = decodeXml(description);
  assert.ok(decodedDescription.length <= 160, `${url}: description eccessiva (${decodedDescription.length} caratteri)`);

  const canonical = links(head, "canonical");
  if (family === "404") {
    assert.deepEqual(canonical, [], "404: canonical da omettere");
    assert.equal(unique(meta(head, "name", "robots"), "404: robots"), "noindex, follow");
  } else {
    const expected = new URL(url, `${siteUrl}/`).href;
    assert.equal(unique(canonical, `${url}: canonical`), expected, `${url}: canonical errato`);
    assert.ok(!meta(head, "name", "robots").some((value) => /noindex/i.test(value)), `${url}: noindex inatteso`);
  }

  const requiredOg = ["og:title", "og:description", "og:type", "og:url", "og:site_name", "og:locale", "og:image", "og:image:alt", "og:image:type"];
  const og = Object.fromEntries(requiredOg.map((key) => [key, unique(meta(head, "property", key), `${url}: ${key}`)]));
  assert.equal(og["og:type"], expectedType, `${url}: og:type errato`);
  absolute(og["og:url"], `${url}: og:url`);
  const imageFile = localAssetFromAbsolute(og["og:image"]);
  assert.ok(fs.existsSync(imageFile), `${url}: og:image non pubblicata (${imageFile})`);
  assert.ok(og["og:image:alt"].trim(), `${url}: og:image:alt vuoto`);

  if (og["og:image"].endsWith("/immagini/meta/frontiera-og-home.png")) {
    assert.equal(unique(meta(head, "property", "og:image:width"), `${url}: og:image:width`), "1200");
    assert.equal(unique(meta(head, "property", "og:image:height"), `${url}: og:image:height`), "630");
    const image = await sharp(imageFile).metadata();
    assert.equal(image.width, 1200, `${url}: fallback OG non largo 1200 px`);
    assert.equal(image.height, 630, `${url}: fallback OG non alto 630 px`);
  } else if (["attualita", "strategia"].includes(family)) {
    const image = await sharp(imageFile).metadata();
    const ratio = image.width / image.height;
    assert.ok(image.width >= 960, `${url}: immagine editoriale OG sotto 960 px`);
    assert.ok(ratio >= 1.5 && ratio <= 2, `${url}: rapporto immagine editoriale OG inadatto (${ratio.toFixed(3)})`);
  }

  assert.equal(unique(meta(head, "name", "twitter:card"), `${url}: twitter:card`), "summary_large_image");
  for (const key of ["twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    unique(meta(head, "name", key), `${url}: ${key}`);
  }

  if (expectedType === "article") unique(meta(head, "property", "article:section"), `${url}: article:section`);
  if (["attualita", "strategia"].includes(family)) {
    unique(meta(head, "property", "article:published_time"), `${url}: article:published_time`);
  }
  if (family === "sistemi") unique(meta(head, "property", "article:modified_time"), `${url}: article:modified_time`);

  const structured = jsonLd(head);
  if (family === "404") {
    assert.deepEqual(structured, [], "404: JSON-LD da omettere");
  } else {
    assert.equal(structured.length, 1, `${url}: JSON-LD deve essere unico`);
    assert.equal(structured[0]["@context"], "https://schema.org", `${url}: contesto JSON-LD errato`);
    assert.ok(Array.isArray(structured[0]["@graph"]), `${url}: @graph JSON-LD assente`);
    const types = structured[0]["@graph"].map((item) => item["@type"]);
    for (const type of ["Organization", "WebSite", "WebPage"]) assert.ok(types.includes(type), `${url}: ${type} assente dal JSON-LD`);
    if (family === "attualita") assert.ok(types.includes("NewsArticle"), `${url}: NewsArticle assente`);
    if (family === "strategia") assert.ok(types.includes("Article"), `${url}: Article assente`);
  }

  return { html, canonical: canonical[0] || null };
}

async function main() {
  assert.ok(fs.existsSync(SITE), "output _site assente");
  absolute(`${siteUrl}/`, "site.url");
  assert.doesNotMatch(siteUrl, /frontiera\.(?:example|invalid)|\.invalid(?:\/|$)/i, "site.url contiene un placeholder");

  for (const sample of samples) await verifyPage(...sample);

  const sitemapFile = path.join(SITE, "sitemap.xml");
  assert.ok(fs.existsSync(sitemapFile), "sitemap.xml assente");
  const sitemap = fs.readFileSync(sitemapFile, "utf8").trim();
  validateXml(sitemap);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.doesNotMatch(sitemap, /<(?:changefreq|priority)>/i, "changefreq/priority non ammessi");
  assert.doesNotMatch(sitemap, /\/404\.html<\/loc>/, "404 presente nella sitemap");
  assert.doesNotMatch(sitemap, /frontiera\.(?:example|invalid)/i, "placeholder nella sitemap");

  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeXml(match[1]));
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "URL duplicati nella sitemap");
  sitemapUrls.forEach((value) => absolute(value, "sitemap loc"));

  const canonicalUrls = [];
  for (const file of walk(SITE).filter((item) => item.endsWith(".html"))) {
    const html = fs.readFileSync(file, "utf8");
    const robots = meta(html, "name", "robots").join(",");
    if (/noindex/i.test(robots)) continue;
    const canonical = links(html, "canonical");
    assert.equal(canonical.length, 1, `${path.relative(SITE, file)}: canonical mancante o duplicato`);
    canonicalUrls.push(canonical[0]);
  }
  assert.deepEqual([...sitemapUrls].sort(), [...canonicalUrls].sort(), "sitemap diversa dall'insieme dei canonical indicizzabili");

  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  for (const entry of entries) {
    const lastmod = entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
    if (lastmod) assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `lastmod non ISO: ${lastmod}`);
  }
  const entryFor = (needle) => entries.find((entry) => entry.includes(needle)) || "";
  assert.match(entryFor("/analisi/storm-shadow-ucraina-fabbrica-profondita/"), /<lastmod>2026-08-25<\/lastmod>/, "lastmod Analisi assente/errato");
  assert.match(entryFor("\/schede\/starlink\/"), /<lastmod>2026-08-06<\/lastmod>/, "lastmod Sistema assente/errato");
  assert.doesNotMatch(entryFor("\/fasi\/manovra-fallita\/"), /<lastmod>/, "lastmod inventato per F");
  assert.doesNotMatch(entryFor("\/profondita\/asimmetria"), /<lastmod>/, "lastmod inventato per P");

  const robotsFile = path.join(SITE, "robots.txt");
  assert.ok(fs.existsSync(robotsFile), "robots.txt assente");
  const robots = fs.readFileSync(robotsFile, "utf8").replace(/\r\n/g, "\n").trim();
  assert.equal(robots, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml`, "robots.txt inatteso");

  verifyNotFoundCss();

  console.log(`[verify:seo] PASS — ${samples.length} famiglie, ${sitemapUrls.length} canonical, robots/sitemap/404 validi, CSS 404 verificato.`);
}

main().catch((error) => {
  console.error(`[verify:seo] FAIL — ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
