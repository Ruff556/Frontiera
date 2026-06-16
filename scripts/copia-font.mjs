// Copia i woff2 self-hosted dai pacchetti open-source @fontsource in src/fonts/.
// Nessuna rete: legge solo da node_modules. Idempotente e tollerante (se un file
// non c'è, avvisa e prosegue, così la build non si rompe).
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = resolve(root, "src/fonts");
mkdirSync(dest, { recursive: true });

// pacchetto @fontsource, subset, [pesi normali], [pesi corsivi]
const SET = [
  ["archivo", "latin", [500, 600, 700, 800], []],
  ["spectral", "latin", [400, 500, 600], [400]],
  ["ibm-plex-mono", "latin", [400, 500, 600], []],
];

let copiati = 0;
let mancanti = 0;
for (const [pkg, subset, normali, corsivi] of SET) {
  const base = resolve(root, "node_modules/@fontsource", pkg, "files");
  const jobs = [
    ...normali.map((w) => `${pkg}-${subset}-${w}-normal.woff2`),
    ...corsivi.map((w) => `${pkg}-${subset}-${w}-italic.woff2`),
  ];
  for (const file of jobs) {
    const src = resolve(base, file);
    if (existsSync(src)) {
      copyFileSync(src, resolve(dest, file));
      copiati++;
    } else {
      mancanti++;
    }
  }
}

if (copiati) console.log(`[font] copiati ${copiati} file in src/fonts/`);
if (mancanti)
  console.warn(
    `[font] ${mancanti} woff2 non trovati in node_modules/@fontsource — ` +
      `esegui "npm install" per scaricarli (i fallback di sistema restano attivi).`
  );
