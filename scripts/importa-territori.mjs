"use strict";

/**
 * Importa nei master territoriali una digitalizzazione GIS già eseguita.
 *
 * Questo script NON deduce il fronte. Non legge testi, non legge percentuali
 * editoriali, non chiude le linee di contatto, non interpola fra istantanee.
 * Riceve geometrie digitalizzate a mano su cartografia storica datata e si
 * limita a: importare, riparare la topologia, dissolvere le componenti
 * omogenee, separare le categorie, esportare nello schema del progetto.
 *
 * Schema d'ingresso atteso (una FeatureCollection per fase):
 *
 *   {
 *     "type": "FeatureCollection",
 *     "metadata": {
 *       "dataCartografica": "2022-11-13",
 *       "fonti": [ { "id", "titolo", "autore", "url", "ruolo", "licenza" } ],
 *       "note": "…",
 *       "incertezza": "…"
 *     },
 *     "features": [
 *       { "properties": { "categoria": "post-2022" }, "geometry": { … } }
 *     ]
 *   }
 *
 * Categorie ammesse: "pre-2022", "post-2022", "ucraino-in-russia", "conteso".
 *
 * Uso:
 *   node scripts/importa-territori.mjs --fase 1 --input <digitalizzazione.geojson>
 *   node scripts/importa-territori.mjs --fase 4 --input <file> --senzaRitaglio
 */

import fs from "node:fs";
import path from "node:path";
import polygonClipping from "polygon-clipping";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "src", "_data", "cartinaTerritori");
const BOUNDARY_PATH = path.join(OUTPUT_DIR, "confini", "oblast-ukraine.geojson");

const PHASES = {
  1: { id: "controllo-fase-1", data: "2022-11-13", nome: "Fase 1" },
  2: { id: "controllo-fase-2", data: "2023-09-30", nome: "Fase 2" },
  4: { id: "controllo-fase-4", data: "2025-03-13", nome: "Fase 4" },
  5: { id: "controllo-fase-5", data: "2026-07-15", nome: "Fase 5" },
};

const CATEGORIES = {
  "pre-2022": { stato: "controllo-russo", origine: "pre-2022", ritaglia: true },
  "post-2022": { stato: "controllo-russo", origine: "post-2022", ritaglia: true },
  "ucraino-in-russia": { stato: "controllo-ucraino-in-russia", origine: "non-applicabile", ritaglia: false },
  conteso: { stato: "conteso", origine: "non-applicabile", ritaglia: true },
};

const ORDER = ["pre-2022", "post-2022", "conteso", "ucraino-in-russia"];

function fail(message) {
  throw new Error(`[territori:importa] ${message}`);
}

function argumentsFrom(argv) {
  const result = { senzaRitaglio: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--senzaRitaglio") {
      result.senzaRitaglio = true;
      continue;
    }
    if (!key?.startsWith("--")) fail(`argomento non valido: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`manca il valore di ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  if (!result.fase) fail("manca --fase (1, 2, 4 o 5)");
  if (!PHASES[result.fase]) fail(`--fase ${result.fase} non prevista: ammesse 1, 2, 4, 5`);
  if (!result.input) fail("manca --input con la digitalizzazione della fase");
  result.input = path.resolve(result.input);
  if (!fs.existsSync(result.input)) fail(`file d'ingresso non trovato: ${result.input}`);
  return result;
}

function readCollection(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (value.type !== "FeatureCollection") fail(`${filePath}: attesa FeatureCollection`);
  return value;
}

function asMultiPolygon(geometry, context) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  fail(`${context}: atteso Polygon o MultiPolygon, ricevuto ${geometry?.type ?? "niente"}`);
}

function signedArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function closeRing(ring) {
  const first = ring[0];
  const last = ring.at(-1);
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [...first]];
}

function dedupe(ring, epsilon = 1e-9) {
  const output = [];
  for (const point of ring) {
    const previous = output.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > epsilon) output.push(point);
  }
  return output;
}

