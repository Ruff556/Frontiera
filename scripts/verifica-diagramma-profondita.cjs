"use strict";

/* =====================================================================
   VERIFICA DEL DIAGRAMMA DELLA PROFONDITÀ (schede P)
   ---------------------------------------------------------------------
   Controllo statico, senza dipendenze esterne e senza browser, eseguito
   PRIMA di Eleventy (npm run build). Verifica tre cose:

     1. la coerenza interna del vocabolario condiviso;
     2. la corrispondenza fra tassonomia dei nodi e sprite delle icone;
     3. il comportamento del motore di validazione e normalizzazione, su
        un fixture valido e su una batteria di contratti scorretti.

   Il caso non monotono di P2 (fascia intermedia non accessibile, fascia
   profonda episodica) è verificato esplicitamente come VALIDO: non è un
   errore di contratto ma un assetto reale, e il vettore deve risultare
   interrotto e poi autonomo, mai fittiziamente continuo.

   Uso: npm run verify:profondita
   ===================================================================== */

const fs = require("node:fs");
const path = require("node:path");

const {
  validateDiagrammaProfondita,
  normalizeDiagrammaProfondita,
  segmentaVettore,
} = require("../src/_lib/diagramma-profondita");
const vocabolario = require("../src/_data/profonditaVocabolario.js");

const ROOT = path.resolve(__dirname, "..");

const errori = [];
let controlli = 0;

function verifica(descrizione, condizione) {
  controlli += 1;
  if (!condizione) errori.push(descrizione);
}

/* Il contratto deve essere ACCETTATO. */
function accetta(descrizione, config) {
  controlli += 1;
  try {
    normalizeDiagrammaProfondita(config, { file: "fixture", id: "fixture" });
  } catch (errore) {
    errori.push(`${descrizione} — rifiutato: ${errore.message}`);
  }
}

/* Il contratto deve essere RIFIUTATO, e il messaggio deve essere parlante. */
function rifiuta(descrizione, config, frammentoAtteso) {
  controlli += 1;
  let messaggio = null;
  try {
    validateDiagrammaProfondita(config, { file: "fixture" });
  } catch (errore) {
    messaggio = errore.message;
  }
  if (messaggio === null) {
    errori.push(`${descrizione} — accettato, doveva fallire.`);
    return;
  }
  if (frammentoAtteso && !messaggio.toLowerCase().includes(frammentoAtteso.toLowerCase())) {
    errori.push(`${descrizione} — messaggio poco chiaro: “${messaggio}”.`);
  }
}

function unici(valori) {
  return new Set(valori).size === valori.length;
}

/* Copia profonda del fixture: ogni caso negativo parte da un contratto valido
   e altera una sola cosa. */
const clone = (valore) => JSON.parse(JSON.stringify(valore));

/* =====================================================================
   1. VOCABOLARIO CONDIVISO
   ===================================================================== */
const FASCE_ATTESE = ["contatto", "prossima", "intermedia", "profonda"];
const STATI_ATTESI = ["reiterabile", "limitato", "episodico", "non-accessibile"];
const ATTORI_ATTESI = ["ucraina", "russia"];
const TIPI_ATTESI = [
  "depositi", "comando", "logistica", "ferrovie", "ponti", "aeroporti", "difesa-aerea",
  "porti", "flotta", "energia", "raffinazione", "industria", "trasporti", "infrastrutture",
];

const chiaviFasce = vocabolario.fasce.map((f) => f.chiave);
verifica("vocabolario: le quattro fasce canoniche, nell'ordine", chiaviFasce.join(",") === FASCE_ATTESE.join(","));
verifica("vocabolario: etichette delle fasce uniche e non vuote",
  unici(vocabolario.fasce.map((f) => f.etichetta)) && vocabolario.fasce.every((f) => f.etichetta && f.distanza));
verifica("vocabolario: nessuna fascia denominata tattica/operativa/strategica",
  !vocabolario.fasce.some((f) => /tattic|operativ|strategic/i.test(`${f.chiave} ${f.etichetta}`)));

