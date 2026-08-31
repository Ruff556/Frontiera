const fs = require("fs");
const path = require("path");

const LIVELLI = Object.freeze({
  confermato: Object.freeze({ classe: "conf", etichetta: "Confermato" }),
  plausibile: Object.freeze({ classe: "plaus", etichetta: "Plausibile" }),
  "non-verificato": Object.freeze({ classe: "nonver", etichetta: "Non verificato" }),
  disinformazione: Object.freeze({ classe: "disinfo", etichetta: "Probabile disinformazione" }),
});

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CAMPI_SIDECAR = new Set(["versione", "dataset", "ambiti"]);
const CAMPI_RECORD = new Set(["id", "livello", "titolo", "motivazione", "fonti"]);
const CAMPI_FONTE = new Set(["nome", "data", "url"]);

function errore(contesto, messaggio) {
  throw new Error(`[affidabilita V1] ${contesto}: ${messaggio}`);
}

function soloCampiNoti(oggetto, ammessi, contesto) {
  for (const campo of Object.keys(oggetto)) {
    if (!ammessi.has(campo)) errore(contesto, `campo non previsto "${campo}"`);
  }
}

function stringaObbligatoria(valore, contesto) {
  if (typeof valore !== "string" || !valore.trim()) errore(contesto, "stringa obbligatoria mancante");
  return valore.trim();
}

function normalizzaPercorsoPagina(percorso) {
  return String(percorso || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function normalizzaLivello(livello, contesto) {
  const chiave = String(livello || "").trim().toLowerCase();
  const canonico = chiave === "nonverificato" ? "non-verificato" : chiave;
  if (!LIVELLI[canonico]) {
    errore(contesto, `livello "${livello}" non valido`);
  }
  return canonico;
}

function dataCanonica(valore, contesto) {
  if (!DATA_RE.test(valore)) errore(contesto, `data "${valore}" non canonica (atteso YYYY-MM-DD)`);
  const [anno, mese, giorno] = valore.split("-").map(Number);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));
  if (
    data.getUTCFullYear() !== anno ||
    data.getUTCMonth() !== mese - 1 ||
    data.getUTCDate() !== giorno
  ) {
    errore(contesto, `data "${valore}" inesistente`);
  }
  return valore;
}

function urlWeb(valore, contesto) {
  let url;
  try {
    url = new URL(valore);
  } catch {
    errore(contesto, `URL "${valore}" non valido`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    errore(contesto, `URL "${valore}" non HTTP/HTTPS`);
  }
  return url.href;
}

function normalizzaFonte(fonte, contesto) {
  if (!fonte || typeof fonte !== "object" || Array.isArray(fonte)) errore(contesto, "fonte non valida");
  soloCampiNoti(fonte, CAMPI_FONTE, contesto);
  const risultato = { nome: stringaObbligatoria(fonte.nome, `${contesto}.nome`) };
  if (fonte.data !== undefined) risultato.data = dataCanonica(fonte.data, `${contesto}.data`);
  if (fonte.url !== undefined) risultato.url = urlWeb(fonte.url, `${contesto}.url`);
  return Object.freeze(risultato);
}

function normalizzaRecord(record, contesto) {
  if (!record || typeof record !== "object" || Array.isArray(record)) errore(contesto, "record non valido");
  soloCampiNoti(record, CAMPI_RECORD, contesto);
  const id = stringaObbligatoria(record.id, `${contesto}.id`);
  if (!ID_RE.test(id)) errore(`${contesto}.id`, `"${id}" non è un ID canonico`);
  if (!Array.isArray(record.fonti) || record.fonti.length === 0) {
    errore(`${contesto}.fonti`, "è richiesta almeno una fonte");
  }
  return Object.freeze({
    id,
    livello: normalizzaLivello(record.livello, `${contesto}.livello`),
    titolo: stringaObbligatoria(record.titolo, `${contesto}.titolo`),
    motivazione: stringaObbligatoria(record.motivazione, `${contesto}.motivazione`),
    fonti: Object.freeze(record.fonti.map((fonte, indice) =>
      normalizzaFonte(fonte, `${contesto}.fonti[${indice}]`)
    )),
  });
}

function normalizzaSidecar(sidecar, contesto = "sidecar") {
  if (!sidecar || typeof sidecar !== "object" || Array.isArray(sidecar)) errore(contesto, "documento non valido");
  soloCampiNoti(sidecar, CAMPI_SIDECAR, contesto);
  if (sidecar.versione !== 1) errore(`${contesto}.versione`, "deve valere 1");
  const dataset = stringaObbligatoria(sidecar.dataset, `${contesto}.dataset`);
  if (!ID_RE.test(dataset)) errore(`${contesto}.dataset`, `"${dataset}" non è canonico`);
  if (!sidecar.ambiti || typeof sidecar.ambiti !== "object" || Array.isArray(sidecar.ambiti)) {
    errore(`${contesto}.ambiti`, "mappa degli ambiti mancante");
  }

  const ambiti = new Map();
  for (const [percorsoGrezzo, records] of Object.entries(sidecar.ambiti)) {
    const pagina = normalizzaPercorsoPagina(percorsoGrezzo);
    if (!pagina || !/\.(?:md|njk)$/i.test(pagina)) {
      errore(`${contesto}.ambiti`, `percorso pagina "${percorsoGrezzo}" non valido`);
    }
    if (!Array.isArray(records) || records.length === 0) {
      errore(`${contesto}.ambiti.${pagina}`, "l'ambito deve contenere almeno un record");
    }
    const mappa = new Map();
    records.forEach((record, indice) => {
      const normalizzato = normalizzaRecord(record, `${contesto}.ambiti.${pagina}[${indice}]`);
      if (mappa.has(normalizzato.id)) {
        errore(`${contesto}.ambiti.${pagina}`, `ID duplicato "${normalizzato.id}"`);
      }
      mappa.set(normalizzato.id, normalizzato);
    });
    ambiti.set(pagina, mappa);
  }
  if (ambiti.size === 0) errore(`${contesto}.ambiti`, "nessun ambito dichiarato");
  return Object.freeze({ dataset, ambiti });
}

function fileJson(directory) {
  if (!fs.existsSync(directory)) return [];
  const trovati = [];
  const visita = (cartella) => {
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
      const completo = path.join(cartella, voce.name);
      if (voce.isDirectory()) visita(completo);
      else if (voce.isFile() && voce.name.endsWith(".json")) trovati.push(completo);
    }
  };
  visita(directory);
  return trovati.sort();
}

