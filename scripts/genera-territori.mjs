"use strict";

/**
 * Rigenera i due master territoriali da esportazioni storiche autorizzate.
 * Le esportazioni sorgente non sono ridistribuite nel build: l'accordo
 * DeepState vieta la pubblicazione dell'API, ma consente l'uso dei materiali
 * visuali con attribuzione. Gli output sono ridigitalizzazioni Frontiera
 * semplificate, documentate e verificate anche sulle mappe ISW.
 *
 * Uso:
 * node scripts/genera-territori.mjs \
 *   --fase0 /percorso/revisione-deepstate-2022-04-03.geojson \
 *   --fase3 /percorso/revisione-deepstate-2024-08-14.geojson \
 *   --iswFase0 data-sources/cartina-territori/isw-fase0-ridigitalizzato.geojson \
 *   --kursk data-sources/cartina-territori/kursk-2024-08-14-ridigitalizzato.geojson
 */

import fs from "node:fs";
import path from "node:path";
import polygonClipping from "polygon-clipping";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "src", "_data", "cartinaTerritori");
const COLORS = {
  pre2022: "#880e4f",
  occupied: "#a52714",
  liberated2022: "#0288d1",
  uncertain2022: "#bcaaa4",
  kursk2024: "#01579b",
};

function fail(message) {
  throw new Error(`[territori:genera] ${message}`);
}

function argumentsFrom(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) fail(`argomento non valido: ${key ?? ""}`);
    result[key.slice(2)] = path.resolve(value);
  }
  for (const required of ["fase0", "fase3", "iswFase0", "kursk"]) {
    if (!result[required]) fail(`manca --${required}`);
  }
  return result;
}

function readCollection(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (value.type !== "FeatureCollection") fail(`${filePath}: attesa FeatureCollection`);
  return value;
}

function readFeature(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (value.type !== "Feature") fail(`${filePath}: attesa Feature`);
  return value;
}

function asMultiPolygon(geometry, context) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  fail(`${context}: atteso Polygon/MultiPolygon`);
}

function dissolve(features, context) {
  if (!features.length) fail(`${context}: nessuna geometria`);
  let output = [];
  for (const item of features) {
    for (const polygon of asMultiPolygon(item.geometry, context)) {
      output = output.length ? polygonClipping.union(output, [polygon]) : [polygon];
    }
  }
  return output;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)
  ));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points;
  let farthest = 0;
  let pivot = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points.at(-1));
    if (distance > farthest) {
      farthest = distance;
      pivot = index;
    }
  }
  if (farthest <= tolerance) return [points[0], points.at(-1)];
  return [
    ...simplifyLine(points.slice(0, pivot + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(pivot), tolerance),
  ];
}

function sameCoordinate(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function simplifyRing(ring, tolerance = 0.0025) {
  const open = sameCoordinate(ring[0], ring.at(-1)) ? ring.slice(0, -1) : ring;
  if (open.length < 5) return [...open, [...open[0]]];
  let pivot = 1;
  let farthest = 0;
  for (let index = 1; index < open.length; index += 1) {
    const distance = Math.hypot(open[index][0] - open[0][0], open[index][1] - open[0][1]);
    if (distance > farthest) {
      farthest = distance;
      pivot = index;
    }
  }
  const first = simplifyLine(open.slice(0, pivot + 1), tolerance);
  const second = simplifyLine([...open.slice(pivot), open[0]], tolerance);
  const simplified = [...first.slice(0, -1), ...second];
  if (!sameCoordinate(simplified[0], simplified.at(-1))) simplified.push([...simplified[0]]);
  return simplified.length >= 4 ? simplified : [...open, [...open[0]]];
}

function simplify(multiPolygon) {
  return multiPolygon.map((polygon) => polygon.map((ring) => simplifyRing(ring)));
}

function roundCoordinates(value) {
  if (typeof value === "number") return Number(value.toFixed(8));
  return Array.isArray(value) ? value.map(roundCoordinates) : value;
}

function cleanRing(ring, epsilon = 1e-6) {
  const output = [];
  for (const point of ring) {
    const previous = output.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > epsilon) {
      output.push(point);
    }
  }
  if (output.length > 1 && Math.hypot(
    output.at(-1)[0] - output[0][0],
    output.at(-1)[1] - output[0][1]
  ) <= epsilon) output.pop();
  output.push([...output[0]]);
  return output;
}

