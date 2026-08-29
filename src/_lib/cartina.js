"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Profilo geometrico della base NordNordWest.
 *
 * La carta è equirettangolare, con stiramento verticale del 150% già
 * incorporato nel rapporto 1920 × 1290. Base raster e geometrie SVG usano
 * quindi lo stesso spazio nativo, senza un secondo sistema normalizzato.
 */
const MAP = Object.freeze({
  west: 21.5,
  east: 40.7,
  north: 52.7,
  south: 44.1,
  viewBoxX: 0,
  viewBoxY: 0,
  viewBoxWidth: 1920,
  viewBoxHeight: 1290,
});

// Fattore di migrazione dei soli parametri grafici dal precedente viewBox
// 100 × 67.1875 allo spazio nativo. Non interviene nella georeferenziazione.
const VISUAL_SCALE = MAP.viewBoxWidth / 100;
const visual = (value) => value * VISUAL_SCALE;

const HOTSPOT = Object.freeze({
  ringRadius: visual(0.92),
  coreRadius: visual(0.35),
  axisNodeRadius: visual(0.68),
});

const TERRITORY_DIR = path.join(__dirname, "..", "_data", "cartinaTerritori");
const TERRITORY_REPORT_PATH = path.join(__dirname, "..", "..", "reports", "territori-report.json");
const TERRITORY_STATES = Object.freeze({
  "controllo-russo": {
    label: "Controllo russo",
    className: "russian",
  },
  "controllo-ucraino-in-russia": {
    label: "Controllo ucraino",
    className: "ukrainian",
  },
  conteso: {
    label: "Area contesa",
    className: "contested",
  },
});

const TERRITORY_ORDER = Object.freeze([
  "controllo-russo",
  "controllo-ucraino-in-russia",
  "conteso",
]);

const territoryCache = new Map();

const OBLAST_LABELS = Object.freeze({
  "Chernihiv Oblast": "Černihiv",
  "Sumy Oblast": "Sumy",
  "Kyiv Oblast": "Kyiv",
  "Kharkiv Oblast": "Kharkiv",
  "Luhansk Oblast": "Luhansk",
  "Donetsk Oblast": "Donetsk",
  "Zaporizhia Oblast": "Zaporižžja",
  "Mykolaiv Oblast": "Mykolaiv",
  "Kherson Oblast": "Kherson",
});

const LABEL_POSITIONS = Object.freeze({
  destra: { dx: visual(1.8), dy: 0, anchor: "start", baseline: "middle" },
  sinistra: { dx: visual(-1.8), dy: 0, anchor: "end", baseline: "middle" },
  sopra: { dx: 0, dy: visual(-1.55), anchor: "middle", baseline: "auto" },
  sotto: { dx: 0, dy: visual(1.75), anchor: "middle", baseline: "hanging" },
  "alto-destra": { dx: visual(1.5), dy: visual(-1.3), anchor: "start", baseline: "auto" },
  "alto-sinistra": { dx: visual(-1.5), dy: visual(-1.3), anchor: "end", baseline: "auto" },
  "basso-destra": { dx: visual(1.5), dy: visual(1.4), anchor: "start", baseline: "hanging" },
  "basso-sinistra": { dx: visual(-1.5), dy: visual(1.4), anchor: "end", baseline: "hanging" },
});

