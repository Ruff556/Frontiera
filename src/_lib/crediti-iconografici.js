"use strict";

const { createHash } = require("node:crypto");
const { DomUtils, parseDocument } = require("htmlparser2");

const campi = [
  ["credito", "Credito", "Riferimento per il credito"],
  ["fonte", "Fonte", "Fonte originale"],
  ["licenza", "Licenza", "Riferimento per la licenza"],
];
const testo = (value) => value == null ? "" : String(value).trim();
const classi = (node) => (node.attribs?.class || "").split(/\s+/);

function etichettaLink(url, generica) {
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;
  if (host === "creativecommons.org") {
    const cc = /^\/licenses\/(by|by-sa|by-nd|by-nc|by-nc-sa|by-nc-nd)\/(\d+\.\d+)(?:\/|$)/.exec(path);
    if (cc) return `Licenza CC ${cc[1].toUpperCase()} ${cc[2]}`;
    const pd = /^\/publicdomain\/(mark|zero)\/(\d+\.\d+)(?:\/|$)/.exec(path);
    if (pd) return `${pd[1] === "mark" ? "Public Domain Mark" : "CC0"} ${pd[2]}`;
  }
  if (host === "nationalarchives.gov.uk") {
    const ogl = /^\/doc\/open-government-licence\/version\/(\d+)(?:\/|$)/.exec(path);
    if (ogl) return `Open Government Licence v${ogl[1]}.0`;
  }
  if (host === "commons.wikimedia.org") {
    return /^\/wiki\/File:/i.test(path) ? "Scheda Wikimedia Commons" : "Riferimento Wikimedia Commons";
  }
  return generica;
}

function segmentiCredito(value, generica, linkify) {
  const segmenti = [];
  let fine = 0;
  for (const { schema, index, lastIndex, raw } of linkify.match(value) || []) {
    if (schema !== "http:" && schema !== "https:") continue;
    let url;
    try { url = new URL(raw); } catch { continue; }
    if (fine < index) segmenti.push({ testo: value.slice(fine, index) });
    segmenti.push({ testo: etichettaLink(url, generica), url: raw });
    fine = lastIndex;
  }
  if (fine < value.length) segmenti.push({ testo: value.slice(fine) });
  return segmenti;
}

// Il corpo serve anche al feed, dove la figura conserva i crediti completi.
// Il riferimento identifica il dato YAML senza duplicarlo nel corpo. Lo shortcode
// accetta anche oggetti passati direttamente, per i quali trasporta il modello.
function riferimentoFigura(img, dichiarate, modello) {
  const voce = Object.entries(dichiarate || {}).find(([, valore]) => valore === img);
  return JSON.stringify(voce ? voce[0] : modello.img);
}

function idInline(riferimento) {
  if (typeof riferimento !== "string") {
    return `asset-${createHash("sha256").update(JSON.stringify(riferimento)).digest("hex").slice(0, 16)}`;
  }
  // Il punto è riservato alle chiavi codificate, così non collidono con quelle ASCII.
  return /^[\w-]+$/.test(riferimento) ? `inline-${riferimento}` :
    `inline.${Buffer.from(riferimento).toString("base64url")}`;
}

function creditiIconografici(html, copertina, dichiarate, linkify, renderRichiamo) {
  const corpo = String(html || "");
  const registro = new Map();
  function aggiungi(img, chiave, copertina = false) {
    if (!registro.has(chiave)) {
      const nome = testo(img.didascalia) || testo(img.alt) || img.file.split("/").pop();
      registro.set(chiave, {
        id: `credito-immagine-${chiave}`,
        numero: String(registro.size + 1).padStart(2, "0"),
        nome,
        copertina,
        campi: campi.flatMap(([campo, etichetta, generica]) => {
          const value = testo(img[campo]);
          return value ? [{ etichetta, segmenti: segmentiCredito(value, generica, linkify) }] : [];
        }),
        usi: [],
      });
    }
    const voce = registro.get(chiave);
    const uso = { id: `immagine-${chiave}-${voce.usi.length + 1}` };
    voce.usi.push(uso);
    return { ...uso, voce };
  }

  const hero = copertina?.file ? aggiungi(copertina, "copertina", true) : null;
  if (!corpo.includes("data-credito-inline=")) return { corpo, hero, voci: [...registro.values()] };

  const documento = parseDocument(corpo, { withStartIndices: true, withEndIndices: true });
  const figure = DomUtils.findAll((node) =>
    node.name === "figure" && Object.hasOwn(node.attribs, "data-credito-inline"), documento.children);
  const modifiche = [];
  for (const figura of figure) {
    const riferimento = JSON.parse(figura.attribs["data-credito-inline"]);
    const img = typeof riferimento === "string" ? dichiarate?.[riferimento] : riferimento;
    const uso = aggiungi(img, idInline(riferimento));
    const fineApertura = corpo.indexOf(">", figura.startIndex);
    modifiche.push([figura.startIndex, fineApertura + 1,
      corpo.slice(figura.startIndex, fineApertura).replace(/ data-credito-inline="[^"]*"$/, "") +
      ` id="${uso.id}" tabindex="-1">`]);

    const didascalia = figura.children.find((node) => node.name === "figcaption");
    const diritti = didascalia?.children.find((node) => classi(node).includes("rights"));
    const richiamo = renderRichiamo(uso.voce).trim();
    if (diritti) {
      modifiche.push([diritti.startIndex, diritti.endIndex + 1, richiamo]);
    } else if (didascalia) {
      const chiusura = didascalia.endIndex + 1 - "</figcaption>".length;
      modifiche.push([chiusura, chiusura, richiamo]);
    } else {
      const chiusura = figura.endIndex + 1 - "</figure>".length;
      modifiche.push([chiusura, chiusura, `<figcaption>${richiamo}</figcaption>`]);
    }
  }

  // Gli indici del parser permettono di cambiare solo il markup delle figure.
  // Il resto dell'HTML mantiene esattamente il risultato del renderer Markdown.
  let inizio = 0;
  const frammenti = [];
  for (const [start, end, markup] of modifiche) {
    frammenti.push(corpo.slice(inizio, start), markup);
    inizio = end;
  }
  frammenti.push(corpo.slice(inizio));
  return { corpo: frammenti.join(""), hero, voci: [...registro.values()] };
}

module.exports = { creditiIconografici, riferimentoFigura };
