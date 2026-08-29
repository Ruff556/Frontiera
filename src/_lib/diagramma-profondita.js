"use strict";

/* =====================================================================
   MOTORE DEL DIAGRAMMA DELLA PROFONDITÀ — schede P
   ---------------------------------------------------------------------
   Separazione degli strati, sullo stesso metodo della cartina di fase:

     front matter  → dati editoriali della singola fase (solo chiavi e testi)
     vocabolario   → ordini, etichette, tassonomie, simboli, testi fissi
     motore (qui)  → validazione, normalizzazione, derivazioni, riepilogo
     renderer      → partials/diagramma-profondita.njk (HTML semantico + CSS)

   Il motore non produce HTML editoriale: restituisce un MODELLO di dati
   già ordinato e già classificato. L'unico markup che attraversa questo
   file è lo sprite delle icone, risorsa infrastrutturale controllata del
   repository (mai contenuto proveniente dal front matter).

   Nessuna dipendenza esterna. Nessun JavaScript inviato al browser.
   ===================================================================== */

const fs = require("node:fs");
const path = require("node:path");

const vocabolario = require("../_data/profonditaVocabolario.js");

const RADICE = path.join(__dirname, "..", "..");

/* ---- indici derivati una sola volta dal vocabolario ---- */
const FASCE_ORDINE = vocabolario.fasce.map((f) => f.chiave);
const FASCIA_PER_CHIAVE = new Map(vocabolario.fasce.map((f) => [f.chiave, f]));
const STATO_PER_CHIAVE = new Map(vocabolario.stati.map((s) => [s.chiave, s]));
const ATTORI_ORDINE = vocabolario.attori.map((a) => a.chiave);
const ATTORE_PER_CHIAVE = new Map(vocabolario.attori.map((a) => [a.chiave, a]));

/* ---- chiavi ammesse ai livelli strutturali del contratto ----
   Servono a intercettare i refusi (`profilo:` per `profili:`,
   `stato:`/`stati:`, `nodo:`/`nodi:`) invece di ignorarli in silenzio. */
/* La fascia dichiara SOLTANTO il proprio stato: le note discorsive non fanno
   più parte del contratto e `nota`, `mutamento` e `soglia` sono ora chiavi non
   ammesse — un front matter che le conservi fa fallire la build invece di
   perderle in silenzio. La lettura interpretativa della fase resta affidata al
   corpo editoriale della scheda, non al diagramma. */
const CHIAVI_RADICE = ["versione", "dataAssetto", "profili"];
const CHIAVI_PROFILO = ["complesso", "accesso", "nodi", "limite"];
const CHIAVI_FASCIA = ["stato"];
const CHIAVI_NODO = ["tipo", "fascia", "etichetta"];

function elenco(valori) {
  return valori.join(", ");
}

/* Errore di contratto: sempre leggibile e sempre con il file sorgente. */
function fallisci(contesto, messaggio) {
  const dove = contesto && contesto.file ? ` [${contesto.file}]` : "";
  throw new Error(`[diagramma profondità]${dove} ${messaggio}`);
}

function isOggetto(valore) {
  return Boolean(valore) && typeof valore === "object" && !Array.isArray(valore);
}

function testoNonVuoto(valore) {
  return typeof valore === "string" && valore.trim().length > 0;
}

function chiaviSconosciute(oggetto, ammesse, contesto, dove) {
  const estranee = Object.keys(oggetto).filter((k) => !ammesse.includes(k));
  if (estranee.length) {
    fallisci(
      contesto,
      `${dove}: chiave sconosciuta ${elenco(estranee.map((k) => `“${k}”`))}. ` +
        `Chiavi ammesse: ${elenco(ammesse)}.`
    );
  }
}

/* Data ISO reale (non solo di forma corretta: 2022-02-30 è rifiutata). */
function dataIsoValida(valore) {
  if (typeof valore !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return null;
  const [anno, mese, giorno] = valore.split("-").map(Number);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));
  if (
    data.getUTCFullYear() !== anno ||
    data.getUTCMonth() !== mese - 1 ||
    data.getUTCDate() !== giorno
  ) {
    return null;
  }
  return data;
}

function dataItaliana(data) {
  return `${data.getUTCDate()} ${vocabolario.mesi[data.getUTCMonth()]} ${data.getUTCFullYear()}`;
}

/* =====================================================================
   VALIDAZIONE
   Fa fallire la build con un messaggio leggibile e il percorso del file.
   Non fallisce mai per un profilo NON MONOTONO: è un assetto reale
   (profondità raggiunta episodicamente oltre una fascia non accessibile).
   ===================================================================== */