function fail(message) {
  throw new Error(`[cartina] ${message}`);
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${label} deve essere un numero finito.`);
  return number;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Mantiene i calcoli a piena precisione e limita la formattazione al solo
 * confine di serializzazione SVG.
 */
function formatNumber(value, precision = 6) {
  const number = finiteNumber(value, "valore SVG");
  const normalized = Math.abs(number) < 1e-12 ? 0 : number;
  return normalized.toFixed(precision).replace(/\.?0+$/, "");
}

/**
 * Proiezione equirettangolare lineare WGS84 -> spazio nativo 1920 × 1290.
 * Lo stiramento verticale della carta è già rappresentato dal viewBox.
 */
function project(lon, lat, label = "coordinata") {
  const xLon = finiteNumber(lon, `${label}.lon`);
  const yLat = finiteNumber(lat, `${label}.lat`);

  if (xLon < MAP.west || xLon > MAP.east || yLat < MAP.south || yLat > MAP.north) {
    fail(
      `${label} (${yLat}, ${xLon}) cade fuori dai limiti della carta ` +
        `(lat ${MAP.south}–${MAP.north}; lon ${MAP.west}–${MAP.east}).`
    );
  }

  return {
    x:
      MAP.viewBoxX +
      ((xLon - MAP.west) / (MAP.east - MAP.west)) * MAP.viewBoxWidth,
    y:
      MAP.viewBoxY +
      ((MAP.north - yLat) / (MAP.north - MAP.south)) * MAP.viewBoxHeight,
  };
}

function placeById(id, places, context) {
  if (!id || typeof id !== "string") fail(`${context}: manca l'identificatore del luogo.`);
  const place = places && places[id];
  if (!place) fail(`${context}: luogo “${id}” non presente in cartinaLuoghi.json.`);
  return {
    id,
    name: place.nome || id,
    ...project(place.lon, place.lat, `luogo ${id}`),
  };
}

function labelPlacement(item, origin, context) {
  const key = item.posizioneEtichetta;
  const preset = LABEL_POSITIONS[key];
  if (!preset) {
    fail(
      `${context}: posizioneEtichetta “${key ?? ""}” non valida. ` +
        `Valori ammessi: ${Object.keys(LABEL_POSITIONS).join(", ")}.`
    );
  }

  // Gli scostamenti dichiarativi esistenti erano espressi nello spazio visivo
  // precedente: vengono convertiti una sola volta nello spazio nativo.
  const nudge = item.scostamentoEtichetta || {};
  const nudgeX = visual(finiteNumber(nudge.x ?? 0, `${context}.scostamentoEtichetta.x`));
  const nudgeY = visual(finiteNumber(nudge.y ?? 0, `${context}.scostamentoEtichetta.y`));

  return {
    x: origin.x + preset.dx + nudgeX,
    y: origin.y + preset.dy + nudgeY,
    anchor: preset.anchor,
    baseline: preset.baseline,
  };
}

function renderLabel(text, origin, placement, extraClass = "") {
  const label = escapeHtml(text);
  const leaderEndX = origin.x + (placement.x - origin.x) * 0.68;
  const leaderEndY = origin.y + (placement.y - origin.y) * 0.68;
  return [
    `<path class="phase-label-leader" d="M ${formatNumber(origin.x)} ${formatNumber(origin.y)} L ${formatNumber(leaderEndX)} ${formatNumber(leaderEndY)}"/>`,
    `<text class="phase-map-label${extraClass ? ` ${extraClass}` : ""}" x="${formatNumber(placement.x)}" y="${formatNumber(placement.y)}" text-anchor="${placement.anchor}" dominant-baseline="${placement.baseline}">${label}</text>`,
  ].join("\n");
}

function renderPoint(item, places, index) {
  const context = `hotspot ${index + 1}`;
  const point = placeById(item.luogo, places, context);
  const text = item.etichetta || point.name;
  const label = labelPlacement(item, point, context);

  return [
    `<g class="phase-hotspot phase-hotspot--point" data-luogo="${escapeHtml(point.id)}">`,
    `<circle class="phase-hotspot-ring" cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="${formatNumber(HOTSPOT.ringRadius)}"/>`,
    `<circle class="phase-hotspot-core" cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="${formatNumber(HOTSPOT.coreRadius)}"/>`,
    renderLabel(text, point, label),
    `</g>`,
  ].join("\n");
}