/** Riparazione: chiusura, deduplica, rimozione degenerazioni, orientamento. */
function repair(multiPolygon, context) {
  return multiPolygon.flatMap((polygon, polygonIndex) => {
    const rings = polygon
      .map((ring, ringIndex) => {
        if (!Array.isArray(ring) || ring.length < 4) return null;
        const cleaned = closeRing(dedupe(ring.slice(0, -1)));
        if (cleaned.length < 4) return null;
        const area = signedArea(cleaned);
        if (Math.abs(area) < 1e-12) return null;
        const wantsCounterClockwise = ringIndex === 0;
        const isCounterClockwise = area > 0;
        return isCounterClockwise === wantsCounterClockwise ? cleaned : [...cleaned].reverse();
      })
      .filter(Boolean);
    if (!rings.length) {
      console.warn(`[territori:importa] ${context}: poligono ${polygonIndex + 1} scartato perché degenerato`);
      return [];
    }
    return [rings];
  });
}

function dissolve(multiPolygons, context) {
  if (!multiPolygons.length) return [];
  let output = [];
  for (const item of multiPolygons) {
    for (const polygon of item) {
      output = output.length ? polygonClipping.union(output, [polygon]) : [polygon];
    }
  }
  if (!output.length) fail(`${context}: la dissoluzione non ha prodotto geometria`);
  return output;
}

/**
 * Pulizia finale, identica a quella dei master F0/F3: le operazioni booleane
 * lasciano vertici quasi coincidenti lungo i bordi condivisi (tipicamente il
 * confine nazionale usato per il ritaglio), e quelle micro-punte vengono lette
 * dal validatore come autointersezioni.
 */
function cleanRing(ring, epsilon = 1e-6) {
  const output = [];
  for (const point of ring) {
    const previous = output.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > epsilon) output.push(point);
  }
  if (
    output.length > 1 &&
    Math.hypot(output.at(-1)[0] - output[0][0], output.at(-1)[1] - output[0][1]) <= epsilon
  ) {
    output.pop();
  }
  output.push([...output[0]]);
  return output;
}

/**
 * Rimuove le punte a larghezza nulla (A→B→A e i vertici collineari) che il
 * ritaglio booleano lascia lungo i bordi condivisi. Itera fino a stabilità.
 */
function removeSpikes(ring, epsilon = 1e-11) {
  let current = ring.slice(0, -1);
  for (let pass = 0; pass < 8; pass += 1) {
    const kept = [];
    const length = current.length;
    if (length < 4) break;
    for (let index = 0; index < length; index += 1) {
      const previous = current[(index - 1 + length) % length];
      const point = current[index];
      const next = current[(index + 1) % length];
      const cross =
        (point[0] - previous[0]) * (next[1] - previous[1]) -
        (point[1] - previous[1]) * (next[0] - previous[0]);
      if (Math.abs(cross) > epsilon) kept.push(point);
    }
    if (kept.length === current.length || kept.length < 3) break;
    current = kept;
  }
  return [...current, [...current[0]]];
}

function cleanMultiPolygon(value) {
  return value.flatMap((polygon) => {
    const rings = polygon.map((ring) => removeSpikes(cleanRing(ring))).filter((ring) => {
      if (ring.length < 4) return false;
      return Math.abs(signedArea(ring)) > 1e-12;
    });
    return rings.length ? [rings] : [];
  });
}

function feature(id, stato, data, origineControllo, coordinates, note, sourceId) {
  return {
    type: "Feature",
    id,
    properties: { id, stato, data, origineControllo, sourceId, note },
    geometry: { type: "MultiPolygon", coordinates },
  };
}

