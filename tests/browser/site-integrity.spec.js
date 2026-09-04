"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const SITE = path.resolve(__dirname, "..", "..", "_site");
const ORIGIN = "http://127.0.0.1:4173";
const IDREF_ATTRIBUTES = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-activedescendant",
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageUrl(file) {
  const relative = path.relative(SITE, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

if (!fs.existsSync(SITE)) throw new Error("output _site assente: eseguire npm run build prima dei test browser");
const pages = walk(SITE).filter((file) => file.endsWith(".html")).map(pageUrl).sort();

async function checkPage(page, url) {
  const blockedOrigins = new Set();
  const runtimeErrors = [];
  const consoleErrors = [];
  const requestErrors = [];
  const responseErrors = [];

  await page.route("**/*", async (route) => {
    const target = new URL(route.request().url());
    if (/^https?:$/.test(target.protocol) && target.origin !== ORIGIN) {
      blockedOrigins.add(target.origin);
      await route.abort("blockedbyclient");
    } else {
      await route.continue();
    }
  });

  page.on("pageerror", (error) => runtimeErrors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const source = message.location().url;
    if (source && /^https?:/i.test(source) && new URL(source).origin !== ORIGIN) return;
    if (blockedOrigins.size && /Failed to load resource: net::ERR_FAILED/i.test(message.text())) return;
    consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    const target = new URL(response.url());
    if (target.origin === ORIGIN && (response.status() === 404 || response.status() >= 500)) {
      responseErrors.push(`${response.status()} ${target.pathname}`);
    }
  });
  page.on("requestfailed", (request) => {
    const target = new URL(request.url());
    if (target.origin === ORIGIN) {
      requestErrors.push(`${request.failure()?.errorText || "request failed"} ${target.pathname}`);
    }
  });

  const response = await page.goto(url, { waitUntil: "load" });
  expect(response && response.ok(), `${url} deve rispondere con successo`).toBe(true);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const integrity = await page.evaluate((attributes) => {
    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
    const seen = new Set();
    const duplicates = [];
    for (const id of ids) {
      if (seen.has(id) && !duplicates.includes(id)) duplicates.push(id);
      seen.add(id);
    }

    const missing = [];
    for (const attribute of attributes) {
      for (const element of document.querySelectorAll(`[${attribute}]`)) {
        const references = (element.getAttribute(attribute) || "").trim().split(/\s+/).filter(Boolean);
        for (const reference of references) {
          if (!document.getElementById(reference)) {
            missing.push(`${attribute}="${reference}" on ${element.tagName.toLowerCase()}`);
          }
        }
      }
    }
    return { duplicates, missing };
  }, IDREF_ATTRIBUTES);

  expect(integrity.duplicates, `${url}: ID duplicati`).toEqual([]);
  expect(integrity.missing, `${url}: riferimenti ARIA mancanti`).toEqual([]);
  expect(runtimeErrors, `${url}: errori JavaScript non gestiti`).toEqual([]);
  expect(consoleErrors, `${url}: errori console pertinenti`).toEqual([]);
  expect(requestErrors, `${url}: richieste locali fallite`).toEqual([]);
  expect(responseErrors, `${url}: risposte locali 404/5xx`).toEqual([]);
}

for (const context of [
  { name: "desktop", viewport: { width: 1366, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
]) {
  test.describe(`integrità site-wide ${context.name}`, () => {
    test.use({ viewport: context.viewport });
    for (const url of pages) {
      test(url, async ({ page }) => checkPage(page, url));
    }
  });
}