const chiaviStati = vocabolario.stati.map((s) => s.chiave);
verifica("vocabolario: i quattro stati canonici, nell'ordine", chiaviStati.join(",") === STATI_ATTESI.join(","));
verifica("vocabolario: etichette pubbliche degli stati uniche e non vuote",
  unici(vocabolario.stati.map((s) => s.etichetta)) && vocabolario.stati.every((s) => s.etichetta && s.etichettaBreve));
verifica("vocabolario: etichette brevi degli stati uniche", unici(vocabolario.stati.map((s) => s.etichettaBreve)));
verifica("vocabolario: grammatiche del vettore uniche", unici(vocabolario.stati.map((s) => s.vettore)));
verifica("vocabolario: un solo stato non accessibile",
  vocabolario.stati.filter((s) => s.accessibile === false).length === 1);
verifica("vocabolario: “protetto” non è uno stato", !chiaviStati.includes("protetto"));

verifica("vocabolario: i due attori, nell'ordine", vocabolario.attori.map((a) => a.chiave).join(",") === ATTORI_ATTESI.join(","));
verifica("vocabolario: denominazioni pubbliche degli attori uniche e complete",
  unici(vocabolario.attori.map((a) => a.nome)) &&
  unici(vocabolario.attori.map((a) => a.destinatario)) &&
  vocabolario.attori.every((a) => a.nome && a.destinatario && a.profonditaBersaglio));

const tipiNodo = Object.keys(vocabolario.nodi);
verifica("vocabolario: tassonomia iniziale dei nodi completa",
  TIPI_ATTESI.every((t) => tipiNodo.includes(t)) && tipiNodo.length === TIPI_ATTESI.length);
verifica("vocabolario: ogni tipo di nodo ha etichetta italiana e simbolo",
  tipiNodo.every((t) => vocabolario.nodi[t].etichetta && vocabolario.nodi[t].simbolo));
verifica("vocabolario: etichette dei nodi uniche", unici(tipiNodo.map((t) => vocabolario.nodi[t].etichetta)));
verifica("vocabolario: simboli dei nodi unici", unici(tipiNodo.map((t) => vocabolario.nodi[t].simbolo)));
verifica("vocabolario: testi infrastrutturali presenti",
  Boolean(vocabolario.testi.kicker && vocabolario.testi.notaMetodologica &&
          vocabolario.testi.watermark && vocabolario.testi.separatore));
verifica("vocabolario: limiti di leggibilità dichiarati",
  vocabolario.limiti.nodiPerAttore === 4 && vocabolario.limiti.nodiPerFascia === 4);
/* Il limite di fascia non deve mai superare il budget dell'attore: sarebbe una
   regola che non può mordere in nessun caso. */
verifica("vocabolario: limite di fascia coerente col budget dell'attore",
  vocabolario.limiti.nodiPerFascia <= vocabolario.limiti.nodiPerAttore);

/* La nota pubblica è UNA sola frase e riguarda solo che cosa il diagramma
   misura: il passaggio sulla normalizzazione delle fasce non ne fa più parte. */
const NOTA_ATTESA =
  "Nota metodologica: Il diagramma rappresenta la capacità effettiva di accesso — vettore, " +
  "disponibilità, integrazione, intelligence, libertà d’impiego, protezione avversaria e " +
  "reiterazione — non la gittata nominale dei sistemi.";
verifica("vocabolario: nota metodologica esattamente nel testo canonico",
  vocabolario.testi.notaMetodologica === NOTA_ATTESA);
verifica("vocabolario: nessun residuo dei blocchi interpretativi rimossi",
  vocabolario.testi.mutamento === undefined && vocabolario.testi.soglia === undefined);

/* =====================================================================
   2. SPRITE DELLE ICONE
   ===================================================================== */