function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const phase = PHASES[args.fase];
  const source = readCollection(args.input);

  const declaredDate = source.metadata?.dataCartografica;
  if (declaredDate !== phase.data) {
    fail(`la digitalizzazione dichiara ${declaredDate ?? "nessuna data"}, la ${phase.nome} richiede ${phase.data}`);
  }
  if (!Array.isArray(source.metadata?.fonti) || !source.metadata.fonti.length) {
    fail("la digitalizzazione non dichiara alcuna fonte: l'import si ferma");
  }
  for (const fonte of source.metadata.fonti) {
    for (const campo of ["id", "titolo", "url", "ruolo"]) {
      if (!fonte?.[campo]) fail(`fonte priva del campo obbligatorio “${campo}”`);
    }
  }
  if (!source.features?.length) fail("nessuna feature nella digitalizzazione");

  const grouped = new Map();
  source.features.forEach((item, index) => {
    const categoria = item.properties?.categoria;
    if (!CATEGORIES[categoria]) {
      fail(`feature ${index + 1}: categoria “${categoria ?? "assente"}” non ammessa (${Object.keys(CATEGORIES).join(", ")})`);
    }
    const repaired = repair(asMultiPolygon(item.geometry, `feature ${index + 1}`), `feature ${index + 1}`);
    if (!repaired.length) fail(`feature ${index + 1}: geometria interamente degenerata`);
    if (!grouped.has(categoria)) grouped.set(categoria, []);
    grouped.get(categoria).push(repaired);
  });

  const boundary = args.senzaRitaglio
    ? null
    : dissolve(
        readCollection(BOUNDARY_PATH).features.map((item) =>
          repair(asMultiPolygon(item.geometry, "confine ADM1"), "confine ADM1")
        ),
        "confine nazionale da ADM1"
      );

  const dissolved = new Map();
  for (const categoria of ORDER) {
    if (!grouped.has(categoria)) continue;
    let geometry = dissolve(grouped.get(categoria), `${phase.nome} ${categoria}`);
    if (boundary && CATEGORIES[categoria].ritaglia) {
      geometry = polygonClipping.intersection(geometry, boundary);
      if (!geometry.length) fail(`${phase.nome} ${categoria}: nulla resta dopo il ritaglio sul confine nazionale`);
    }
    dissolved.set(categoria, geometry);
  }

  // Separazione delle categorie: nessuna sovrapposizione ammessa a valle.
  // L'ordine di precedenza è pre-2022 > post-2022 > conteso.
  const precedence = ["pre-2022", "post-2022", "conteso"];
  for (let index = 1; index < precedence.length; index += 1) {
    const current = dissolved.get(precedence[index]);
    if (!current) continue;
    let result = current;
    for (let previous = 0; previous < index; previous += 1) {
      const earlier = dissolved.get(precedence[previous]);
      if (earlier?.length) result = polygonClipping.difference(result, earlier);
    }
    if (!result.length) fail(`${phase.nome} ${precedence[index]}: svuotata dalla separazione fra categorie`);
    dissolved.set(precedence[index], result);
  }

  const features = [];
  for (const categoria of ORDER) {
    const geometry = dissolved.get(categoria);
    if (!geometry?.length) continue;
    const definition = CATEGORIES[categoria];
    features.push(
      feature(
        `fase-${args.fase}-${definition.stato}-${definition.origine}`.replace(/-non-applicabile$/, ""),
        definition.stato,
        phase.data,
        definition.origine,
        // Nessun arrotondamento: i risultati di polygon-clipping conservano la
        // precisione completa, arrotondarli fa collassare vertici quasi
        // coincidenti e introduce autointersezioni inesistenti nel master.
        cleanMultiPolygon(geometry),
        source.metadata?.notePerCategoria?.[categoria] ?? source.metadata?.note ?? "",
        source.metadata?.fonti[0].id
      )
    );
  }

  const fileName = `${phase.id}-${phase.data}.geojson`;
  const output = {
    type: "FeatureCollection",
    name: `Frontiera — controllo territoriale, ${phase.nome}`,
    metadata: {
      dataCartografica: phase.data,
      crs: "EPSG:4326",
      criterio: "controllo territoriale consolidato, non semplice presenza o massima avanzata rivendicata",
      procedura:
        "Digitalizzazione manuale su cartografia storica datata; import, riparazione topologica, dissoluzione, separazione delle categorie e ritaglio sul confine nazionale. Nessuna deduzione da testi, percentuali o linee di contatto.",
      creatoIl: new Date().toISOString().slice(0, 10),
      revisionatoIl: source.metadata?.revisionatoIl ?? null,
      fonti: source.metadata.fonti,
      incertezza: source.metadata?.incertezza ?? "non dichiarata dalla digitalizzazione",
      note: source.metadata?.note ?? "",
    },
    features,
  };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(output)}\n`);
  console.log(
    `[territori:importa] scritto ${fileName}: ${features.length} feature (${features.map((item) => item.properties.stato).join(", ")})`
  );
  console.log("[territori:importa] eseguire ora: npm run verify:territori");
}

main();