function cleanMultiPolygon(value) {
  return value.flatMap((polygon) => {
    const rings = polygon.map((ring) => cleanRing(ring)).filter((ring) => {
      if (ring.length < 4) return false;
      let area = 0;
      for (let index = 0; index < ring.length - 1; index += 1) {
        area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
      }
      return Math.abs(area) > 1e-12;
    });
    return rings.length ? [rings] : [];
  });
}

function feature(id, stato, data, origineControllo, coordinates, note, simplifyGeometry = true) {
  const prepared = simplifyGeometry ? roundCoordinates(simplify(coordinates)) : coordinates;
  return {
    type: "Feature",
    id,
    properties: {
      id,
      stato,
      data,
      origineControllo,
      sourceId: "frontiera-ridigitalizzazione-deepstate-isw",
      note,
    },
    geometry: {
      type: "MultiPolygon",
      // I risultati di polygon-clipping conservano la precisione completa:
      // arrotondarli può far collassare due vertici quasi coincidenti e
      // introdurre un'autointersezione che nel master non esiste.
      coordinates: cleanMultiPolygon(prepared),
    },
  };
}

function selectedByColor(collection, color) {
  return collection.features.filter((item) =>
    ["Polygon", "MultiPolygon"].includes(item.geometry?.type) && item.properties?.fill === color
  );
}

function phase0(april3, august14, iswVisual, oblasts) {
  const pre2022 = selectedByColor(august14, COLORS.pre2022).filter((item) => {
    const name = item.properties?.name ?? "";
    return /ORDLO|CADR|CALR|Crimea|Крим|Tuzla|Тузла/i.test(name);
  });

  const excludedLiberatedNames = [
    /24\.03/,
    /07\.03/,
    /17\.03/,
    /16\.03-17\.03/,
    /23\.03\.2022/,
  ];
  const post2022 = [
    ...selectedByColor(april3, COLORS.occupied),
    ...selectedByColor(april3, COLORS.liberated2022).filter((item) => {
      const name = item.properties?.name ?? "";
      return !excludedLiberatedNames.some((pattern) => pattern.test(name));
    }),
    // Il 3 aprile queste porzioni settentrionali erano già marcate come
    // incerte durante il ripiegamento; ISW le mostrava controllate il 24 marzo.
    ...selectedByColor(april3, COLORS.uncertain2022),
    // Ridigitalizzazione visuale della carta nazionale ISW del 25 marzo:
    // colma le sacche che nella prima revisione DeepState (3 aprile) erano
    // già state rimosse o ridotte durante il ripiegamento.
    ...iswVisual.features,
  ];

  const pre = dissolve(pre2022, "Fase 0 pre-2022");
  const ukraine = dissolve(oblasts.features, "confine nazionale da ADM1");
  const post = polygonClipping.difference(
    polygonClipping.intersection(dissolve(post2022, "Fase 0 post-2022"), ukraine),
    pre
  );
  return [
    feature(
      "fase-0-controllo-russo-pre-2022",
      "controllo-russo",
      "2022-03-24",
      "pre-2022",
      pre,
      "Crimea e porzioni del Donbas già controllate prima dell'invasione su vasta scala."
    ),
    feature(
      "fase-0-controllo-russo-post-2022",
      "controllo-russo",
      "2022-03-24",
      "post-2022",
      post,
      "Ricostruzione retrospettiva al 24 marzo: aree ancora occupate il 3 aprile più aree liberate dopo il 24 marzo; verificata sulla carta ISW del 25 marzo.",
      false
    ),
  ];
}

