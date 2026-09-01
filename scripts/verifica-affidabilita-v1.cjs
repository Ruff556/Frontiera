const fs = require("fs");
const path = require("path");
const {
  creaRegistry,
  normalizzaSidecar,
} = require("../src/_lib/affidabilita-v1");

const root = path.resolve(__dirname, "..");
const soloSorgenti = process.argv.includes("--source-only");
const errori = [];
const MARKER_RE = /\{%\s*affV1\s+(["'])([^"']+)\1\s*%\}/g;

function verifica(descrizione, condizione) {
  if (!condizione) errori.push(descrizione);
}

function deveFallire(descrizione, funzione) {
  try {
    funzione();
    errori.push(`fixture invalida accettata: ${descrizione}`);
  } catch {
    // Esito atteso.
  }
}

function fixture(override = {}) {
  return {
    versione: 1,
    dataset: "fixture-gruppo",
    ambiti: {
      "contenuti/a.md": [{
        id: "stesso-id",
        livello: "nonverificato",
        titolo: "Titolo A",
        motivazione: "Motivazione A",
        fonti: [{ nome: "Fonte A", data: "2025-03-20", url: "https://example.com/a" }],
      }],
      "contenuti/b.md": [{
        id: "stesso-id",
        livello: "plausibile",
        titolo: "Titolo B",
        motivazione: "Motivazione B",
        fonti: [{ nome: "Fonte B" }],
      }],
    },
    ...override,
  };
}

function verificaFixture() {
  const gruppo = normalizzaSidecar(fixture(), "fixture-gruppo");
  verifica("fixture gruppo: due ambiti supportati", gruppo.ambiti.size === 2);
  verifica(
    "fixture gruppo: alias nonverificato normalizzato",
    gruppo.ambiti.get("contenuti/a.md").get("stesso-id").livello === "non-verificato"
  );
  verifica(
    "fixture gruppo: stesso ID ammesso in ambiti distinti",
    gruppo.ambiti.get("contenuti/b.md").has("stesso-id")
  );

  deveFallire("data non canonica", () => {
    const invalida = fixture();
    invalida.ambiti["contenuti/a.md"][0].fonti[0].data = "20-03-2025";
    normalizzaSidecar(invalida, "fixture-data");
  });
  deveFallire("URL non web", () => {
    const invalida = fixture();
    invalida.ambiti["contenuti/a.md"][0].fonti[0].url = "javascript:alert(1)";
    normalizzaSidecar(invalida, "fixture-url");
  });
  deveFallire("duplicato nello stesso ambito", () => {
    const invalida = fixture();
    invalida.ambiti["contenuti/a.md"].push({ ...invalida.ambiti["contenuti/a.md"][0] });
    normalizzaSidecar(invalida, "fixture-duplicato");
  });
}

function luminanza(hex) {
  const canali = hex.match(/[0-9a-f]{2}/gi).map((c) => parseInt(c, 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * canali[0] + 0.7152 * canali[1] + 0.0722 * canali[2];
}

function contrasto(a, b) {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (chiaro + 0.05) / (scuro + 0.05);
}

function verificaContrattiClient() {
  const css = fs.readFileSync(path.join(root, "src/css/affidabilita-v1.css"), "utf8");
  const js = fs.readFileSync(path.join(root, "src/js/affidabilita-v1.js"), "utf8");
  const partial = fs.readFileSync(path.join(root, "src/_includes/partials/affidabilita-v1-panel.njk"), "utf8");
  const eleventy = fs.readFileSync(path.join(root, ".eleventy.js"), "utf8");

  verifica("client: panel non fixed/sticky", !/\.aff-v1-panel\s*\{[^}]*position\s*:\s*(?:fixed|sticky)/s.test(css));
  verifica("client: reduced motion presente", /prefers-reduced-motion\s*:\s*reduce/.test(css));
  verifica("client: aggiornamenti coordinati con rAF", /requestAnimationFrame/.test(js));
  verifica("client: ResizeObserver previsto", /ResizeObserver/.test(js));
  verifica("client: visualViewport previsto", /visualViewport/.test(js));
  verifica("client: nessun body lock", !/document\.body\.style\.(?:overflow|position)|classList\.(?:add|toggle)\([^\n]*(?:lock|modal)/i.test(js));
  verifica("shell: aside non modale", /<aside\b/.test(partial) && !/<dialog\b|aria-modal|backdrop/i.test(partial));
  verifica("legacy: shortcode aff conservato", /addShortcode\("aff"/.test(eleventy));
  verifica("legacy: filtro affBadge conservato", /addFilter\("affBadge"/.test(eleventy));

  for (const colore of ["216b4a", "8b5b08", "55636c", "a2332f"]) {
    verifica(`contrasto: #${colore} su bianco almeno AA`, contrasto(colore, "ffffff") >= 4.5);
    verifica(`contrasto: #${colore} su carta almeno AA`, contrasto(colore, "fafbfa") >= 4.5);
  }
}

function markersNelFile(file) {
  const testo = fs.readFileSync(file, "utf8");
  const markers = [];
  for (const match of testo.matchAll(MARKER_RE)) markers.push(match[2]);
  const occorrenze = (testo.match(/\{%\s*affV1\b/g) || []).length;
  if (occorrenze !== markers.length) {
    errori.push(`${path.relative(root, file)}: marker affV1 malformato`);
  }
  return markers;
}

function verificaSorgenti() {
  verificaFixture();
  verificaContrattiClient();
  let registry;
  try {
    registry = creaRegistry({ root });
  } catch (errore) {
    errori.push(errore.message);
    return null;
  }

  const markersPerPagina = new Map();
  for (const dataset of registry.datasets) {
    for (const [pagina, records] of dataset.ambiti.entries()) {
      const assoluto = path.join(root, pagina);
      verifica(`${dataset.file}: ambito inesistente ${pagina}`, fs.existsSync(assoluto));
      if (!fs.existsSync(assoluto)) continue;
      if (!markersPerPagina.has(pagina)) markersPerPagina.set(pagina, markersNelFile(assoluto));
      const markers = markersPerPagina.get(pagina);
      const visti = new Set();
      for (const id of markers) {
        if (visti.has(id)) errori.push(`${pagina}: marker duplicato affV1("${id}")`);
        visti.add(id);
        try {
          registry.risolvi(pagina, id);
        } catch (errore) {
          errori.push(errore.message);
        }
      }
      for (const id of records.keys()) {
        if (!visti.has(id)) errori.push(`${dataset.file}: record orfano "${id}" nell'ambito ${pagina}`);
      }
    }
  }

  return registry;
}

function conta(testo, regex) {
  return (testo.match(regex) || []).length;
}

function fileHtml(directory) {
  if (!fs.existsSync(directory)) return [];
  const trovati = [];
  const visita = (cartella) => {
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
      const completo = path.join(cartella, voce.name);
      if (voce.isDirectory()) visita(completo);
      else if (voce.isFile() && /\.html?$/i.test(voce.name)) {
        // Eleventy può scrivere sotto _site anche copie HTML di partial: non sono
        // pagine pubblicate e non partecipano alla verifica dell'output.
        const testo = fs.readFileSync(completo, "utf8");
        if (/<html\b/i.test(testo)) trovati.push(completo);
      }
    }
  };
  visita(directory);
  return trovati.sort();
}

function attributoTag(tag, nome) {
  const pattern = new RegExp(`\\b${nome}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return pattern.exec(tag)?.[2] ?? null;
}

function triggerTags(testo) {
  return [...testo.matchAll(/<button\b[^>]*\bdata-aff-v1-trigger(?![-\w])[^>]*>/gi)].map((m) => m[0]);
}

function verificaPaginaV1(file, testo) {
  const dove = `output V1: ${path.relative(root, file)}`;
  const triggers = triggerTags(testo);
  const occorrenzeTrigger = conta(testo, /\bdata-aff-v1-trigger(?![-\w])/gi);
  const idTrigger = triggers.map((tag) => attributoTag(tag, "id"));

  verifica(`${dove}: almeno un trigger`, triggers.length > 0);
  verifica(`${dove}: ogni trigger è un button`, triggers.length === occorrenzeTrigger);
  verifica(
    `${dove}: ID trigger univoci`,
    triggers.length > 0 && idTrigger.every(Boolean) && new Set(idTrigger).size === triggers.length
  );
  verifica(
    `${dove}: aria-controls su ogni trigger`,
    triggers.length > 0 && triggers.every((tag) => attributoTag(tag, "aria-controls") === "aff-v1-panel")
  );
  verifica(
    `${dove}: stato iniziale chiuso`,
    triggers.length > 0 && triggers.every((tag) => attributoTag(tag, "aria-expanded") === "false")
  );
  verifica(`${dove}: un solo shell panel`, conta(testo, /\bid\s*=\s*(["'])aff-v1-panel\1/gi) === 1);
  verifica(
    `${dove}: panel non dialog`,
    !/<dialog\b/i.test(testo) && !/\brole\s*=\s*(["'])dialog\1/i.test(testo)
  );
  verifica(
    `${dove}: assenza di aria-modal`,
    !/\baria-modal\s*=\s*(?:(["'])true\1|true)\b/i.test(testo)
  );
  verifica(
    `${dove}: CSS V1 caricato una volta`,
    conta(testo, /<link\b[^>]*\bhref\s*=\s*(["'])\/css\/affidabilita-v1\.css(?:[?#][^"']*)?\1[^>]*>/gi) === 1
  );
  verifica(
    `${dove}: JS V1 caricato una volta`,
    conta(testo, /<script\b[^>]*\bsrc\s*=\s*(["'])\/js\/affidabilita-v1\.js(?:[?#][^"']*)?\1[^>]*>/gi) === 1
  );
}

function verificaOutput() {
  const directory = path.join(root, "_site");
  const files = fileHtml(directory);
  verifica("output: directory _site presente", fs.existsSync(directory));
  verifica("output: pagine HTML presenti", files.length > 0);

  for (const file of files) {
    const testo = fs.readFileSync(file, "utf8");
    const percorso = path.relative(root, file);
    if (/\bdata-aff-v1-trigger(?![-\w])/.test(testo)) {
      verificaPaginaV1(file, testo);
      continue;
    }

    verifica(`output non V1: ${percorso} senza shell panel V1`, !/\bid\s*=\s*(["'])aff-v1-panel\1/i.test(testo));
    verifica(`output non V1: ${percorso} senza CSS V1`, !/\/css\/affidabilita-v1\.css\b/i.test(testo));
    verifica(`output non V1: ${percorso} senza JS V1`, !/\/js\/affidabilita-v1\.js\b/i.test(testo));
  }
}

verificaSorgenti();
if (!soloSorgenti) verificaOutput();

if (errori.length) {
  console.error("[verify:affidabilita-v1] FAIL\n  - " + errori.join("\n  - "));
  process.exit(1);
}

console.log(
  soloSorgenti
    ? "[verify:affidabilita-v1] OK — schema, sidecar, scope, marker e contratti V1 verificati."
    : "[verify:affidabilita-v1] OK — schema, sidecar, scope, marker, output V1 e pagine non V1 verificati."
);