function validateDiagrammaProfondita(config, contesto = {}) {
  if (config === undefined || config === null) {
    fallisci(
      contesto,
      "«diagrammaProfondita» è obbligatorio in ogni scheda P pubblicata: " +
        "il blocco manca nel front matter."
    );
  }
  if (!isOggetto(config)) {
    fallisci(contesto, "«diagrammaProfondita» deve essere una mappa YAML.");
  }
  chiaviSconosciute(config, CHIAVI_RADICE, contesto, "diagrammaProfondita");

  /* --- versione --- */
  if (!vocabolario.versioniSupportate.includes(config.versione)) {
    fallisci(
      contesto,
      `versione “${config.versione}” non supportata. ` +
        `Versioni ammesse: ${elenco(vocabolario.versioniSupportate)}.`
    );
  }

  /* --- data dell'assetto --- */
  if (!dataIsoValida(config.dataAssetto)) {
    fallisci(
      contesto,
      `dataAssetto “${config.dataAssetto ?? ""}” non è una data ISO valida (formato YYYY-MM-DD).`
    );
  }

  /* --- profili --- */
  if (!isOggetto(config.profili)) {
    fallisci(contesto, "«profili» deve essere una mappa con i due attori.");
  }
  chiaviSconosciute(config.profili, ATTORI_ORDINE, contesto, "profili");
  for (const attore of ATTORI_ORDINE) {
    if (!isOggetto(config.profili[attore])) {
      fallisci(contesto, `manca il profilo obbligatorio «${attore}».`);
    }
  }

  for (const attore of ATTORI_ORDINE) {
    const profilo = config.profili[attore];
    const dove = `profili.${attore}`;
    chiaviSconosciute(profilo, CHIAVI_PROFILO, contesto, dove);

    for (const campo of ["complesso", "limite"]) {
      if (!testoNonVuoto(profilo[campo])) {
        fallisci(contesto, `${dove}.${campo} è obbligatorio e non può essere vuoto.`);
      }
    }

    /* accesso: le quattro fasce canoniche, nessuna in più, nessuna in meno */
    if (!isOggetto(profilo.accesso)) {
      fallisci(contesto, `${dove}.accesso deve dichiarare le quattro fasce.`);
    }
    chiaviSconosciute(profilo.accesso, FASCE_ORDINE, contesto, `${dove}.accesso`);
    for (const fascia of FASCE_ORDINE) {
      const voce = profilo.accesso[fascia];
      if (!isOggetto(voce)) {
        fallisci(
          contesto,
          `${dove}.accesso: manca la fascia «${fascia}». ` +
            `Fasce obbligatorie: ${elenco(FASCE_ORDINE)}.`
        );
      }
      chiaviSconosciute(voce, CHIAVI_FASCIA, contesto, `${dove}.accesso.${fascia}`);
      if (!STATO_PER_CHIAVE.has(voce.stato)) {
        fallisci(
          contesto,
          `${dove}.accesso.${fascia}: stato “${voce.stato ?? ""}” sconosciuto. ` +
            `Stati ammessi: ${elenco([...STATO_PER_CHIAVE.keys()])}.`
        );
      }
    }

    /* nodi funzionali */
    const nodi = profilo.nodi === undefined ? [] : profilo.nodi;
    if (!Array.isArray(nodi)) {
      fallisci(contesto, `${dove}.nodi deve essere un array (anche vuoto: []).`);
    }
    if (nodi.length > vocabolario.limiti.nodiPerAttore) {
      fallisci(
        contesto,
        `${dove}.nodi: ${nodi.length} nodi dichiarati, il massimo per attore è ` +
          `${vocabolario.limiti.nodiPerAttore}.`
      );
    }
    const visti = new Set();
    const perFascia = new Map();
    nodi.forEach((nodo, indice) => {
      const doveNodo = `${dove}.nodi[${indice}]`;
      if (!isOggetto(nodo)) fallisci(contesto, `${doveNodo} deve essere una mappa YAML.`);
      chiaviSconosciute(nodo, CHIAVI_NODO, contesto, doveNodo);
      if (!Object.prototype.hasOwnProperty.call(vocabolario.nodi, nodo.tipo)) {
        fallisci(
          contesto,
          `${doveNodo}: tipo “${nodo.tipo ?? ""}” sconosciuto. ` +
            `Tipi ammessi: ${elenco(Object.keys(vocabolario.nodi))}.`
        );
      }
      if (!FASCIA_PER_CHIAVE.has(nodo.fascia)) {
        fallisci(
          contesto,
          `${doveNodo}: fascia “${nodo.fascia ?? ""}” sconosciuta. ` +
            `Fasce ammesse: ${elenco(FASCE_ORDINE)}.`
        );
      }
      if (nodo.etichetta !== undefined && !testoNonVuoto(nodo.etichetta)) {
        fallisci(contesto, `${doveNodo}.etichetta, se presente, deve essere un testo.`);
      }
      /* Un nodo non può stare dove l'attore non ha accesso nella fase. */
      const statoFascia = profilo.accesso[nodo.fascia].stato;
      if (!STATO_PER_CHIAVE.get(statoFascia).accessibile) {
        fallisci(
          contesto,
          `${doveNodo}: nodo collocato nella fascia «${nodo.fascia}», dichiarata ` +
            `“${statoFascia}” per «${attore}». Una fascia non accessibile non può ospitare nodi.`
        );
      }
      const etichetta = testoNonVuoto(nodo.etichetta)
        ? nodo.etichetta.trim()
        : vocabolario.nodi[nodo.tipo].etichetta;
      const impronta = `${nodo.tipo}|${nodo.fascia}|${etichetta}`;
      if (visti.has(impronta)) {
        fallisci(contesto, `${doveNodo}: nodo duplicato (${nodo.tipo} · ${nodo.fascia} · ${etichetta}).`);
      }
      visti.add(impronta);
      perFascia.set(nodo.fascia, (perFascia.get(nodo.fascia) || 0) + 1);
    });
    for (const [fascia, quanti] of perFascia.entries()) {
      if (quanti > vocabolario.limiti.nodiPerFascia) {
        fallisci(
          contesto,
          `${dove}.nodi: ${quanti} nodi nella fascia «${fascia}», il massimo per fascia è ` +
            `${vocabolario.limiti.nodiPerFascia} (leggibilità del diagramma).`
        );
      }
    }
  }

  return true;
}