function phase3(august14, kurskSource) {
  const pre2022Features = selectedByColor(august14, COLORS.pre2022).filter((item) => {
    const name = item.properties?.name ?? "";
    return /ORDLO|CADR|CALR|Crimea|Крим|Tuzla|Тузла/i.test(name);
  });
  const pre = dissolve(pre2022Features, "Fase 3 pre-2022");
  const post = polygonClipping.difference(
    dissolve(selectedByColor(august14, COLORS.occupied), "Fase 3 post-2022"),
    pre
  );
  const kursk = dissolve([kurskSource], "Fase 3 Kursk");
  return [
    feature(
      "fase-3-controllo-russo-pre-2022",
      "controllo-russo",
      "2024-08-14",
      "pre-2022",
      pre,
      "Crimea e porzioni del Donbas già controllate prima dell'invasione su vasta scala."
    ),
    feature(
      "fase-3-controllo-russo-post-2022",
      "controllo-russo",
      "2024-08-14",
      "post-2022",
      post,
      "Territorio sotto controllo russo acquisito dal 24 febbraio 2022.",
      false
    ),
    feature(
      "fase-3-controllo-ucraino-kursk",
      "controllo-ucraino-in-russia",
      "2024-08-14",
      "non-applicabile",
      kursk,
      "Perimetro consolidato e conservativo; escluse presenze isolate e massime direttrici rivendicate."
    ),
  ];
}

const sharedSources = [
  {
    id: "frontiera-ridigitalizzazione-deepstate-isw",
    titolo: "Ridigitalizzazione Frontiera da DeepStateMap, verificata su mappe ISW",
    url: "https://deepstatemap.live/en",
    ruolo: "base visuale dei perimetri, ridigitalizzata e semplificata; dati API sorgente non ridistribuiti",
  },
  {
    id: "viina-2",
    titolo: "VIINA 2.0 — Territorial Control Data",
    autori: "Yuri M. Zhukov e Natalie Ayers",
    url: "https://github.com/zhukovyuri/VIINA",
    licenza: "ODbL 1.0",
    ruolo: "controllo indipendente di data e attribuzione presso i centri abitati",
  },
];

function writeSnapshot(fileName, name, data, features, specificSources, notes) {
  const output = {
    type: "FeatureCollection",
    name,
    metadata: {
      dataCartografica: data,
      crs: "EPSG:4326",
      criterio: "controllo territoriale consolidato, non semplice presenza o massima avanzata rivendicata",
      procedura: "Ridigitalizzazione/dissoluzione GIS; semplificazione topologica; verifica visuale ISW e quantitativa VIINA.",
      creatoIl: "2026-07-20",
      revisionatoIl: "2026-07-20",
      fonti: [...sharedSources, ...specificSources],
      note: notes,
    },
    features,
  };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(output)}\n`);
  console.log(`[territori:genera] scritto ${fileName}: ${features.length} feature`);
}

function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const april3 = readCollection(args.fase0);
  const august14 = readCollection(args.fase3);
  const iswFase0 = readCollection(args.iswFase0);
  const kursk = readFeature(args.kursk);
  const oblasts = readCollection(path.join(OUTPUT_DIR, "confini", "oblast-ukraine.geojson"));
  writeSnapshot(
    "controllo-fase-0-2022-03-24.geojson",
    "Frontiera — controllo territoriale, Fase 0",
    "2022-03-24",
    phase0(april3, august14, iswFase0, oblasts),
    [{
      id: "isw-2022-03-25",
      titolo: "Assessed Control of Terrain in Ukraine — 25 marzo 2022",
      autore: "Institute for the Study of War e AEI Critical Threats Project",
      url: "https://understandingwar.org/research/russia-ukraine/russian-offensive-campaign-assessment_24-28/",
      ruolo: "verifica visuale a un giorno dalla data; correzioni temporali ricavate dalle date di liberazione",
    }],
    "Snapshot retrospettivo: l'incertezza maggiore riguarda i margini delle sacche settentrionali durante il ripiegamento. Le aree liberate entro il 24 marzo sono escluse."
  );
  writeSnapshot(
    "controllo-fase-3-2024-08-14.geojson",
    "Frontiera — controllo territoriale, Fase 3",
    "2024-08-14",
    phase3(august14, kursk),
    [{
      id: "isw-kursk-2024-08-14",
      titolo: "Ukrainian Incursion into Kursk Oblast as of August 14, 2024, 3:00 PM ET",
      autore: "Institute for the Study of War e AEI Critical Threats Project",
      url: "https://understandingwar.org/map/ukrainian-incursion-into-kursk-oblast-as-of-august-14-2024-300-pm-et/",
      ruolo: "verifica delle aree consolidate e separazione dalle massime avanzate rivendicate",
    }],
    "Il poligono Kursk è conservativo: esclude le sole presenze e le direttrici discontinue mostrate da ISW."
  );
}

main();
