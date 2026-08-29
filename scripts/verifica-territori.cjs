"use strict";

const fs = require("node:fs");
const path = require("node:path");
const polygonClipping = require("polygon-clipping");
const { MAP, geometryArea, project } = require("../src/_lib/cartina");

const ROOT = path.resolve(__dirname, "..");
const TERRITORY_DIR = path.join(ROOT, "src", "_data", "cartinaTerritori");
const OBLAST_PATH = path.join(TERRITORY_DIR, "confini", "oblast-ukraine.geojson");
const OFFICIAL_AREAS_PATH = path.join(
  TERRITORY_DIR,
  "confini",
  "oblast-ukraine-aree-ufficiali.json"
);
const REPORT_DIR = path.join(ROOT, "reports");
const DOCS_DIR = path.join(ROOT, "docs", "cartina-territori");
const ALLOWED_STATES = new Set(["controllo-russo", "controllo-ucraino-in-russia", "conteso"]);
const TARGET_OBLASTS = [
  "Chernihiv Oblast",
  "Sumy Oblast",
  "Kyiv Oblast",
  "Kharkiv Oblast",
  "Luhansk Oblast",
  "Donetsk Oblast",
  "Zaporizhia Oblast",
  "Mykolaiv Oblast",
  "Kherson Oblast",
];

// Riferimenti editoriali: sono un CONTROLLO a valle, mai un bersaglio
// geometrico. Nessuno script del progetto deve dedurre o correggere una
// geometria per avvicinarla a queste cifre. F0 non pubblica percentuali:
// i precedenti valori di confronto erano orfani e sono stati rimossi.
const EDITORIAL_REFERENCES = {
  "controllo-fase-1-2022-11-13": {
    "Kharkiv Oblast": 2,
    "Luhansk Oblast": 98,
    "Donetsk Oblast": 57,
    "Zaporizhia Oblast": 73,
    "Mykolaiv Oblast": 1,
    "Kherson Oblast": 72,
  },
  "controllo-fase-2-2023-09-30": {
    "Kharkiv Oblast": 2,
    "Luhansk Oblast": 98,
    "Donetsk Oblast": 57,
    "Zaporizhia Oblast": 72,
    "Mykolaiv Oblast": 1,
    "Kherson Oblast": 72,
  },
};

// Le percentuali del front matter sono arrotondate e provengono da una
// sintesi editoriale indipendente. La tolleranza ordinaria è ±2 punti.
// Kherson usa ±5 punti perché il riferimento ≈72% include una stima pubblica
// di 20.500 km², mentre i master Frontiera applicano il criterio più
// conservativo del controllo continuo e separano le aree contese.
const DEFAULT_EDITORIAL_TOLERANCE_PP = 2;
const EDITORIAL_TOLERANCES_PP = {
  "controllo-fase-1-2022-11-13": { "Kherson Oblast": 5 },
  "controllo-fase-2-2023-09-30": { "Kherson Oblast": 5 },
};

const SNAPSHOT_PAGES = {
  "controllo-fase-0-2022-03-24": "contenuti/fasi/0-prologo-manovra-fallita.md",
  "controllo-fase-1-2022-11-13": "contenuti/fasi/1-duello-logistico.md",
  "controllo-fase-2-2023-09-30": "contenuti/fasi/2-difesa-che-osserva.md",
  "controllo-fase-3-2024-08-14": "contenuti/fasi/3-occhio-che-diventa-arma.md",
  "controllo-fase-4-2025-03-13": "contenuti/fasi/4-nervo-fuori-dallo-spettro.md",
  "controllo-fase-5-2026-07-15": "contenuti/fasi/5-macchina-prima-delluomo.md",
};

