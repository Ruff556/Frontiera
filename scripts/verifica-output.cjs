#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageUrl(file) {
  const rel = path.relative(SITE, file).split(path.sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

function localPath(url, fromUrl = "/") {
  if (!url || /^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(url)) return null;
  const [rawPath, hash = ""] = url.split("#", 2);
  const base = new URL(fromUrl, "https://frontiera.invalid");
  const absolute = new URL(rawPath || base.pathname, base);
  const pathname = decodeURI(absolute.pathname);
  const rel = pathname.replace(/^\/+/, "").split("/").join(path.sep);
  return { pathname, hash: decodeURIComponent(hash), disk: path.resolve(SITE, rel) };
}

function resolvePublished(target) {
  const candidates = [target.disk];
  if (target.pathname.endsWith("/")) candidates.push(path.join(target.disk, "index.html"));
  else if (!path.extname(target.disk)) candidates.push(path.join(target.disk, "index.html"));
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}

function attrs(tag) {
  const values = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) values[match[1].toLowerCase()] = match[3];
  return values;
}

async function main() {
  assert.ok(fs.existsSync(SITE), "output _site assente");
  const frontieraCss = fs.readFileSync(path.join(ROOT, "src", "css", "frontiera.css"), "utf8");
  const palantirCss = fs.readFileSync(path.join(ROOT, "src", "css", "schema-palantir.css"), "utf8");

  // Le primitive di base devono vivere nel foglio globale: se finiscono in un
  // modulo, le pagine che non lo caricano ricadono negli stili del browser.
  assert.match(frontieraCss, /body\s*\{[^}]*font-family:[^}]*background:[^}]*color:[^}]*line-height:[^}]*overflow-x:clip/s, "body globale incompleto o privo di overflow-x:clip");
  for (const contract of [
    /\.mono\s*\{[^}]*font-family:/,
    /\.disp\s*\{[^}]*font-family:/,
    /(?:^|\})\s*a\s*\{[^}]*color:inherit[^}]*text-decoration:none/m,
    /(?:^|\})\s*img\s*\{[^}]*max-width:100%[^}]*display:block/m,
    /(?:^|\})\s*svg\s*\{[^}]*display:block/m,
    /(?:^|\})\s*:focus-visible\s*\{[^}]*outline:/m,
    /\.foglio :focus-visible,[^{]*\.specs :focus-visible\s*\{[^}]*outline-color:/,
  ]) assert.match(frontieraCss, contract, `contratto CSS globale mancante: ${contract}`);

  for (const forbidden of [
    /(?:^|\})\s*body\s*\{/m,
    /(?:^|\})\s*\.mono\s*\{/m,
    /(?:^|\})\s*\.disp\s*\{/m,
    /(?:^|\})\s*a\s*\{/m,
    /(?:^|\})\s*img\s*\{/m,
    /(?:^|\})\s*svg\s*\{/m,
    /(?:^|\})\s*:focus-visible\s*\{/m,
    /overflow-x\s*:\s*hidden/,
  ]) assert.doesNotMatch(palantirCss, forbidden, `regola globale estranea in schema-palantir.css: ${forbidden}`);

  const mobileTimelineStart = frontieraCss.indexOf("@media(max-width:999px),(hover:none),(pointer:coarse)");
  const desktopTimelineStart = frontieraCss.indexOf("@media(min-width:1000px) and (hover:hover) and (pointer:fine)");
  const timelineReducedMotionStart = frontieraCss.indexOf("@media(prefers-reduced-motion:reduce)", desktopTimelineStart);
  assert.ok(mobileTimelineStart >= 0 && desktopTimelineStart > mobileTimelineStart && timelineReducedMotionStart > desktopTimelineStart, "rami timeline mobile/desktop non individuabili");
  const mobileTimeline = frontieraCss.slice(mobileTimelineStart, desktopTimelineStart);
  const desktopTimeline = frontieraCss.slice(desktopTimelineStart, timelineReducedMotionStart);
  for (const contract of ["scroll-snap-type:x mandatory", "--lf-mobile-saturazione", "touch-action:pan-x pan-y"]) {
    assert.ok(mobileTimeline.includes(contract), `contratto timeline mobile alterato: ${contract}`);
  }
  assert.match(desktopTimeline, /\.lf\s*\{[^}]*transition:flex-grow/, "espansione flex desktop rimossa");
  assert.match(desktopTimeline, /\.lf-link\s*\{[^}]*backdrop-filter:none/, "blur timeline desktop non disattivato");
  assert.match(desktopTimeline, /\.lf-link::before\s*\{[^}]*opacity:[^}]*transition:opacity/, "scrim desktop composito assente");
  assert.doesNotMatch(desktopTimeline, /transition:[^;}]*filter/, "la timeline desktop non deve animare filter");
  const desktopStaticFilter = "filter:saturate(.98) contrast(1.04) brightness(1)";
  assert.equal((desktopTimeline.match(new RegExp(desktopStaticFilter.replace(/[().]/g, "\\$&"), "g")) || []).length, 2, "il filtro desktop deve restare identico a riposo e durante hover/focus");

  const htmlFiles = walk(SITE).filter((file) => file.endsWith(".html"));
  // La 404 e le pagine noindex sono infrastruttura pubblica, non URL editoriali
  // da confrontare con la baseline del sito indicizzabile.
  const urls = htmlFiles
    .filter((file) => pageUrl(file) !== "/404.html")
    .filter((file) => !/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(fs.readFileSync(file, "utf8")))
    .map(pageUrl)
    .sort();
  const baselineFile = path.join(ROOT, "reports", "performance-baseline.json");
  if (fs.existsSync(baselineFile)) {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
    const expectedUrls = [...baseline.site.urls]
      // La pagina indice della Linea F è stata rimossa in questa pre-release;
      // le route figlie /fasi/<slug>/ restano invece parte del sito.
      .filter((url) => url !== "/fasi/")
      .map((url) => url === "/analisi/Storm-Shadow-Ucraina-la-fabbrica-entra-nella-profondita/"
        ? "/analisi/storm-shadow-ucraina-fabbrica-profondita/"
        : url)
      .sort();
    const redirectsFile = path.join(ROOT, "src", "_redirects");
    const redirects = new Map();
    if (fs.existsSync(redirectsFile)) {
      for (const line of fs.readFileSync(redirectsFile, "utf8").split(/\r?\n/)) {
        const [source, destination, status] = line.trim().split(/\s+/);
        if (source && destination && status === "301") redirects.set(source, destination);
      }
    }
    const expectedUrlsMigrated = expectedUrls.map((url) => redirects.get(url) || url).sort();
    assert.deepEqual(urls, expectedUrlsMigrated, "l'elenco degli URL è cambiato oltre la migrazione canonica A2 prevista");
  }

  const problems = [];
  let responsiveImages = 0;
  let checkedReferences = 0;
  const checkedFormats = new Set();

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const fromUrl = pageUrl(file);
    const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
    const references = [];

    for (const tag of html.match(/<(?:a|link|script|img|source|image)\b[^>]*>/gi) || []) {
      const values = attrs(tag);
      for (const key of ["href", "src"]) if (values[key]) references.push(values[key]);
      if (values.srcset) {
        for (const candidate of values.srcset.split(",")) references.push(candidate.trim().split(/\s+/, 1)[0]);
      }

      if (/^<img\b/i.test(tag) && values.src?.startsWith("/immagini/responsive/")) {
        responsiveImages += 1;
        for (const required of ["width", "height", "decoding", "loading"]) {
          if (!values[required]) problems.push(`${fromUrl}: immagine responsive senza ${required}`);
        }
        if (values.decoding !== "async") problems.push(`${fromUrl}: decoding non async su ${values.src}`);
        const pictureStart = html.lastIndexOf("<picture", html.indexOf(tag));
        const pictureEnd = html.indexOf("</picture>", pictureStart);
        const picture = pictureStart >= 0 && pictureEnd >= 0 ? html.slice(pictureStart, pictureEnd) : "";
        if (!(values.srcset && values.sizes) && (!/\bsrcset=["']/.test(picture) || !/\bsizes=["']/.test(picture))) {
          problems.push(`${fromUrl}: picture privo di srcset/sizes per ${values.src}`);
        }
      }
    }

    for (const reference of references) {
      const target = localPath(reference, fromUrl);
      if (!target) continue;
      checkedReferences += 1;
      const published = resolvePublished(target);
      if (!published) {
        problems.push(`${fromUrl}: riferimento mancante ${reference}`);
        continue;
      }
      if (target.hash && published.endsWith(".html")) {
        const targetHtml = published === file ? html : fs.readFileSync(published, "utf8");
        const targetIds = published === file ? ids : new Set([...targetHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
        if (!targetIds.has(target.hash)) problems.push(`${fromUrl}: ancora mancante ${reference}`);
      }
    }

    const carouselImages = [...html.matchAll(/<li class=["'][^"']*slide[^"']*["'][\s\S]*?<img\b[^>]*>/g)].map((match) => attrs(match[0].match(/<img\b[^>]*>/i)[0]));
    if (carouselImages.length) {
      if (carouselImages[0].loading !== "eager" || carouselImages[0].fetchpriority !== "high") problems.push(`${fromUrl}: prima slide non candidata LCP`);
      for (const image of carouselImages.slice(1)) if (image.loading !== "lazy") problems.push(`${fromUrl}: slide successiva non lazy`);
    }

    const scriptMap = [
      ["/js/carosello.js", 'id="slides"'],
      ["/js/filtro-archivio.js", 'id="archfilters"'],
      ["/js/schema-starlink.js", "data-starlink-flow"],
      ["/js/schema-palantir.js", "data-palantir-schema"],
      ["/js/schema-kit.js", "data-schema-kit="],
      ["/js/image-lightbox.js", "data-image-lightbox-scope"],
      ["/js/infobox-mobile.js", "data-infobox-mobile-hook"],
    ];
    for (const [script, hook] of scriptMap) {
      if (html.includes(`src="${script}"`) !== html.includes(hook)) problems.push(`${fromUrl}: inclusione non coerente ${script} / ${hook}`);
    }
    const stylesheetMap = [
      ["/css/schema-palantir.css", "data-palantir-schema"],
      ["/css/schema-starlink.css", "data-starlink-flow"],
      ["/css/schema-kit.css", "data-schema-kit="],
      ["/css/image-lightbox.css", "data-image-lightbox-scope"],
    ];
    for (const [stylesheet, hook] of stylesheetMap) {
      if (html.includes(`href="${stylesheet}"`) !== html.includes(hook)) problems.push(`${fromUrl}: inclusione non coerente ${stylesheet} / ${hook}`);
    }

    if (html.includes("data-image-lightbox-scope")) {
      if (!html.includes("data-full-src=")) problems.push(`${fromUrl}: lightbox senza sorgente completa differita`);
      if (!html.includes('href="/css/image-lightbox.css"')) problems.push(`${fromUrl}: CSS lightbox assente`);
    }
  }

  for (const file of walk(path.join(SITE, "immagini")).filter((item) => /\.(?:png|jpe?g|webp|avif)$/i.test(item))) {
    const ext = path.extname(file).slice(1).toLowerCase();
    const meta = await sharp(file).metadata();
    const normalized = ext === "jpg" ? "jpeg" : ext;
    if (meta.format !== normalized) problems.push(`${path.relative(SITE, file)}: estensione ${ext}, formato ${meta.format}`);
    checkedFormats.add(meta.format);
  }

  assert.ok(responsiveImages > 0, "nessuna immagine responsive generata");
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log(`[verify:output] OK — ${urls.length} URL verificati, ${checkedReferences} riferimenti, ${responsiveImages} immagini responsive; formati ${[...checkedFormats].sort().join(", ")}.`);
}

main().catch((error) => {
  console.error(`[verify:output] ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