function renderAxis(item, places, index) {
  const context = `asse ${index + 1}`;
  const start = placeById(item.da, places, `${context}.da`);
  const end = placeById(item.a, places, `${context}.a`);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const label = labelPlacement(item, midpoint, context);
  const text = item.etichetta || `${start.name}–${end.name}`;

  return [
    `<g class="phase-hotspot phase-hotspot--axis" data-da="${escapeHtml(start.id)}" data-a="${escapeHtml(end.id)}">`,
    `<path class="phase-axis" d="M ${formatNumber(start.x)} ${formatNumber(start.y)} L ${formatNumber(end.x)} ${formatNumber(end.y)}" marker-end="url(#cartina-arrow)"/>`,
    `<circle class="phase-axis-node" cx="${formatNumber(start.x)}" cy="${formatNumber(start.y)}" r="${formatNumber(HOTSPOT.axisNodeRadius)}"/>`,
    `<circle class="phase-axis-node" cx="${formatNumber(end.x)}" cy="${formatNumber(end.y)}" r="${formatNumber(HOTSPOT.axisNodeRadius)}"/>`,
    renderLabel(text, midpoint, label, "phase-map-label--axis"),
    `</g>`,
  ].join("\n");
}

function geometryLines(geometry, context) {
  if (!geometry || typeof geometry !== "object") fail(`${context}: geometria GeoJSON assente.`);
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  fail(`${context}: geometria ${geometry.type || "sconosciuta"} non supportata; usare LineString o MultiLineString.`);
}

function datasetFeatures(dataset, context) {
  if (!dataset || typeof dataset !== "object") fail(`${context}: dataset GeoJSON assente.`);
  if (dataset.type === "FeatureCollection") return dataset.features || [];
  if (dataset.type === "Feature") return [dataset];
  if (dataset.type === "LineString" || dataset.type === "MultiLineString") {
    return [{ type: "Feature", properties: {}, geometry: dataset }];
  }
  fail(`${context}: tipo GeoJSON ${dataset.type || "sconosciuto"} non supportato.`);
}

function territoryDataset(config) {
  if (!config) return null;
  const key = config.dataset;
  if (!key || typeof key !== "string") fail("territori.dataset è obbligatorio.");
  if (!/^[a-z0-9-]+$/.test(key)) fail(`territori.dataset “${key}” non è un identificatore valido.`);
  if (territoryCache.has(key)) return territoryCache.get(key);
  const filePath = path.join(TERRITORY_DIR, `${key}.geojson`);
  if (!fs.existsSync(filePath)) fail(`dataset territoriale “${key}” non trovato.`);
  const dataset = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (dataset.type !== "FeatureCollection") fail(`dataset territoriale “${key}” non è una FeatureCollection.`);
  territoryCache.set(key, dataset);
  return dataset;
}

function geometryPolygons(geometry, context) {
  if (!geometry || typeof geometry !== "object") fail(`${context}: geometria GeoJSON assente.`);
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  fail(`${context}: geometria ${geometry.type || "sconosciuta"} non supportata; usare Polygon o MultiPolygon.`);
}

function territoryLabel(stato) {
  const definition = TERRITORY_STATES[stato];
  if (!definition) fail(`stato territoriale “${stato ?? ""}” non supportato.`);
  return definition;
}

function ringToPath(ring, context) {
  if (!Array.isArray(ring) || ring.length < 4) fail(`${context}: anello con meno di quattro coordinate.`);
  return ring
    .map((coordinate, index) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) {
        fail(`${context}, coordinata ${index + 1}: formato [lon, lat] non valido.`);
      }
      const point = project(coordinate[0], coordinate[1], `${context}, coordinata ${index + 1}`);
      return `${index === 0 ? "M" : "L"} ${formatNumber(point.x)} ${formatNumber(point.y)}`;
    })
    .join(" ") + " Z";
}

function featureCoordinates(feature) {
  return geometryPolygons(feature.geometry, `feature ${feature.id || feature.properties?.id || "territoriale"}`)
    .flatMap((polygon) => polygon)
    .flatMap((ring) => ring);
}

