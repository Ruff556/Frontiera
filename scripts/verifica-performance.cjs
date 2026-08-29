#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");
const outputArg = process.argv.indexOf("--json");
const outputFile = outputArg >= 0 ? process.argv[outputArg + 1] : null;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function publicPath(file) {
  return "/" + path.relative(SITE, file).split(path.sep).join("/");
}

function cleanUrl(value) {
  if (!value || /^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(value)) return null;
  const clean = value.split("#", 1)[0].split("?", 1)[0];
  if (!clean.startsWith("/")) return null;
  return decodeURI(clean);
}

function assetFile(url) {
  const clean = cleanUrl(url);
  if (!clean) return null;
  const rel = clean.replace(/^\/+/, "").split("/").join(path.sep);
  const full = path.resolve(SITE, rel);
  return full.startsWith(SITE + path.sep) ? full : null;
}

function compression(bytes) {
  return {
    raw: bytes.length,
    gzip: zlib.gzipSync(bytes, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(bytes, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function addSize(target, size) {
  target.raw += size.raw;
  target.gzip += size.gzip;
  target.brotli += size.brotli;
}

function extractUrls(html) {
  const urls = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<link\b[^>]*\brel=["'][^"']*stylesheet[^"']*["'][^>]*\bhref=["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'][^"']*stylesheet[^"']*["']/gi,
    /<(?:img|image)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = cleanUrl(match[1]);
      if (value) urls.add(value);
    }
  }
  for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(",")) {
      const value = cleanUrl(candidate.trim().split(/\s+/, 1)[0]);
      if (value) urls.add(value);
    }
  }
  return urls;
}

function extractCssUrls(css) {
  const urls = new Set();
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const value = cleanUrl(match[1]);
    if (value) urls.add(value);
  }
  return urls;
}

function kindFromUrl(url) {
  const ext = path.posix.extname(url).toLowerCase();
  if (ext === ".html" || ext === ".xml") return "html";
  if (ext === ".css") return "css";
  if (ext === ".js") return "js";
  if ([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"].includes(ext)) return "image";
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) return "font";
  return "other";
}

function pageUrl(file) {
  let rel = path.relative(SITE, file).split(path.sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

async function main() {
  if (!fs.existsSync(SITE)) throw new Error(`Output assente: ${SITE}`);

  const files = walk(SITE);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const textFiles = files.filter((file) => /\.(?:html|css|js)$/.test(file));
  const textCompression = { html: { raw: 0, gzip: 0, brotli: 0 }, css: { raw: 0, gzip: 0, brotli: 0 }, js: { raw: 0, gzip: 0, brotli: 0 } };
  for (const file of textFiles) {
    const type = path.extname(file).slice(1);
    addSize(textCompression[type], compression(fs.readFileSync(file)));
  }

  const cssDependencies = new Map();
  for (const file of files.filter((item) => item.endsWith(".css"))) {
    cssDependencies.set(publicPath(file), extractCssUrls(fs.readFileSync(file, "utf8")));
  }

  const imageMetadata = {};
  const sourceImages = walk(path.join(ROOT, "src", "immagini")).filter((file) =>
    /\.(?:jpe?g|png|webp|avif|gif|svg)$/i.test(file)
  );
  for (const file of sourceImages) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    const ext = path.extname(file).slice(1).toLowerCase();
    let meta;
    if (ext === "svg") {
      const svg = fs.readFileSync(file, "utf8");
      const viewBox = svg.match(/\bviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)["']/i);
      meta = {
        width: viewBox ? Number(viewBox[1]) : null,
        height: viewBox ? Number(viewBox[2]) : null,
        pages: 1,
        format: "svg",
      };
    } else {
      meta = await sharp(file, { animated: true }).metadata();
    }
    imageMetadata[rel] = {
      bytes: fs.statSync(file).size,
      width: meta.width || null,
      height: meta.height || null,
      pages: meta.pages || 1,
      format: meta.format || null,
      extension: ext,
      mismatch: Boolean(meta.format && !(["jpg", "jpeg"].includes(ext) && meta.format === "jpeg") && ext !== meta.format),
      decodedBytes: meta.width && meta.height ? meta.width * meta.height * 4 * (meta.pages || 1) : null,
    };
  }

  const missing = new Set();
  const pages = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const direct = extractUrls(html);
    const allAssets = new Set(direct);
    for (const url of direct) {
      if (url.endsWith(".css")) {
        for (const dependency of cssDependencies.get(url) || []) allAssets.add(dependency);
      }
    }

    const byKind = { html: fs.statSync(file).size, css: 0, js: 0, image: 0, font: 0, other: 0 };
    let decodedBytes = 0;
    const imageUrls = [];
    for (const url of allAssets) {
      const disk = assetFile(url);
      if (!disk || !fs.existsSync(disk) || !fs.statSync(disk).isFile()) {
        missing.add(`${pageUrl(file)} -> ${url}`);
        continue;
      }
      const kind = kindFromUrl(url);
      byKind[kind] += fs.statSync(disk).size;
      if (kind === "image") {
        imageUrls.push(url);
        if (!url.endsWith(".svg")) {
          const meta = await sharp(disk, { animated: true }).metadata();
          if (meta.width && meta.height) decodedBytes += meta.width * meta.height * 4 * (meta.pages || 1);
        }
      }
    }
    pages.push({
      url: pageUrl(file),
      assets: [...allAssets].sort(),
      imageUrls: imageUrls.sort(),
      imageCount: imageUrls.length,
      decodedBytes,
      byKind,
      totalBytes: Object.values(byKind).reduce((sum, value) => sum + value, 0),
    });
  }
  pages.sort((a, b) => b.totalBytes - a.totalBytes || a.url.localeCompare(b.url));

  const result = {
    generatedAt: new Date().toISOString(),
    measurement: "static-declared-asset-universe",
    measurementNote: "Ogni pagina include tutte le candidate srcset e image-set dichiarate; non equivale al trasferimento di una singola visita.",
    site: {
      htmlPages: htmlFiles.length,
      files: files.length,
      bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0),
      urls: pages.map((page) => page.url).sort(),
    },
    textCompression,
    images: imageMetadata,
    pages,
    missing: [...missing].sort(),
  };

  if (outputFile) {
    const target = path.resolve(ROOT, outputFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(result, null, 2) + "\n");
    console.log(`[performance] snapshot scritto: ${path.relative(ROOT, target)}`);
  }

  const home = pages.find((page) => page.url === "/");
  console.log(`[performance] ${htmlFiles.length} pagine HTML; ${files.length} file pubblici; mancanti: ${missing.size}`);
  if (home) {
    console.log(`[performance] home, universo dichiarato (tutte le candidate srcset/image-set): ${(home.totalBytes / 1048576).toFixed(2)} MiB; immagini ${(home.byKind.image / 1048576).toFixed(2)} MiB; JS ${(home.byKind.js / 1024).toFixed(1)} KiB; decode ${(home.decodedBytes / 1048576).toFixed(1)} MiB`);
  }
  console.log("[performance] universi dichiarati più ampi (non trasferimento per visita):");
  pages.slice(0, 8).forEach((page) => {
    console.log(`  ${(page.totalBytes / 1048576).toFixed(2).padStart(6)} MiB  ${page.url}`);
  });
  if (missing.size) {
    console.error("[performance] riferimenti mancanti:\n  " + [...missing].join("\n  "));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
