"use strict";

/* =====================================================================
   VOCABOLARIO CONDIVISO — "Il filo della profondità" (schede P)
   ---------------------------------------------------------------------
   Fonte canonica UNICA di tutto ciò che non appartiene alla singola fase:
   ordine ed etichette delle fasce, ordine ed etichette degli stati di
   accesso, attori e denominazioni pubbliche, tassonomia dei nodi
   funzionali con il rispettivo simbolo, testi infrastrutturali (kicker,
   intestazioni, nota metodologica, watermark).

   Il front matter di una scheda P dichiara SOLTANTO dati di fase: chiavi
   di fascia, chiavi di stato, tipi di nodo, testi editoriali. Non conosce
   colori, classi, percorsi delle icone, coordinate, lunghezze o legenda.

   Registrato in src/_data/: è disponibile come dato globale Eleventy
   (`profonditaVocabolario`) ed è richiesto direttamente da
   src/_lib/diagramma-profondita.js e dallo script di verifica.

   Aggiungere un nuovo TIPO DI NODO = due gesti, entrambi qui e nello
   sprite: una voce in NODI (etichetta + simbolo) e un <symbol> con lo
   stesso id in src/immagini/profondita/icone-profondita.svg.
   ===================================================================== */

/* Versioni del contratto `diagrammaProfondita` accettate dalla build. */
const VERSIONI_SUPPORTATE = Object.freeze([1]);

/* ---------------------------------------------------------------------
   FASCE — spaziali, normalizzate, di uguale larghezza semantica.
   L'ordine dell'array È l'ordine di lettura, dal contatto verso la
   profondità avversaria. Le distanze sono orientative e dichiarate come
   testo: non esiste alcuna scala proporzionale (l'ultima fascia è aperta).
   Le fasce NON si chiamano "tattica", "operativa" o "strategica": la
   natura tattica/operativa/strategica appartiene alle funzioni colpite,
   non a una soglia chilometrica.
   --------------------------------------------------------------------- */
const FASCE = Object.freeze([
  Object.freeze({ chiave: "contatto", etichetta: "Contatto", distanza: "0–30 km" }),
  Object.freeze({ chiave: "prossima", etichetta: "Fascia prossima", distanza: "30–100 km" }),
  Object.freeze({ chiave: "intermedia", etichetta: "Fascia intermedia", distanza: "100–300 km" }),
  Object.freeze({ chiave: "profonda", etichetta: "Fascia profonda", distanza: "oltre 300 km" }),
]);

/* ---------------------------------------------------------------------
   STATI DI ACCESSO — appartengono alla singola corsia, non alla fascia in
   astratto, e non devono essere monotoni: una profondità lontana può
   essere raggiunta episodicamente anche quando la fascia intermedia non è
   accessibile come campagna.

   `accessibile` governa la segmentazione automatica del vettore;
   `vettore` è la grammatica del tratto (mai il colore da solo);
   `etichetta` è la denominazione pubblica normativa, `etichettaBreve` la
   sua forma compatta per il badge dentro la fascia.

   "protetto" NON è uno stato: protezione e accessibilità non sono
   alternative (un bersaglio può essere protetto e tuttavia accessibile).
   --------------------------------------------------------------------- */
const STATI = Object.freeze([
  Object.freeze({
    chiave: "reiterabile",
    etichetta: "Accesso reiterabile",
    etichettaBreve: "Reiterabile",
    significato: "pressione sostenibile o ripetibile come campagna",
    accessibile: true,
    vettore: "pieno",
  }),
  Object.freeze({
    chiave: "limitato",
    etichetta: "Accesso limitato o contestato",
    etichettaBreve: "Limitato",
    significato:
      "accesso reale ma degradato da difesa, disponibilità, targeting, autorizzazioni o reiterazione insufficiente",
    accessibile: true,
    vettore: "attenuato",
  }),
  Object.freeze({
    chiave: "episodico",
    etichetta: "Accesso episodico",
    etichettaBreve: "Episodico",
    significato: "penetrazione dimostrata senza capacità di campagna",
    accessibile: true,
    vettore: "discontinuo",
  }),
  Object.freeze({
    chiave: "non-accessibile",
    etichetta: "Non accessibile nella fase",
    etichettaBreve: "Non accessibile",
    significato:
      "profondità non convertibile in effetto in modo militarmente significativo nella fase",
    accessibile: false,
    vettore: "assente",
  }),
]);

/* ---------------------------------------------------------------------
   ATTORI — due corsie parallele, entrambe lette dalla linea del contatto
   verso la profondità AVVERSARIA e nella stessa direzione. Nessuna metà
   speculare, nessun asse invertito: la contrapposizione è resa
   dall'identità dell'attore, dal destinatario, dal colore e dall'etichetta.
   --------------------------------------------------------------------- */
