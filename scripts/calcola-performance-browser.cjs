#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");
const INPUT = path.join(ROOT, "reports", "performance-browser-input.json");
const OUTPUT = path.join(ROOT, "reports", "performance-browser.json");

function diskPath(publicUrl) {
  const pathname = decodeURI(new URL(publicUrl, "https://frontiera.invalid").pathname);
  return path.join(SITE, ...pathname.replace(/^\/+/, "").split("/"));
}

function pageFile(pageUrl) {
  return pageUrl === "/"
    ? path.join(SITE, "index.html")
    : path.join(SITE, ...pageUrl.replace(/^\/+|\/+$/g, "").split("/"), "index.html");
}

function parseSrcset(value) {
  return String(value || "").split(",").map((item) => {
    const match = item.trim().match(/^(\S+)\s+(\d+)w$/);
    return match ? { url: match[1], width: Number(match[2]) } : null;
  }).filter(Boolean).sort((a, b) => a.width - b.width);
}

function widthFromUrl(url) {
  const match = String(url).match(/-(\d+)\.[a-z0-9]+$/i);
  return match ? Number(match[1]) : 0;
}

function pick(candidates, target) {
  return (candidates.find((candidate) => candidate.width >= target) || candidates.at(-1))?.url || null;
}

function selectedImages(record, dpr) {
  const urls = new Set(record.svgImages || []);
  for (const image of record.images) {
    const candidates = parseSrcset(image.srcset);
    if (!candidates.length) {
      urls.add(image.current);
      continue;
    }
    const currentWidth = widthFromUrl(image.current);
    const dpr1Width = candidates.some((candidate) => candidate.url === image.current)
      ? currentWidth
      : (candidates.find((candidate) => candidate.width >= image.displayWidth)?.width || candidates.at(-1).width);
    urls.add(dpr === 1 ? pick(candidates, dpr1Width) : pick(candidates, dpr1Width * dpr));
  }
  const backgrounds = [...String(record.background || "").matchAll(/url\(["']?([^"')]+)["']?\)\s*(\d+(?:\.\d+)?)(?:dppx|x)/gi)]
    .map((match) => ({ url: new URL(match[1], "https://frontiera.invalid").pathname, dpr: Number(match[2]) }));
  if (backgrounds.length) urls.add((backgrounds.find((item) => item.dpr === dpr) || backgrounds.at(-1)).url);
  return [...urls].filter(Boolean).sort();
}

function compression(file) {
  const bytes = fs.readFileSync(file);
  return {
    raw: bytes.length,
    gzip: zlib.gzipSync(bytes, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(bytes, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

async function imageTotals(urls) {
  let bytes = 0;
  let decodedBytes = 0;
  const files = [];
  for (const url of urls) {
    const file = diskPath(url);
    if (!fs.existsSync(file)) throw new Error(`asset misurato assente: ${url}`);
    const size = fs.statSync(file).size;
    let decoded = 0;
    if (!file.endsWith(".svg")) {
      const meta = await sharp(file, { animated: true }).metadata();
      if (meta.width && meta.height) decoded = meta.width * meta.height * 4 * (meta.pages || 1);
    }
    bytes += size;
    decodedBytes += decoded;
    files.push({ url, bytes: size, decodedBytes: decoded });
  }
  return { count: urls.length, bytes, decodedBytes, files };
}

async function main() {
  const records = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const output = [];
  for (const record of records) {
    const textUrls = {
      html: [record.url],
      css: [...new Set(record.styles)],
      js: [...new Set(record.scripts)],
      font: [...new Set(record.resourceFonts)],
    };
    const text = {};
    for (const [kind, urls] of Object.entries(textUrls)) {
      const totals = { raw: 0, gzip: 0, brotli: 0 };
      for (const url of urls) {
        const file = kind === "html" ? pageFile(url) : diskPath(url);
        const value = kind === "font"
          ? { raw: fs.statSync(file).size, gzip: fs.statSync(file).size, brotli: fs.statSync(file).size }
          : compression(file);
        for (const key of Object.keys(totals)) totals[key] += value[key];
      }
      text[kind] = totals;
    }
    const dpr1 = await imageTotals(selectedImages(record, 1));
    const dpr2 = await imageTotals(selectedImages(record, 2));
    const nonImageRaw = Object.values(text).reduce((sum, item) => sum + item.raw, 0);
    output.push({
      url: record.url,
      viewport: record.requestedViewport,
      devicePixelRatioObserved: record.viewport.dpr,
      text,
      dpr1: { ...dpr1, totalBytes: nonImageRaw + dpr1.bytes },
      dpr2Estimate: { ...dpr2, totalBytes: nonImageRaw + dpr2.bytes },
    });
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`[performance:browser] ${output.length} misure scritte in ${path.relative(ROOT, OUTPUT)}`);
  for (const item of output.filter((entry) => entry.viewport.width === 1366 || (entry.url === "/" && entry.viewport.width !== 1366))) {
    console.log(`${String(item.viewport.width).padStart(4)} px  ${item.url.padEnd(68)} immagini DPR1 ${(item.dpr1.bytes / 1048576).toFixed(2)} MiB; decode ${(item.dpr1.decodedBytes / 1048576).toFixed(1)} MiB; DPR2 stimato ${(item.dpr2Estimate.bytes / 1048576).toFixed(2)} MiB`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