function featureBounds(feature) {
  const coordinates = featureCoordinates(feature);
  return coordinates.reduce(
    (bounds, coordinate) => ({
      west: Math.min(bounds.west, coordinate[0]),
      east: Math.max(bounds.east, coordinate[0]),
      south: Math.min(bounds.south, coordinate[1]),
      north: Math.max(bounds.north, coordinate[1]),
    }),
    { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }
  );
}

// Area geodetica sferica: stessa famiglia di calcolo usata da Turf/Chamberlain–Duquette.
function ringArea(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return 0;
  const radians = Math.PI / 180;
  const earthRadius = 6371008.8;
  let total = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    // L'ultimo elemento duplica il primo: il precedente di index 0 è quindi
    // ring.length - 2, non index 0. Il vecchio modulo dimezzava circa le aree.
    const lower = ring[(index + ring.length - 2) % (ring.length - 1)];
    const middle = ring[index];
    const upper = ring[(index + 1) % (ring.length - 1)];
    total += (upper[0] - lower[0]) * radians * Math.sin(middle[1] * radians);
  }
  return (total * earthRadius * earthRadius) / 2;
}

function geometryArea(geometry) {
  return geometryPolygons(geometry, "calcolo area").reduce((total, polygon) => {
    const exterior = Math.abs(ringArea(polygon[0]));
    const holes = polygon.slice(1).reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0);
    return total + exterior - holes;
  }, 0);
}

function renderTerritoryDebug(feature, featureIndex) {
  if (process.env.CARTINA_DEBUG !== "1") return "";
  const bounds = featureBounds(feature);
  const topLeft = project(bounds.west, bounds.north, "debug bounding box");
  const bottomRight = project(bounds.east, bounds.south, "debug bounding box");
  const id = feature.id || feature.properties?.id || `feature-${featureIndex + 1}`;
  const vertices = featureCoordinates(feature)
    .map((coordinate) => project(coordinate[0], coordinate[1], `debug ${id}`))
    .map(
      (point) =>
        `<circle class="phase-territory-debug-vertex" cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="2.4"/>`
    )
    .join("");
  const areaKm2 = geometryArea(feature.geometry) / 1_000_000;
  return [
    `<g class="phase-territory-debug" data-feature="${escapeHtml(id)}">`,
    `<rect x="${formatNumber(topLeft.x)}" y="${formatNumber(topLeft.y)}" width="${formatNumber(bottomRight.x - topLeft.x)}" height="${formatNumber(bottomRight.y - topLeft.y)}"/>`,
    vertices,
    `<text x="${formatNumber(topLeft.x + 8)}" y="${formatNumber(topLeft.y + 20)}">${escapeHtml(id)} · ${formatNumber(areaKm2, 1)} km²</text>`,
    `</g>`,
  ].join("");
}

function renderTerritories(config) {
  if (!config) return { markup: "", debug: "" };
  const dataset = territoryDataset(config);
  const paths = [];
  const debug = [];
  dataset.features.forEach((feature, featureIndex) => {
    const stato = feature.properties?.stato;
    const definition = territoryLabel(stato);
    const id = feature.id || feature.properties?.id || `territorio-${featureIndex + 1}`;
    const data = feature.properties?.data || dataset.metadata?.dataCartografica || "";
    const d = geometryPolygons(feature.geometry, `feature ${id}`)
      .flatMap((polygon, polygonIndex) =>
        polygon.map((ring, ringIndex) => ringToPath(ring, `feature ${id}, poligono ${polygonIndex + 1}, anello ${ringIndex + 1}`))
      )
      .join(" ");
    paths.push(
      `<path class="phase-territory phase-territory--${definition.className}" data-stato="${escapeHtml(stato)}" data-feature="${escapeHtml(id)}" d="${d}" fill-rule="evenodd"><title>${escapeHtml(definition.label)} — ${escapeHtml(data)}</title></path>`
    );
    debug.push(renderTerritoryDebug(feature, featureIndex));
  });
  return { markup: paths.join("\n"), debug: debug.join("\n") };
}

