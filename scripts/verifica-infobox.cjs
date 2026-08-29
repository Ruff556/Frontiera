"use strict";

const assert = require("node:assert/strict");
const { normalizeInfobox } = require("../src/_lib/infobox");

const storico = {
  datazione: "2022–2023",
  luoghi: "Area operativa",
  intentoRusso: "Intento russo.",
  intentoUcraino: "Intento ucraino.",
  soluzione: "Soluzione.",
};

function normalize(options) {
  return normalizeInfobox({ file: "fixture.md", ...options });
}

function rejects(options, pattern) {
  assert.throws(() => normalize(options), pattern);
}

const f = normalize({ infobox: { tipo: 1 }, famiglia: "fasi", storico });
assert.equal(f.voci[1].etichetta, "Luoghi caldi del fronte");
assert.equal(f.voci[2].ruolo, "russo");

const p = normalize({ infobox: { tipo: 1 }, famiglia: "profondita", storico });
assert.equal(p.voci[1].etichetta, "Profondità interessata");

const genericType1 = normalize({
  infobox: { tipo: 1, voci: [{ etichetta: "Esito", testo: "Valore", ruolo: "evidenza" }] },
  famiglia: "analisi",
});
assert.equal(genericType1.voci[0].ruolo, "evidenza");

const type2 = normalize({
  infobox: { tipo: 2, titolo: "Sintesi", voci: [{ occhiello: "Strato", titolo: "Nome", testo: "Testo" }] },
});
assert.equal(type2.tipo, 2);

const type3 = normalize({
  infobox: {
    tipo: 3,
    gruppi: [
      { titolo: "Primo", voci: [{ nome: "A", descrizione: "Descrizione A" }] },
      { titolo: "Secondo", voci: [{ nome: "B", descrizione: "Descrizione B" }, { nome: "C", descrizione: "Descrizione C" }] },
    ],
  },
});
assert.equal(type3.gruppi.length, 2);
assert.equal(type3.gruppi[1].voci.length, 2);

const legacySpecifiche = normalize({ specifiche: { Rete: "Distribuita", Stato: "" } });
assert.equal(legacySpecifiche.tipo, 2);
assert.equal(legacySpecifiche.voci[1].testo, "— (segnaposto)");

const legacyVoci = normalize({ infobox: { voci: [{ testo: "Compatibilità" }] } });
assert.equal(legacyVoci.tipo, 2);

const source = {
  infobox: { tipo: 3, gruppi: [{ titolo: "Gruppo", voci: [{ nome: "Nome", descrizione: "Testo" }] }] },
  famiglia: "sistemi",
};
const snapshot = JSON.stringify(source);
normalize(source);
assert.equal(JSON.stringify(source), snapshot, "la normalizzazione non deve mutare i dati sorgente");

rejects({ infobox: { gruppi: [] } }, /infobox\.tipo/);
rejects({ infobox: { tipo: "2", voci: [{ testo: "x" }] } }, /numero intero 1, 2 o 3/);
rejects({ infobox: { tipo: 2.5, voci: [{ testo: "x" }] } }, /numero intero 1, 2 o 3/);
rejects({ infobox: { tipo: 4, voci: [{ testo: "x" }] } }, /numero intero 1, 2 o 3/);
rejects({ infobox: { tipo: 1 }, famiglia: "analisi" }, /richiede infobox\.voci/);
rejects({ infobox: { tipo: 1 }, famiglia: "fasi", storico: { ...storico, soluzione: "" } }, /soluzione/);
rejects({ infobox: { tipo: 1, voci: [] } }, /array non vuoto/);
rejects({ infobox: { tipo: 1, voci: [{ etichetta: "A", testo: "B", ruolo: "rosso" }] } }, /neutro, russo/);
rejects({ infobox: { tipo: 2, voci: "testo" } }, /array non vuoto/);
rejects({ infobox: { tipo: 2, voci: [{}] } }, /voce vuota/);
rejects({ infobox: { tipo: 2, voci: [{ testo: "" }] } }, /stringa non vuota/);
rejects({ infobox: { tipo: 3, gruppi: [] } }, /array non vuoto/);
rejects({ infobox: { tipo: 3, gruppi: [{ voci: [{ nome: "A", descrizione: "B" }] }] } }, /\.titolo/);
rejects({ infobox: { tipo: 3, gruppi: [{ titolo: "G", voci: [] }] } }, /array non vuoto/);
rejects({ infobox: { tipo: 3, gruppi: [{ titolo: "G", voci: [{ nome: "", descrizione: "B" }] }] } }, /\.nome/);
rejects({ infobox: { tipo: 3, gruppi: [{ titolo: "G", voci: [{ nome: "A", descrizione: "" }] }] } }, /\.descrizione/);
rejects({ infobox: { tipo: 3, voci: [{ testo: "chiave incompatibile" }], gruppi: [{ titolo: "G", voci: [{ nome: "A", descrizione: "B" }] }] } }, /chiave non prevista/);

console.log("Infobox: contratti 1/2/3, compatibilità, casi invalidi e immutabilità verificati.");