const spriteFile = path.join(ROOT, vocabolario.sprite.file);
if (!fs.existsSync(spriteFile)) {
  errori.push(`sprite: file assente (${vocabolario.sprite.file}).`);
} else {
  const sprite = fs.readFileSync(spriteFile, "utf8");
  const simboli = [...sprite.matchAll(/<symbol[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  verifica("sprite: nessun simbolo duplicato", unici(simboli));
  for (const tipo of tipiNodo) {
    verifica(
      `sprite: manca il simbolo “${vocabolario.nodi[tipo].simbolo}” del tipo “${tipo}”`,
      simboli.includes(vocabolario.nodi[tipo].simbolo)
    );
  }
  verifica("sprite: nessun simbolo orfano (non dichiarato nel vocabolario)",
    simboli.every((id) => tipiNodo.some((t) => vocabolario.nodi[t].simbolo === id)));
  // Nessun riferimento remoto: si escludono i soli namespace XML dichiarati,
  // che sono URI di specifica e non risorse da scaricare.
  verifica("sprite: nessuna risorsa remota",
    !/(?:href|xlink:href|src)\s*=\s*["'][^"']*https?:/i.test(sprite) &&
    !/url\(\s*["']?https?:/i.test(sprite) &&
    !/@import/i.test(sprite));
  verifica("sprite: fuori dall'albero accessibile", sprite.includes('aria-hidden="true"'));
}

/* =====================================================================
   3. MOTORE — fixture valido
   ===================================================================== */
const FIXTURE = Object.freeze({
  versione: 1,
  dataAssetto: "2022-10-09",
  profili: {
    ucraina: {
      complesso: "Sistemi e catena d'attacco dominante",
      accesso: {
        contatto: { stato: "reiterabile" },
        prossima: { stato: "limitato" },
        intermedia: { stato: "episodico" },
        profonda: { stato: "non-accessibile" },
      },
      nodi: [{ tipo: "depositi", fascia: "prossima", etichetta: "Depositi di munizioni" }],
      limite: "Fattore dominante che interrompe o degrada l'accesso",
    },
    russia: {
      complesso: "Sistemi e catena d'attacco dominante",
      accesso: {
        contatto: { stato: "reiterabile" },
        prossima: { stato: "reiterabile" },
        intermedia: { stato: "limitato" },
        profonda: { stato: "episodico" },
      },
      nodi: [],
      limite: "Fattore dominante che interrompe o degrada l'accesso",
    },
  },
});

accetta("fixture valido", clone(FIXTURE));

const modello = normalizeDiagrammaProfondita(clone(FIXTURE), { file: "fixture", id: "fixture" });
verifica("modello: due corsie nell'ordine canonico",
  modello.corsie.map((c) => c.chiave).join(",") === ATTORI_ATTESI.join(","));
verifica("modello: quattro fasce per corsia, nell'ordine",
  modello.corsie.every((c) => c.fasce.map((f) => f.chiave).join(",") === FASCE_ATTESE.join(",")));
verifica("modello: data italiana derivata", modello.dataAssettoIt === "9 ottobre 2022");
verifica("modello: legenda limitata agli stati realmente presenti",
  modello.legenda.map((s) => s.chiave).join(",") === "reiterabile,limitato,episodico,non-accessibile");
verifica("modello: etichetta predefinita del nodo dal vocabolario",
  normalizeDiagrammaProfondita(
    (() => {
      const c = clone(FIXTURE);
      delete c.profili.ucraina.nodi[0].etichetta;
      return c;
    })(),
    { file: "fixture", id: "fixture" }
  ).corsie[0].fasce[1].nodi[0].etichetta === "Depositi");
verifica("modello: simbolo del nodo risolto dal vocabolario",
  modello.corsie[0].fasce[1].nodi[0].simbolo === vocabolario.nodi.depositi.simbolo);
verifica("modello: riepilogo accessibile completo",
  ["9 ottobre 2022", "Ucraina", "Russia", "Depositi di munizioni", "Complesso",
   "Limite dominante", "Nota metodologica"]
    .every((f) => modello.riepilogo.includes(f)));
verifica("modello: il riepilogo non cita più i blocchi rimossi",
  !/Mutamento prodotto|Soglia della fase/.test(modello.riepilogo));
verifica("modello: nota metodologica infrastrutturale, non editoriale",
  modello.notaMetodologica === vocabolario.testi.notaMetodologica &&
  modello.notaMetodologica === NOTA_ATTESA);
verifica("modello: nessun campo residuo nota/mutamento/soglia",
  modello.mutamento === undefined && modello.soglia === undefined &&
  modello.corsie.every((c) => c.fasce.every((f) => f.nota === undefined)));

/* legenda ridotta quando uno stato non compare in nessuna delle due corsie */
const soloDue = clone(FIXTURE);
for (const attore of ATTORI_ATTESI) {
  soloDue.profili[attore].accesso.contatto.stato = "reiterabile";
  soloDue.profili[attore].accesso.prossima.stato = "reiterabile";
  soloDue.profili[attore].accesso.intermedia.stato = "non-accessibile";
  soloDue.profili[attore].accesso.profonda.stato = "non-accessibile";
}
soloDue.profili.ucraina.nodi = [];
verifica("modello: la legenda contiene i soli stati presenti",
  normalizeDiagrammaProfondita(soloDue, { file: "fixture", id: "fixture" })
    .legenda.map((s) => s.chiave).join(",") === "reiterabile,non-accessibile");

/* =====================================================================
   4. MOTORE — contratti scorretti (la build deve fallire)
   ===================================================================== */
const guasto = (modifica) => {
  const c = clone(FIXTURE);
  modifica(c);
  return c;
};

rifiuta("diagramma assente", undefined, "obbligatorio");
rifiuta("versione non supportata", guasto((c) => { c.versione = 2; }), "versione");
rifiuta("dataAssetto non ISO", guasto((c) => { c.dataAssetto = "9 ottobre 2022"; }), "data iso");
rifiuta("dataAssetto inesistente", guasto((c) => { c.dataAssetto = "2022-02-30"; }), "data iso");
rifiuta("profilo mancante", guasto((c) => { delete c.profili.russia; }), "profilo obbligatorio");
rifiuta("fascia mancante", guasto((c) => { delete c.profili.ucraina.accesso.intermedia; }), "manca la fascia");
rifiuta("fascia sconosciuta", guasto((c) => { c.profili.ucraina.accesso.remota = { stato: "limitato" }; }), "chiave sconosciuta");
rifiuta("stato sconosciuto", guasto((c) => { c.profili.russia.accesso.profonda.stato = "protetto"; }), "stato");
rifiuta("complesso vuoto", guasto((c) => { c.profili.ucraina.complesso = "  "; }), "complesso");
rifiuta("limite vuoto", guasto((c) => { c.profili.russia.limite = ""; }), "limite");
rifiuta("nodi non array", guasto((c) => { c.profili.ucraina.nodi = { tipo: "depositi" }; }), "array");
/* Chiavi ritirate dalla revisione: non più ammesse, così un front matter che le
   conservasse fallirebbe invece di perderle in silenzio. */
rifiuta("nota discorsiva di fascia (chiave ritirata)",
  guasto((c) => { c.profili.ucraina.accesso.contatto.nota = "Testo discorsivo"; }), "chiave sconosciuta");
rifiuta("mutamento (chiave ritirata)",
  guasto((c) => { c.mutamento = "Trasformazione prodotta nella fase."; }), "chiave sconosciuta");
rifiuta("soglia (chiave ritirata)",
  guasto((c) => { c.soglia = "Relazione verificata dalla fase."; }), "chiave sconosciuta");
rifiuta("tipo di nodo sconosciuto",
  guasto((c) => { c.profili.ucraina.nodi[0].tipo = "caserme"; }), "tipo");
rifiuta("fascia del nodo sconosciuta",
  guasto((c) => { c.profili.ucraina.nodi[0].fascia = "retrovia"; }), "fascia");
rifiuta("nodo in fascia non accessibile",
  guasto((c) => { c.profili.ucraina.nodi[0].fascia = "profonda"; }), "non accessibile");
rifiuta("nodo duplicato",
  guasto((c) => { c.profili.ucraina.nodi.push(clone(c.profili.ucraina.nodi[0])); }), "duplicato");
rifiuta("più di quattro nodi per attore",
  guasto((c) => {
    c.profili.russia.nodi = ["contatto", "prossima", "intermedia", "profonda", "contatto"].map((fascia, i) => ({
      tipo: "depositi", fascia, etichetta: `Nodo ${i}`,
    }));
  }), "massimo per attore");
/* Quattro nodi nella stessa fascia sono ammessi: è l'intero budget dell'attore
   concentrato su un solo strato di profondità, non un aumento di densità. */
accetta("quattro nodi nella stessa fascia (budget dell'attore concentrato)",
  guasto((c) => {
    c.profili.russia.nodi = [0, 1, 2, 3].map((i) => ({
      tipo: "depositi", fascia: "prossima", etichetta: `Deposito ${i}`,
    }));
  }));
rifiuta("cinque nodi nella stessa fascia",
  guasto((c) => {
    c.profili.russia.nodi = [0, 1, 2, 3, 4].map((i) => ({
      tipo: "depositi", fascia: "prossima", etichetta: `Deposito ${i}`,
    }));
  }), "massimo");
rifiuta("refuso a livello di radice", guasto((c) => { c.profilo = c.profili; }), "chiave sconosciuta");
rifiuta("refuso a livello di profilo",
  guasto((c) => { c.profili.ucraina.nodo = []; }), "chiave sconosciuta");
rifiuta("refuso a livello di fascia",
  guasto((c) => { c.profili.ucraina.accesso.contatto.stati = "x"; }), "chiave sconosciuta");
rifiuta("refuso a livello di nodo",
  guasto((c) => { c.profili.ucraina.nodi[0].label = "x"; }), "chiave sconosciuta");
rifiuta("front matter con dati grafici",
  guasto((c) => { c.profili.ucraina.accesso.contatto.colore = "#fff"; }), "chiave sconosciuta");

/* =====================================================================
   5. NON MONOTONICITÀ — il caso di prova di P2
   ===================================================================== */
const nonMonotono = guasto((c) => {
  c.profili.ucraina.accesso.intermedia = { stato: "non-accessibile" };
  c.profili.ucraina.accesso.profonda = { stato: "episodico" };
  c.profili.ucraina.nodi = [
    { tipo: "depositi", fascia: "prossima", etichetta: "Retro operativo occupato" },
    { tipo: "aeroporti", fascia: "profonda", etichetta: "Engels-2 e Djagilevo" },
  ];
});
accetta("profilo NON monotono (intermedia non accessibile, profonda episodica)", nonMonotono);

const corsiaNM = normalizeDiagrammaProfondita(nonMonotono, { file: "fixture", id: "p2" }).corsie[0];
verifica("non monotono: la fascia intermedia interrompe davvero il vettore",
  corsiaNM.fasce[2].vettore.presente === false && corsiaNM.fasce[2].vettore.continua === false);
verifica("non monotono: nessuna punta di freccia oltre la fascia prossima",
  corsiaNM.fasce[1].vettore.punta === true && corsiaNM.fasce[1].vettore.continua === false);
verifica("non monotono: la fascia profonda è un segmento autonomo con punta",
  corsiaNM.fasce[3].vettore.presente === true &&
  corsiaNM.fasce[3].vettore.autonomo === true &&
  corsiaNM.fasce[3].vettore.punta === true);
verifica("non monotono: un nodo resta ammesso nella fascia profonda episodica",
  corsiaNM.fasce[3].nodi.length === 1);

/* segmentazione: comportamento puro, indipendente dal resto del modello */
const segmenti = segmentaVettore(["reiterabile", "reiterabile", "non-accessibile", "episodico"]);
verifica("segmentazione: contiguità nel primo tratto", segmenti[0].continua === true);
verifica("segmentazione: interruzione reale", segmenti[2].presente === false);
verifica("segmentazione: ripresa autonoma", segmenti[3].autonomo === true);
const tuttoPieno = segmentaVettore(["reiterabile", "reiterabile", "reiterabile", "reiterabile"]);
verifica("segmentazione: un solo tratto continuo con una sola punta",
  tuttoPieno.filter((s) => s.punta).length === 1 && tuttoPieno[3].punta === true);
const tuttoChiuso = segmentaVettore(FASCE_ATTESE.map(() => "non-accessibile"));
verifica("segmentazione: nessun vettore quando non c'è accesso",
  tuttoChiuso.every((s) => !s.presente && !s.punta && !s.autonomo));

/* =====================================================================
   ESITO
   ===================================================================== */
if (errori.length) {
  console.error(`[profondita:verify] FALLITO: ${errori.length} errore/i su ${controlli} controlli`);
  errori.forEach((errore) => console.error(`  - ${errore}`));
  process.exitCode = 1;
} else {
  console.log(
    `[profondita:verify] OK: ${controlli} controlli — vocabolario coerente, ` +
      `${tipiNodo.length} simboli presenti nello sprite, contratto valido accettato, ` +
      `contratti scorretti rifiutati, profilo non monotono ammesso e segmentato correttamente.`
  );
}