function renderDebugGrid() {
  if (process.env.CARTINA_DEBUG !== "1") return "";
  const lines = [];
  for (let lon = Math.ceil(MAP.west); lon <= Math.floor(MAP.east); lon += 1) {
    const start = project(lon, MAP.north, "reticolo longitudine");
    const end = project(lon, MAP.south, "reticolo longitudine");
    lines.push(`<path d="M ${formatNumber(start.x)} ${formatNumber(start.y)} L ${formatNumber(end.x)} ${formatNumber(end.y)}"/>`);
  }
  for (let lat = Math.ceil(MAP.south); lat <= Math.floor(MAP.north); lat += 1) {
    const start = project(MAP.west, lat, "reticolo latitudine");
    const end = project(MAP.east, lat, "reticolo latitudine");
    lines.push(`<path d="M ${formatNumber(start.x)} ${formatNumber(start.y)} L ${formatNumber(end.x)} ${formatNumber(end.y)}"/>`);
  }
  return `<g class="phase-territory-debug-grid">${lines.join("")}</g>`;
}

function cartinaCategories(cartina) {
  const dataset = territoryDataset(cartina?.territori);
  if (!dataset) return [];
  const present = new Set(dataset.features.map((feature) => feature.properties?.stato));
  return TERRITORY_ORDER.filter((stato) => present.has(stato)).map((stato) => ({
    stato,
    etichetta: TERRITORY_STATES[stato].label,
    classe: TERRITORY_STATES[stato].className,
  }));
}

function formatTerritoryPercentage(value) {
  if (value > 0 && value < 1) return "<1%";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : String(rounded).replace(".", ",")}%`;
}

function cartinaTerritorySummary(cartina) {
  const dataset = cartina?.territori?.dataset;
  if (!dataset) return "";
  if (!fs.existsSync(TERRITORY_REPORT_PATH)) {
    fail("report territoriale assente; eseguire verify:territori prima della build.");
  }
  const report = JSON.parse(fs.readFileSync(TERRITORY_REPORT_PATH, "utf8"));
  const snapshot = (report.reports || []).find((item) => item.dataset === dataset);
  if (!snapshot) fail(`report territoriale per “${dataset}” non trovato.`);
  const hasEditorialReferences = (snapshot.oblast || []).some(
    (item) => Number.isFinite(item.riferimentoEditorialePercento),
  );
  if (hasEditorialReferences && cartina?.datiTerritoriali) {
    return cartina.datiTerritoriali;
  }
  const relevant = (snapshot.oblast || [])
    .filter((item) => OBLAST_LABELS[item.oblast] && item.geometriaPercento > 0)
    .map((item) => `${OBLAST_LABELS[item.oblast]} ${formatTerritoryPercentage(item.geometriaPercento)}`);
  return relevant.length
    ? `Controllo russo calcolato sulla geometria: • ${relevant.join(" • ")}`
    : "Nessun oblast ucraino presenta controllo russo misurabile nella geometria alla data di riferimento.";
}

function cartinaAriaLabel(cartina, places) {
  const categories = cartinaCategories(cartina).map((item) => item.etichetta.toLowerCase());
  if (!categories.length && cartina?.lineaContatto) categories.push("linea di contatto");
  const hotspots = (Array.isArray(cartina?.hotspot) ? cartina.hotspot : []).map((item) => {
    if (item.etichetta) return item.etichetta;
    if (item.luogo && places?.[item.luogo]) return places[item.luogo].nome || item.luogo;
    return item.luogo || "hotspot";
  });
  const date = cartina?.dataRiferimento ? ` al ${cartina.dataRiferimento}` : "";
  const categoryText = categories.length ? ` con ${categories.join(", ")}` : "";
  const hotspotText = hotspots.length ? `; hotspot: ${hotspots.join(", ")}` : "";
  return `Carta amministrativa dell'Ucraina${date}${categoryText}${hotspotText}.`;
}