const ATTORI = Object.freeze([
  Object.freeze({
    chiave: "ucraina",
    nome: "Ucraina",
    profonditaBersaglio: "profondità russa",
    destinatario: "Accesso alla profondità russa",
  }),
  Object.freeze({
    chiave: "russia",
    nome: "Russia",
    profonditaBersaglio: "profondità ucraina",
    destinatario: "Accesso alla profondità ucraina",
  }),
]);

/* ---------------------------------------------------------------------
   TASSONOMIA DEI NODI FUNZIONALI — funzioni colpite o minacciate, non
   inventario geografico. Ogni tipo ha un'etichetta italiana predefinita
   (il front matter può precisarla) e un simbolo dello sprite locale.
   --------------------------------------------------------------------- */
const NODI = Object.freeze({
  depositi: Object.freeze({ etichetta: "Depositi", simbolo: "nodo-depositi" }),
  comando: Object.freeze({ etichetta: "Comando", simbolo: "nodo-comando" }),
  logistica: Object.freeze({ etichetta: "Logistica", simbolo: "nodo-logistica" }),
  ferrovie: Object.freeze({ etichetta: "Ferrovie", simbolo: "nodo-ferrovie" }),
  ponti: Object.freeze({ etichetta: "Ponti", simbolo: "nodo-ponti" }),
  aeroporti: Object.freeze({ etichetta: "Aeroporti", simbolo: "nodo-aeroporti" }),
  "difesa-aerea": Object.freeze({ etichetta: "Difesa aerea", simbolo: "nodo-difesa-aerea" }),
  porti: Object.freeze({ etichetta: "Porti", simbolo: "nodo-porti" }),
  flotta: Object.freeze({ etichetta: "Flotta", simbolo: "nodo-flotta" }),
  energia: Object.freeze({ etichetta: "Energia", simbolo: "nodo-energia" }),
  raffinazione: Object.freeze({ etichetta: "Raffinazione", simbolo: "nodo-raffinazione" }),
  industria: Object.freeze({ etichetta: "Industria", simbolo: "nodo-industria" }),
  trasporti: Object.freeze({ etichetta: "Trasporti", simbolo: "nodo-trasporti" }),
  infrastrutture: Object.freeze({ etichetta: "Infrastrutture", simbolo: "nodo-infrastrutture" }),
});

/* Sprite locale delle icone: `percorso` è l'URL pubblico (passthrough di
   src/immagini), `file` il percorso nel repository usato in build per
   incorporarlo una sola volta nella pagina — così i simboli ereditano
   `currentColor` dalla corsia e restano leggibili sul vetro scuro. */
const SPRITE = Object.freeze({
  percorso: "/immagini/profondita/icone-profondita.svg",
  file: "src/immagini/profondita/icone-profondita.svg",
});

/* Limiti di leggibilità del componente (non estetici: strutturali).
   `nodiPerAttore` è il vero tetto editoriale: è il budget che impedisce al
   diagramma di diventare un inventario. `nodiPerFascia` protegge invece la
   singola colonna dall'affollamento; portato a quattro, consente a una fase di
   concentrare l'intero budget in una sola fascia — assetto reale quando la
   campagna si addensa su un unico strato di profondità (P5) — senza aumentare
   di un solo nodo la densità complessiva della figura. Con i due valori pari,
   il limite di fascia può essere raggiunto ma non superato da solo: chi lo
   supera supera anche il budget dell'attore. Resta dichiarato perché torna a
   mordere se un giorno il budget per attore venisse alzato. */
const LIMITI = Object.freeze({
  nodiPerAttore: 4,
  nodiPerFascia: 4,
});

/* Testi infrastrutturali: mai nel front matter.
   La nota metodologica pubblica è UNA sola frase e riguarda l'unica cosa che il
   lettore non può dedurre dalla figura: che cosa misura il diagramma. Il fatto
   che le quattro fasce siano normalizzate e di uguale larghezza semantica resta
   un principio dell'architettura (docs/diagramma-profondita/ARCHITETTURA.md) e
   non appesantisce più l'apparato pubblico. */
const TESTI = Object.freeze({
  kicker: "Profondità contesa",
  watermark: "Frontiera",
  legenda: "Grammatica degli stati",
  complesso: "Complesso",
  limite: "Limite dominante",
  separatore: "·",
  notaMetodologica:
    "Nota metodologica: Il diagramma rappresenta la capacità effettiva di accesso — vettore, " +
    "disponibilità, integrazione, intelligence, libertà d’impiego, protezione avversaria e " +
    "reiterazione — non la gittata nominale dei sistemi.",
});

/* Mesi in italiano per la data dell'assetto (nessuna dipendenza esterna). */
const MESI = Object.freeze([
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
]);

module.exports = {
  versioniSupportate: VERSIONI_SUPPORTATE,
  fasce: FASCE,
  stati: STATI,
  attori: ATTORI,
  nodi: NODI,
  sprite: SPRITE,
  limiti: LIMITI,
  testi: TESTI,
  mesi: MESI,
};
