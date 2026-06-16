// Le 5 sezioni d'archivio. Metodo è una pagina statica, non un archivio.
// tipo: "analisi" (filtri per dominio) | "schede" (nessun filtro per dominio).
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
  {
    nome: "Mezzi aerei",
    slug: "mezzi-aerei",
    tipo: "schede",
    categoria: "Mezzi aerei",
    descrizione:
      "Schede di riferimento permanenti su velivoli e sistemi della componente aerea.",
  },
  {
    nome: "Mezzi terrestri",
    slug: "mezzi-terrestri",
    tipo: "schede",
    categoria: "Mezzi terrestri",
    descrizione:
      "Schede di riferimento permanenti su veicoli e sistemi della componente terrestre.",
  },
  {
    nome: "Droni",
    slug: "droni",
    tipo: "schede",
    categoria: "Droni",
    descrizione:
      "Schede di riferimento permanenti sui sistemi senza pilota, d'attacco e da ricognizione.",
  },
];