function renderFrontline(config, datasets) {
  if (!config) return "";
  const key = config.dataset;
  if (!key || typeof key !== "string") fail("lineaContatto.dataset è obbligatorio.");
  const dataset = datasets && datasets[key];
  if (!dataset) fail(`dataset “${key}” non presente in cartinaLinee.json.`);

  const paths = [];
  datasetFeatures(dataset, `dataset ${key}`).forEach((feature, featureIndex) => {
    geometryLines(feature.geometry, `dataset ${key}, feature ${featureIndex + 1}`).forEach((line, lineIndex) => {
      if (!Array.isArray(line) || line.length < 2) {
        fail(`dataset ${key}, linea ${lineIndex + 1}: servono almeno due coordinate.`);
      }
      const points = line.map((coordinate, coordinateIndex) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) {
          fail(`dataset ${key}, coordinata ${coordinateIndex + 1}: formato [lon, lat] non valido.`);
        }
        return project(coordinate[0], coordinate[1], `dataset ${key}, coordinata ${coordinateIndex + 1}`);
      });
      const d = points
        .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${formatNumber(point.x)} ${formatNumber(point.y)}`)
        .join(" ");
      paths.push(`<path class="phase-frontline" d="${d}"/>`);
    });
  });

  return paths.join("\n");
}

function renderCartinaSvg(cartina, places, datasets) {
  if (!cartina || typeof cartina !== "object") return "";
  const hotspots = Array.isArray(cartina.hotspot) ? cartina.hotspot : [];
  const hotspotMarkup = hotspots.map((item, index) => {
    if (!item || typeof item !== "object") fail(`hotspot ${index + 1}: configurazione non valida.`);
    if (item.tipo === "punto") return renderPoint(item, places, index);
    if (item.tipo === "asse") return renderAxis(item, places, index);
    fail(`hotspot ${index + 1}: tipo “${item.tipo ?? ""}” non supportato; usare punto o asse.`);
  });

  const territories = renderTerritories(cartina.territori);
  return [
    `<defs>`,
    `<marker id="cartina-arrow" viewBox="0 0 6 6" refX="5.1" refY="3" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M 0 0 L 6 3 L 0 6 z" class="phase-axis-arrow"/></marker>`,
    `<pattern id="cartina-pattern-russian" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(24)"><rect width="16" height="16" class="phase-pattern-russian-base"/><path d="M 0 0 V 16" class="phase-pattern-russian-line"/></pattern>`,
    `<pattern id="cartina-pattern-ukrainian" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="16" height="16" class="phase-pattern-ukrainian-base"/><path d="M 0 0 V 16" class="phase-pattern-ukrainian-line"/></pattern>`,
    `<pattern id="cartina-pattern-contested" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" class="phase-pattern-contested-base"/><circle cx="3.5" cy="3.5" r="1.6" class="phase-pattern-contested-dot"/><circle cx="10.5" cy="10.5" r="1.6" class="phase-pattern-contested-dot"/></pattern>`,
    `</defs>`,
    renderDebugGrid(),
    `<g id="phase-territorial-layer">${territories.markup}</g>`,
    `<g id="phase-frontline-layer">${renderFrontline(cartina.lineaContatto, datasets)}</g>`,
    `<g id="phase-hotspot-layer">${hotspotMarkup.join("\n")}</g>`,
    `<g id="phase-territory-debug-layer">${territories.debug}</g>`,
  ].join("\n");
}

module.exports = {
  MAP,
  LABEL_POSITIONS,
  formatNumber,
  geometryArea,
  project,
  cartinaAriaLabel,
  cartinaCategories,
  cartinaTerritorySummary,
  territoryDataset,
  renderCartinaSvg,
};
