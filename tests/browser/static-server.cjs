#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const SITE = path.resolve(__dirname, "..", "..", "_site");
const PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function insideSite(candidate) {
  const relative = path.relative(SITE, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function publishedFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^\/+/, "");
  const direct = path.resolve(SITE, relative);
  const candidates = decoded.endsWith("/")
    ? [path.join(direct, "index.html")]
    : path.extname(direct)
      ? [direct]
      : [direct, path.join(direct, "index.html")];

  for (const candidate of candidates) {
    if (!insideSite(candidate)) continue;
    try {
      if ((await fs.promises.stat(candidate)).isFile()) return candidate;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${HOST}:${PORT}`).pathname;
    const file = await publishedFile(pathname);
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const stats = await fs.promises.stat(file);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": stats.size,
      "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.message);
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`[static-server] http://${HOST}:${PORT}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
