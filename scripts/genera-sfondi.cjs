#!/usr/bin/env node
"use strict";

const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const AMBIENTE = path.join(ROOT, "src", "immagini", "ambiente");

async function genera(Image, sourceName, width, outputName, quality) {
  const metadata = await Image(path.join(AMBIENTE, sourceName), {
    widths: [width],
    formats: ["webp"],
    outputDir: AMBIENTE,
    urlPath: "/immagini/ambiente/",
    useCache: false,
    sharpWebpOptions: { quality, effort: 6, smartSubsample: true },
    filenameFormat: () => outputName,
  });
  const result = metadata.webp[0];
  console.log(`[sfondo] ${outputName}: ${result.width}×${result.height}, ${(result.size / 1024).toFixed(1)} KiB`);
}

async function main() {
  const Image = (await import("@11ty/eleventy-img")).default;
  await Promise.all([
    genera(
      Image,
      "frontiera-background-desktop-3840x2160.webp",
      1920,
      "frontiera-background-desktop-1920x1080.webp",
      82
    ),
    genera(
      Image,
      "frontiera-background-mobile-1440x2560.webp",
      720,
      "frontiera-background-mobile-720x1280.webp",
      80
    ),
  ]);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