/* =====================================================================
   SEGMENTAZIONE DEL VETTORE
   Il vettore non è una freccia unica che attraversa tutte le fasce: è una
   sequenza di segmenti derivata dai soli stati.
     · segmenti contigui quando l'accesso continua;
     · interruzione reale in una fascia non accessibile;
     · segmento autonomo se l'accesso riappare oltre la discontinuità;
     · punta di freccia al termine di ogni tratto accessibile.
   Nessuna lunghezza, nessuna coordinata, nessun dato grafico nel front
   matter: qui si producono soltanto flag booleani per il renderer.
   ===================================================================== */
function segmentaVettore(statiCorsia) {
  const accessibili = statiCorsia.map((chiave) => STATO_PER_CHIAVE.get(chiave).accessibile);
  return statiCorsia.map((chiave, i) => {
    const stato = STATO_PER_CHIAVE.get(chiave);
    const presente = accessibili[i];
    return {
      tipo: stato.vettore,
      presente,
      /* prosegue nella fascia successiva: il tratto scavalca lo stacco */
      continua: presente && Boolean(accessibili[i + 1]),
      /* fine del tratto: qui va la punta di freccia */
      punta: presente && !accessibili[i + 1],
      /* riparte oltre una discontinuità: tratto episodico autonomo */
      autonomo: presente && i > 0 && !accessibili[i - 1],
    };
  });
}

/* =====================================================================
   SPRITE DELLE ICONE
   Incorporato una sola volta per pagina: così i simboli ereditano
   `currentColor` dalla corsia (un <use> verso un file esterno non eredita
   il colore del documento ospite e resterebbe illeggibile sul vetro scuro).
   ===================================================================== */
let spriteCache = null;
function spriteInline() {
  if (spriteCache === null) {
    const file = path.join(RADICE, vocabolario.sprite.file);
    if (!fs.existsSync(file)) {
      fallisci({}, `sprite delle icone non trovato: ${vocabolario.sprite.file}.`);
    }
    spriteCache = fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*\?>\s*/i, "").trim();
  }
  return spriteCache;
}

/* Identificatore stabile e unico per titolo e descrizione accessibile. */
function identificatore(idScheda) {
  const base = String(idScheda || "scheda")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `depth-${base || "scheda"}`;
}

/* =====================================================================
   RIEPILOGO TESTUALE ACCESSIBILE
   Ricostruisce a parole l'intero contenuto della figura: data, profili,
   complesso, qualità dell'accesso fascia per fascia, funzioni colpite, limiti
   dominanti e nota metodologica. Nessun testo è compilato a mano nel front
   matter, e nulla resta disponibile alla sola vista.
   ===================================================================== */