function creaRegistry({ root, directory = "data-sources/affidabilita-v1" }) {
  const base = path.resolve(root, directory);
  const files = fileJson(base);
  if (files.length === 0) errore(directory, "nessuna sidecar JSON trovata");

  const datasets = [];
  const perPagina = new Map();
  for (const file of files) {
    const relativo = normalizzaPercorsoPagina(path.relative(root, file));
    let grezzo;
    try {
      grezzo = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (causa) {
      errore(relativo, `JSON non leggibile (${causa.message})`);
    }
    const dataset = normalizzaSidecar(grezzo, relativo);
    datasets.push(Object.freeze({ ...dataset, file: relativo }));

    for (const [pagina, records] of dataset.ambiti.entries()) {
      if (!perPagina.has(pagina)) perPagina.set(pagina, new Map());
      const destinazione = perPagina.get(pagina);
      for (const [id, record] of records.entries()) {
        if (destinazione.has(id)) {
          const precedente = destinazione.get(id);
          errore(pagina, `ID ambiguo "${id}" in ${precedente.file} e ${relativo}`);
        }
        destinazione.set(id, Object.freeze({ ...record, dataset: dataset.dataset, file: relativo }));
      }
    }
  }

  function risolvi(percorsoPagina, idGrezzo) {
    const pagina = normalizzaPercorsoPagina(percorsoPagina);
    const id = stringaObbligatoria(idGrezzo, `${pagina || "pagina sconosciuta"}.affV1`);
    if (!ID_RE.test(id)) errore(`${pagina}.affV1`, `ID "${id}" non canonico`);
    const records = perPagina.get(pagina);
    if (!records || !records.has(id)) errore(pagina, `affV1("${id}") non risolto`);
    return records.get(id);
  }

  return Object.freeze({ files: Object.freeze(files), datasets: Object.freeze(datasets), perPagina, risolvi });
}

function modelloPubblico(record) {
  const livello = LIVELLI[record.livello];
  return {
    id: record.id,
    livello: record.livello,
    classe: livello.classe,
    etichetta: livello.etichetta,
    titolo: record.titolo,
    motivazione: record.motivazione,
    fonti: record.fonti,
  };
}

function escapeHtml(valore) {
  return String(valore)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderIndicatore(record, percorsoPagina) {
  const pubblico = modelloPubblico(record);
  const pagina = path.basename(normalizzaPercorsoPagina(percorsoPagina), path.extname(percorsoPagina));
  const domId = `aff-v1-${pagina}-${record.id}`;
  const payload = encodeURIComponent(JSON.stringify(pubblico));
  const nome = `Mostra la base del giudizio: ${record.titolo}. Livello ${pubblico.etichetta}`;
  return `<button type="button" id="${escapeHtml(domId)}" class="aff-v1-trigger aff-v1-trigger--${pubblico.classe}" data-aff-v1-trigger data-aff-v1-record="${escapeHtml(payload)}" aria-label="${escapeHtml(nome)}" aria-expanded="false" aria-controls="aff-v1-panel">${escapeHtml(pubblico.etichetta)}</button>`;
}

module.exports = {
  ID_RE,
  LIVELLI,
  creaRegistry,
  modelloPubblico,
  normalizzaLivello,
  normalizzaPercorsoPagina,
  normalizzaSidecar,
  renderIndicatore,
};
