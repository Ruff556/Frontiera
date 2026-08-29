"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { MAP, formatNumber, project } = require("../src/_lib/cartina");

const ROOT = path.resolve(__dirname, "..");
const PLACES_PATH = path.join(ROOT, "src", "_data", "cartinaLuoghi.json");
const LINES_PATH = path.join(ROOT, "src", "_data", "cartinaLinee.json");

const SAMPLE_IDS = [
  "kyiv",
  "hostomel-airport",
  "antonivka-bridge",
  "bakhmut",
  "vuhledar",
  "mala-tokmachka",
  "robotyne",
  "sudzha",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function insideViewBox(point) {
  return (
    point.x >= MAP.viewBoxX &&
    point.x <= MAP.viewBoxX + MAP.viewBoxWidth &&
    point.y >= MAP.viewBoxY &&
    point.y <= MAP.viewBoxY + MAP.viewBoxHeight
  );
}

function geometryLines(geometry, context) {
  if (!geometry || typeof geometry !== "object") throw new Error(`${context}: geometria assente.`);
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  throw new Error(`${context}: tipo ${geometry.type || "sconosciuto"} non supportato.`);
}

function features(dataset, context) {
  if (!dataset || typeof dataset !== "object") throw new Error(`${context}: dataset assente.`);
  if (dataset.type === "FeatureCollection") return dataset.features || [];
  if (dataset.type === "Feature") return [dataset];
  if (dataset.type === "LineString" || dataset.type === "MultiLineString") {
    return [{ type: "Feature", properties: {}, geometry: dataset }];
  }
  throw new Error(`${context}: tipo ${dataset.type || "sconosciuto"} non supportato.`);
}

function main() {
  const places = readJson(PLACES_PATH);
  const datasets = readJson(LINES_PATH);
  const failures = [];
  let projectedPlaces = 0;
  let projectedCoordinates = 0;

  console.log(
    `[cartina:verify] viewBox ${MAP.viewBoxX} ${MAP.viewBoxY} ${MAP.viewBoxWidth} ${MAP.viewBoxHeight}; ` +
      `lon ${MAP.west}–${MAP.east}; lat ${MAP.south}–${MAP.north}`
  );
  console.log("[cartina:verify] luoghi campione:");

  for (const id of SAMPLE_IDS) {
    const place = places[id];
    if (!place) {
      failures.push(`luogo campione “${id}” assente`);
      continue;
    }
    try {
      const point = project(place.lon, place.lat, `campione ${id}`);
      const ok = insideViewBox(point);
      console.log(
        `  ${id.padEnd(20)} lat=${String(place.lat).padEnd(9)} lon=${String(place.lon).padEnd(9)} ` +
          `-> x=${formatNumber(point.x).padEnd(11)} y=${formatNumber(point.y).padEnd(11)} ${ok ? "OK" : "FUORI"}`
      );
      if (!ok) failures.push(`luogo campione “${id}” fuori viewBox`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const [id, place] of Object.entries(places)) {
    try {
      const point = project(place.lon, place.lat, `luogo ${id}`);
      projectedPlaces += 1;
      if (!insideViewBox(point)) failures.push(`luogo “${id}” fuori viewBox`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const [datasetId, dataset] of Object.entries(datasets)) {
    try {
      features(dataset, `dataset ${datasetId}`).forEach((feature, featureIndex) => {
        geometryLines(feature.geometry, `dataset ${datasetId}, feature ${featureIndex + 1}`).forEach(
          (line, lineIndex) => {
            if (!Array.isArray(line) || line.length < 2) {
              throw new Error(`dataset ${datasetId}, linea ${lineIndex + 1}: meno di due coordinate`);
            }
            line.forEach((coordinate, coordinateIndex) => {
              if (!Array.isArray(coordinate) || coordinate.length < 2) {
                throw new Error(
                  `dataset ${datasetId}, coordinata ${coordinateIndex + 1}: formato [lon, lat] non valido`
                );
              }
              const point = project(
                coordinate[0],
                coordinate[1],
                `dataset ${datasetId}, coordinata ${coordinateIndex + 1}`
              );
              projectedCoordinates += 1;
              if (!insideViewBox(point)) {
                failures.push(`dataset “${datasetId}”, coordinata ${coordinateIndex + 1} fuori viewBox`);
              }
            });
          }
        );
      });
    } catch (error) {
      failures.push(error.message);
    }
  }

  const a = project(places["mala-tokmachka"].lon, places["mala-tokmachka"].lat, "Mala Tokmachka");
  const b = project(places.robotyne.lon, places.robotyne.lat, "Robotyne");
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  console.log(
    `[cartina:verify] Mala Tokmachka–Robotyne: distanza=${formatNumber(distance)} unità native ` +
      `(equivalente ${(distance / (MAP.viewBoxWidth / 100)).toFixed(4)} nel precedente spazio 100×67.1875).`
  );

  if (failures.length) {
    console.error(`[cartina:verify] FALLITO: ${failures.length} errore/i`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    `[cartina:verify] OK: ${projectedPlaces} luoghi e ${projectedCoordinates} coordinate GeoJSON ` +
      `sono numerici e interni al viewBox.`
  );
}

main();
