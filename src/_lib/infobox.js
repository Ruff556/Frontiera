"use strict";

const TIPI_AMMESSI = new Set([1, 2, 3]);
const RUOLI_TIPO_1 = new Set(["neutro", "russo", "ucraino", "evidenza"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(file, message) {
  throw new Error(`[infobox] ${file || "(sorgente sconosciuto)"}: ${message}`);
}

function assertObject(value, file, path) {
  if (!isObject(value)) fail(file, `"${path}" deve essere un oggetto`);
}

function assertAllowedKeys(value, allowed, file, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(file, `chiave non prevista "${path}.${key}"`);
    }
  }
}

function requiredText(value, file, path) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(file, `"${path}" deve essere una stringa non vuota`);
  }
  return value;
}

function optionalText(value, file, path) {
  if (value === undefined) return undefined;
  return requiredText(value, file, path);
}

function requiredArray(value, file, path) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(file, `"${path}" deve essere un array non vuoto`);
  }
  return value;
}

function normalizeType1(box, context) {
  const { file, famiglia, storico = {} } = context;
  assertAllowedKeys(box, ["tipo", "titolo", "voci"], file, "infobox");
  const titolo = optionalText(box.titolo, file, "infobox.titolo");

  let voci;
  if (box.voci !== undefined) {
    voci = requiredArray(box.voci, file, "infobox.voci").map((voce, index) => {
      const path = `infobox.voci[${index}]`;
      assertObject(voce, file, path);
      assertAllowedKeys(voce, ["etichetta", "testo", "ruolo"], file, path);
      const ruolo = voce.ruolo === undefined ? "neutro" : requiredText(voce.ruolo, file, `${path}.ruolo`);
      if (!RUOLI_TIPO_1.has(ruolo)) {
        fail(file, `"${path}.ruolo" deve valere neutro, russo, ucraino o evidenza`);
      }
      return {
        etichetta: requiredText(voce.etichetta, file, `${path}.etichetta`),
        testo: requiredText(voce.testo, file, `${path}.testo`),
        ruolo,
      };
    });
  } else {
    if (famiglia !== "fasi" && famiglia !== "profondita") {
      fail(file, "il tipo 1 richiede infobox.voci fuori dalle famiglie F/P");
    }
    const etichettaLuoghi = famiglia === "profondita"
      ? "Profondità interessata"
      : "Luoghi caldi del fronte";
    const fields = [
      ["datazione", "Datazione", "neutro"],
      ["luoghi", etichettaLuoghi, "neutro"],
      ["intentoRusso", "Intento russo", "russo"],
      ["intentoUcraino", "Intento ucraino", "ucraino"],
      ["soluzione", "Soluzione caratterizzante", "evidenza"],
    ];
    voci = fields.map(([key, etichetta, ruolo]) => ({
      etichetta,
      testo: requiredText(storico[key], file, key),
      ruolo,
    }));
  }

  return { tipo: 1, ...(titolo ? { titolo } : {}), voci };
}

function normalizeType2(box, context) {
  const { file } = context;
  assertAllowedKeys(box, ["tipo", "titolo", "voci"], file, "infobox");
  const titolo = optionalText(box.titolo, file, "infobox.titolo");
  const voci = requiredArray(box.voci, file, "infobox.voci").map((voce, index) => {
    const path = `infobox.voci[${index}]`;
    assertObject(voce, file, path);
    assertAllowedKeys(voce, ["occhiello", "titolo", "testo"], file, path);
    const normalized = {};
    for (const key of ["occhiello", "titolo", "testo"]) {
      const value = optionalText(voce[key], file, `${path}.${key}`);
      if (value !== undefined) normalized[key] = value;
    }
    if (Object.keys(normalized).length === 0) {
      fail(file, `"${path}" non può essere una voce vuota`);
    }
    return normalized;
  });
  return { tipo: 2, ...(titolo ? { titolo } : {}), voci };
}

function normalizeType3(box, context) {
  const { file } = context;
  assertAllowedKeys(box, ["tipo", "titolo", "gruppi"], file, "infobox");
  const titolo = optionalText(box.titolo, file, "infobox.titolo");
  const gruppi = requiredArray(box.gruppi, file, "infobox.gruppi").map((gruppo, groupIndex) => {
    const path = `infobox.gruppi[${groupIndex}]`;
    assertObject(gruppo, file, path);
    assertAllowedKeys(gruppo, ["titolo", "voci"], file, path);
    return {
      titolo: requiredText(gruppo.titolo, file, `${path}.titolo`),
      voci: requiredArray(gruppo.voci, file, `${path}.voci`).map((voce, itemIndex) => {
        const itemPath = `${path}.voci[${itemIndex}]`;
        assertObject(voce, file, itemPath);
        assertAllowedKeys(voce, ["nome", "descrizione"], file, itemPath);
        return {
          nome: requiredText(voce.nome, file, `${itemPath}.nome`),
          descrizione: requiredText(voce.descrizione, file, `${itemPath}.descrizione`),
        };
      }),
    };
  });
  return { tipo: 3, ...(titolo ? { titolo } : {}), gruppi };
}

function fromSpecifiche(specifiche, file) {
  assertObject(specifiche, file, "specifiche");
  const entries = Object.entries(specifiche);
  if (entries.length === 0) return null;
  return {
    tipo: 2,
    titolo: "Specifiche",
    voci: entries.map(([key, value], index) => ({
      occhiello: requiredText(key, file, `specifiche[${index}].chiave`),
      testo: value === undefined || value === null || value === "" ? "— (segnaposto)" : String(value),
    })),
  };
}

function normalizeInfobox(options = {}) {
  const {
    infobox,
    famiglia = "generica",
    storico = {},
    specifiche,
    file,
  } = options;

  if (infobox === undefined || infobox === null) {
    return specifiche === undefined || specifiche === null
      ? null
      : fromSpecifiche(specifiche, file);
  }

  assertObject(infobox, file, "infobox");
  let tipo = infobox.tipo;
  // Compatibilità transitoria: il solo payload storico a voci è inequivocabilmente tipo 2.
  if (tipo === undefined && Array.isArray(infobox.voci)) tipo = 2;
  if (typeof tipo !== "number" || !Number.isInteger(tipo) || !TIPI_AMMESSI.has(tipo)) {
    fail(file, '"infobox.tipo" deve essere il numero intero 1, 2 o 3');
  }

  const box = { ...infobox, tipo };
  const context = { file, famiglia, storico };
  if (tipo === 1) return normalizeType1(box, context);
  if (tipo === 2) return normalizeType2(box, context);
  return normalizeType3(box, context);
}

module.exports = {
  normalizeInfobox,
  TIPI_AMMESSI,
  RUOLI_TIPO_1,
};