function diagrammaProfonditaAria(modello) {
  const parti = [`Diagramma della profondità contesa; assetto al ${modello.dataAssettoIt}.`];
  for (const corsia of modello.corsie) {
    const fasce = corsia.fasce.map((f) => {
      const nodi = f.nodi.length
        ? ` Funzioni: ${f.nodi.map((n) => `${n.etichetta} (${n.tipoEtichetta})`).join("; ")}.`
        : "";
      return `${f.etichetta}, ${f.distanza}: ${f.statoEtichetta.toLowerCase()}.${nodi}`;
    });
    parti.push(
      `${corsia.nome}, ${corsia.destinatario.toLowerCase()}. ` +
        `${modello.etichette.complesso}: ${corsia.complesso}. ` +
        `${fasce.join(" ")} ${modello.etichette.limite}: ${corsia.limite}.`
    );
  }
  parti.push(modello.notaMetodologica);
  return parti.join(" ");
}

/* =====================================================================
   NORMALIZZAZIONE
   Dal contratto editoriale al modello di rendering: ordini, etichette
   pubbliche, classi semantiche, segmentazione dei vettori, legenda dei
   soli stati presenti, etichette e simboli dei nodi, data italiana,
   riepilogo accessibile, nota metodologica.
   ===================================================================== */
function normalizeDiagrammaProfondita(config, contesto = {}) {
  validateDiagrammaProfondita(config, contesto);

  const dataAssetto = dataIsoValida(config.dataAssetto);
  const statiPresenti = new Set();

  const corsie = ATTORI_ORDINE.map((chiaveAttore) => {
    const attore = ATTORE_PER_CHIAVE.get(chiaveAttore);
    const profilo = config.profili[chiaveAttore];
    const nodi = Array.isArray(profilo.nodi) ? profilo.nodi : [];

    const statiCorsia = FASCE_ORDINE.map((fascia) => profilo.accesso[fascia].stato);
    const vettori = segmentaVettore(statiCorsia);

    const fasce = vocabolario.fasce.map((fascia, i) => {
      const voce = profilo.accesso[fascia.chiave];
      const stato = STATO_PER_CHIAVE.get(voce.stato);
      statiPresenti.add(stato.chiave);
      return {
        chiave: fascia.chiave,
        etichetta: fascia.etichetta,
        distanza: fascia.distanza,
        stato: stato.chiave,
        statoEtichetta: stato.etichetta,
        statoBreve: stato.etichettaBreve,
        accessibile: stato.accessibile,
        nodi: nodi
          .filter((n) => n.fascia === fascia.chiave)
          .map((n) => {
            const tipo = vocabolario.nodi[n.tipo];
            return {
              tipo: n.tipo,
              tipoEtichetta: tipo.etichetta,
              etichetta: testoNonVuoto(n.etichetta) ? n.etichetta.trim() : tipo.etichetta,
              simbolo: tipo.simbolo,
            };
          }),
        vettore: vettori[i],
      };
    });

    return {
      chiave: attore.chiave,
      nome: attore.nome,
      profonditaBersaglio: attore.profonditaBersaglio,
      destinatario: attore.destinatario,
      complesso: config.profili[chiaveAttore].complesso.trim(),
      limite: config.profili[chiaveAttore].limite.trim(),
      fasce,
    };
  });

  const modello = {
    id: identificatore(contesto.id),
    versione: config.versione,
    dataAssetto: config.dataAssetto,
    dataAssettoIt: dataItaliana(dataAssetto),
    kicker: vocabolario.testi.kicker,
    watermark: vocabolario.testi.watermark,
    notaMetodologica: vocabolario.testi.notaMetodologica,
    etichette: vocabolario.testi,
    fasce: vocabolario.fasce.map((f) => ({
      chiave: f.chiave,
      etichetta: f.etichetta,
      distanza: f.distanza,
    })),
    corsie,
    /* legenda: soltanto gli stati realmente presenti, in ordine canonico */
    legenda: vocabolario.stati
      .filter((s) => statiPresenti.has(s.chiave))
      .map((s) => ({ chiave: s.chiave, etichetta: s.etichetta, significato: s.significato })),
    sprite: vocabolario.sprite.percorso,
    spriteInline: spriteInline(),
  };

  modello.riepilogo = diagrammaProfonditaAria(modello);
  return modello;
}

module.exports = {
  validateDiagrammaProfondita,
  normalizeDiagrammaProfondita,
  diagrammaProfonditaAria,
  segmentaVettore,
  dataIsoValida,
  dataItaliana,
  vocabolario,
};