// Fasi che devono possedere un master territoriale. Finché il dataset non
// esiste la pagina resta sul fallback della linea di contatto: il validatore
// non fallisce, ma lo dichiara a ogni build perché il debito resti visibile.
const EXPECTED_SNAPSHOTS = [
  ["controllo-fase-0-2022-03-24", "Fase 0"],
  ["controllo-fase-1-2022-11-13", "Fase 1"],
  ["controllo-fase-2-2023-09-30", "Fase 2"],
  ["controllo-fase-3-2024-08-14", "Fase 3"],
  ["controllo-fase-4-2025-03-13", "Fase 4"],
  ["controllo-fase-5-2026-07-15", "Fase 5"],
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function asMultiPolygon(geometry, context) {
  if (!geometry || typeof geometry !== "object") throw new Error(`${context}: geometria assente`);
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  throw new Error(`${context}: tipo ${geometry.type || "sconosciuto"} non ammesso`);
}

function sameCoordinate(a, b, epsilon = 1e-10) {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
}

function signedPlanarArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function orientation(a, b, c) {
  const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : -1;
}

function onSegment(a, b, c) {
  return (
    Math.min(a[0], c[0]) - 1e-12 <= b[0] &&
    b[0] <= Math.max(a[0], c[0]) + 1e-12 &&
    Math.min(a[1], c[1]) - 1e-12 <= b[1] &&
    b[1] <= Math.max(a[1], c[1]) + 1e-12
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function selfIntersections(ring) {
  const hits = [];
  const segmentCount = ring.length - 1;
  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (Math.abs(first - second) <= 1) continue;
      if (first === 0 && second === segmentCount - 1) continue;
      if (segmentsIntersect(ring[first], ring[first + 1], ring[second], ring[second + 1])) {
        hits.push([first, second]);
        if (hits.length >= 8) return hits;
      }
    }
  }
  return hits;
}

function validateFeature(feature, datasetDate, context, failures, stats) {
  if (!feature.properties || !ALLOWED_STATES.has(feature.properties.stato)) {
    failures.push(`${context}: stato non valido`);
  }
  if (feature.properties?.data !== datasetDate) {
    failures.push(`${context}: data feature ${feature.properties?.data ?? "assente"} diversa da ${datasetDate}`);
  }
  const multiPolygon = asMultiPolygon(feature.geometry, context);
  multiPolygon.forEach((polygon, polygonIndex) => {
    if (!Array.isArray(polygon) || !polygon.length) failures.push(`${context}, poligono ${polygonIndex + 1}: vuoto`);
    polygon.forEach((ring, ringIndex) => {
      const ringContext = `${context}, poligono ${polygonIndex + 1}, anello ${ringIndex + 1}`;
      if (!Array.isArray(ring) || ring.length < 4) {
        failures.push(`${ringContext}: meno di quattro coordinate`);
        return;
      }
      if (!sameCoordinate(ring[0], ring.at(-1))) failures.push(`${ringContext}: anello non chiuso`);
      const planarArea = signedPlanarArea(ring);
      if (Math.abs(planarArea) < 1e-12) failures.push(`${ringContext}: area planare nulla`);
      if (ringIndex === 0 && planarArea < 0) failures.push(`${ringContext}: anello esterno non antiorario`);
      if (ringIndex > 0 && planarArea > 0) failures.push(`${ringContext}: foro non orario`);
      ring.forEach((coordinate, coordinateIndex) => {
        if (
          !Array.isArray(coordinate) ||
          coordinate.length < 2 ||
          !Number.isFinite(coordinate[0]) ||
          !Number.isFinite(coordinate[1])
        ) {
          failures.push(`${ringContext}, coordinata ${coordinateIndex + 1}: [lon, lat] non numerica`);
          return;
        }
        const [lon, lat] = coordinate;
        if (lon < MAP.west || lon > MAP.east || lat < MAP.south || lat > MAP.north) {
          failures.push(`${ringContext}, coordinata ${coordinateIndex + 1}: fuori dominio cartografico`);
          return;
        }
        try {
          project(lon, lat, ringContext);
          stats.vertices += 1;
        } catch (error) {
          failures.push(error.message);
        }
      });
      const intersections = selfIntersections(ring);
      if (intersections.length) {
        failures.push(`${ringContext}: ${intersections.length} autointersezione/i (${JSON.stringify(intersections)})`);
      }
    });
  });
  const area = geometryArea(feature.geometry);
  if (!Number.isFinite(area) || area <= 0) failures.push(`${context}: superficie geodetica nulla o non valida`);
  stats.areaByState[feature.properties?.stato] = (stats.areaByState[feature.properties?.stato] || 0) + area;
}

function unionFeatures(features) {
  const geometries = features.map((feature) => asMultiPolygon(feature.geometry, "unione"));
  if (!geometries.length) return [];
  return polygonClipping.union(...geometries);
}

function intersectionArea(first, second) {
  const intersection = polygonClipping.intersection(first, second);
  if (!intersection.length) return 0;
  return geometryArea({ type: "MultiPolygon", coordinates: intersection });
}

function classifyDifference(difference, tolerance = DEFAULT_EDITORIAL_TOLERANCE_PP) {
  const absolute = Math.abs(difference);
  if (absolute <= tolerance) return "coerente";
  if (absolute <= 5) return "da controllare";
  return "verifica obbligatoria";
}

function pageDateFor(datasetId, failures) {
  const relative = SNAPSHOT_PAGES[datasetId];
  if (!relative) return null;
  const text = fs.readFileSync(path.join(ROOT, relative), "utf8");
  const datasetMatch = text.match(/territori:\s*\n\s+dataset:\s*([^\s]+)\s*\n\s+data:\s*["']?([0-9-]+)/);
  if (!datasetMatch) {
    failures.push(`${relative}: territori.dataset/data non leggibili`);
    return null;
  }
  if (datasetMatch[1] !== datasetId) failures.push(`${relative}: richiama ${datasetMatch[1]} invece di ${datasetId}`);
  return datasetMatch[2];
}

function validateDataset(filePath, oblasts, officialAreas, failures) {
  const datasetId = path.basename(filePath, ".geojson");
  const dataset = readJson(filePath);
  const localFailures = [];
  const stats = { vertices: 0, areaByState: {} };
  if (dataset.type !== "FeatureCollection") localFailures.push(`${datasetId}: non è una FeatureCollection`);
  if (!Array.isArray(dataset.features) || !dataset.features.length) localFailures.push(`${datasetId}: features assenti`);
  const date = dataset.metadata?.dataCartografica;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) localFailures.push(`${datasetId}: data cartografica assente o non ISO`);
  if (!Array.isArray(dataset.metadata?.fonti) || !dataset.metadata.fonti.length) localFailures.push(`${datasetId}: fonti assenti`);
  const frontMatterDate = pageDateFor(datasetId, localFailures);
  if (frontMatterDate && frontMatterDate !== date) {
    localFailures.push(`${datasetId}: data front matter ${frontMatterDate} diversa da ${date}`);
  }

  (dataset.features || []).forEach((feature, index) => {
    try {
      validateFeature(feature, date, `${datasetId}, feature ${index + 1}`, localFailures, stats);
    } catch (error) {
      localFailures.push(error.message);
    }
  });

  for (let first = 0; first < dataset.features.length; first += 1) {
    for (let second = first + 1; second < dataset.features.length; second += 1) {
      const firstState = dataset.features[first].properties?.stato;
      const secondState = dataset.features[second].properties?.stato;
      if (firstState === secondState) continue;
      try {
        const overlap = intersectionArea(
          asMultiPolygon(dataset.features[first].geometry, "sovrapposizione"),
          asMultiPolygon(dataset.features[second].geometry, "sovrapposizione")
        );
        if (overlap > 1000) {
          localFailures.push(`${datasetId}: ${firstState} e ${secondState} si sovrappongono per ${(overlap / 1e6).toFixed(4)} km²`);
        }
      } catch (error) {
        localFailures.push(`${datasetId}: controllo sovrapposizioni fallito — ${error.message}`);
      }
    }
  }

  const russianControl = unionFeatures(dataset.features.filter((feature) => feature.properties?.stato === "controllo-russo"));
  const references = EDITORIAL_REFERENCES[datasetId] || {};
  const tolerances = EDITORIAL_TOLERANCES_PP[datasetId] || {};
  const oblastReport = TARGET_OBLASTS.map((name) => {
    const oblast = oblasts.features.find((feature) => feature.properties?.shapeName === name);
    if (!oblast) {
      localFailures.push(`${datasetId}: confine oblast “${name}” assente`);
      return null;
    }
    const oblastGeometry = asMultiPolygon(oblast.geometry, name);
    const boundaryArea = geometryArea(oblast.geometry);
    const officialAreaKm2 = officialAreas[name];
    if (!Number.isFinite(officialAreaKm2) || officialAreaKm2 <= 0) {
      localFailures.push(`${datasetId}: superficie amministrativa ufficiale assente o non valida per “${name}”`);
      return null;
    }
    const totalArea = officialAreaKm2 * 1e6;
    const controlledArea = russianControl.length ? intersectionArea(russianControl, oblastGeometry) : 0;
    const percentage = (controlledArea / totalArea) * 100;
    const editorial = references[name] ?? null;
    const difference = editorial === null ? null : percentage - editorial;
    const tolerance = editorial === null ? null : tolerances[name] ?? DEFAULT_EDITORIAL_TOLERANCE_PP;
    const boundaryAreaKm2 = boundaryArea / 1e6;
    return {
      oblast: name,
      geometriaPercento: Number(percentage.toFixed(2)),
      areaControllataKm2: Number((controlledArea / 1e6).toFixed(1)),
      areaTotaleKm2: officialAreaKm2,
      denominatore: "superficie amministrativa ufficiale",
      areaConfineAdm1Km2: Number(boundaryAreaKm2.toFixed(1)),
      scartoConfineAdm1Percento: Number((((boundaryAreaKm2 / officialAreaKm2) - 1) * 100).toFixed(2)),
      riferimentoEditorialePercento: editorial,
      differenzaPunti: difference === null ? null : Number(difference.toFixed(2)),
      tolleranzaPunti: tolerance,
      classificazione:
        difference === null ? "nessun riferimento editoriale" : classifyDifference(difference, tolerance),
    };
  }).filter(Boolean);

  failures.push(...localFailures);
  return {
    dataset: datasetId,
    data: date,
    esito: localFailures.length ? "FALLITO" : "OK",
    vertici: stats.vertices,
    superficiKm2PerCategoria: Object.fromEntries(
      Object.entries(stats.areaByState).map(([state, area]) => [state, Number((area / 1e6).toFixed(2))])
    ),
    oblast: oblastReport,
  };
}

function markdownReport(reports) {
  const lines = [
    "# Frontiera — report percentuale per oblast",
    "",
    "Calcolo geodetico WGS84 delle aree controllate, ottenute intersecando i master territoriali con i confini ADM1. Il denominatore usa le superfici amministrative terrestri ufficiali: i confini geoBoundaries incorporano estensioni marittime in diversi oblast costieri e non sono quindi impiegati come superficie totale.",
    "",
    "Le stime editoriali restano un controllo indipendente e non un bersaglio geometrico. F0 non pubblica percentuali e non possiede riferimenti editoriali nel validatore.",
    "",
  ];
  for (const report of reports) {
    lines.push(`## ${report.dataset} — ${report.data}`, "");
    lines.push(
      "| Oblast | Geometria | Riferimento editoriale | Differenza | Tolleranza | Esito |",
      "|---|---:|---:|---:|---:|---|"
    );
    for (const item of report.oblast) {
      const reference = item.riferimentoEditorialePercento === null ? "—" : `≈${item.riferimentoEditorialePercento}%`;
      const difference = item.differenzaPunti === null ? "—" : `${item.differenzaPunti >= 0 ? "+" : ""}${item.differenzaPunti} pp`;
      const tolerance = item.tolleranzaPunti === null ? "—" : `±${item.tolleranzaPunti} pp`;
      lines.push(
        `| ${item.oblast} | ${item.geometriaPercento}% | ${reference} | ${difference} | ${tolerance} | ${item.classificazione} |`
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const failures = [];
  const oblasts = readJson(OBLAST_PATH);
  const officialAreasDocument = readJson(OFFICIAL_AREAS_PATH);
  const officialAreas = officialAreasDocument.aree || {};
  if (oblasts.type !== "FeatureCollection") failures.push("confini oblast: non è una FeatureCollection");
  const files = fs
    .readdirSync(TERRITORY_DIR)
    .filter((name) => name.endsWith(".geojson"))
    .map((name) => path.join(TERRITORY_DIR, name))
    .sort();
  if (!files.length) failures.push("nessun dataset territoriale trovato");
  const reports = files.map((filePath) => validateDataset(filePath, oblasts, officialAreas, failures));

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, "territori-report.json"),
    `${JSON.stringify({ generatoIl: "2026-08-25", crs: "EPSG:4326", reports }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(DOCS_DIR, "report-percentuali.md"), markdownReport(reports));

  for (const report of reports) {
    console.log(
      `[territori:verify] ${report.esito} ${report.dataset}: ${report.vertici} vertici; ` +
        Object.entries(report.superficiKm2PerCategoria)
          .map(([state, area]) => `${state}=${area} km²`)
          .join("; ")
    );
    report.oblast
      .filter((item) => item.classificazione !== "coerente" && item.riferimentoEditorialePercento !== null)
      .forEach((item) =>
        console.warn(
          `[territori:verify] AVVISO ${report.dataset} — ${item.oblast}: geometria ${item.geometriaPercento}%, ` +
            `editoriale ≈${item.riferimentoEditorialePercento}%, differenza ${item.differenzaPunti} pp (${item.classificazione})`
        )
      );
  }

  if (failures.length) {
    console.error(`[territori:verify] FALLITO: ${failures.length} errore/i strutturale/i o topologico/i`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }
  const present = new Set(reports.map((report) => report.dataset));
  const missing = EXPECTED_SNAPSHOTS.filter(([id]) => !present.has(id));
  missing.forEach(([id, label]) =>
    console.warn(
      `[territori:verify] MANCANTE ${label}: nessun master “${id}”; la pagina resta sul fallback della linea di contatto. ` +
        "Digitalizzare su cartografia datata e importare con: npm run import:territori -- --fase <n> --input <file>"
    )
  );
  console.log(
    `[territori:verify] OK: ${reports.length} istantanee validate su ${EXPECTED_SNAPSHOTS.length} previste; report percentuale aggiornato.`
  );
}

main();
