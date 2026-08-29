// Le 2 sezioni d'archivio pubbliche. Il progetto Frontiera è una pagina statica e Sistemi ha
// come indice pubblico la sezione #sistemi della homepage.
//
// Nuclei editoriali:
//   - Attualità  → analisi con punto d'ingresso nell'evento recente
//   - Strategia  → analisi teoriche / di lungo periodo
//   - Sistemi    → schede di riferimento indicizzate direttamente in homepage
//
// Le vecchie categorie segnaposto delle schede (Mezzi aerei, Mezzi terrestri,
// Droni) sono state unificate nell'unica sezione "Sistemi": la classificazione
// pubblica di una scheda è ora `categoria: Sistemi`.
module.exports = [
  {
    nome: "Attualità",
    slug: "attualita",
    tipo: "analisi",
    sezione: "Attualità",
    descrizione:
      "Gli avvenimenti correnti osservati attraverso una lente tecnica: cosa è successo, cosa implica, cosa resta da verificare.",
  },
  {
    nome: "Strategia",
    slug: "strategia",
    tipo: "analisi",
    sezione: "Strategia",
    descrizione:
      "Vedute d'insieme: dove i singoli eventi si compongono in tendenze di lungo periodo.",
  },
];
