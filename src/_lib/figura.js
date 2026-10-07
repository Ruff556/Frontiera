"use strict";

// Solo validazione editoriale: rendering e derivati restano nel sistema media.
function normalizeFigura(img, misura = "4/4", lato = "left", file = "(sorgente sconosciuto)") {
  const fail = (message) => { throw new Error(`[figura] ${file}: ${message}`); };
  if (!img || typeof img !== "object" || Array.isArray(img)) {
    fail("immagine indefinita: controllare il riferimento immagini_inline.nome");
  }
  if (!["4/4", "2/4", "3/4"].includes(misura)) fail('misura ammessa: "4/4", "2/4", "3/4"');
  if (!["left", "right"].includes(lato)) fail('lato ammesso: "left", "right"');
  if (typeof img.file !== "string" || !/^\/immagini\/.+\.(?:jpe?g|png|webp|avif)$/i.test(img.file)) {
    fail("file deve essere un asset locale /immagini/... (JPEG, PNG, WebP o AVIF)");
  }
  if (!Object.hasOwn(img, "alt") || typeof img.alt !== "string" || (img.alt !== "" && !img.alt.trim())) {
    fail('alt obbligatorio: descrizione significativa oppure alt: "" esplicito per immagini decorative');
  }
  for (const field of ["didascalia", "credito", "fonte", "licenza"]) {
    if (img[field] !== undefined && typeof img[field] !== "string") fail(`${field} deve essere testo`);
  }
  if (img.fit !== undefined && !["contain", "cover"].includes(img.fit)) fail("fit ammesso: contain, cover");
  return {
    img: Object.fromEntries(["file", "alt", "didascalia", "credito", "fonte", "licenza"].map((key) => [key, img[key]])),
    misura: misura[0],
    lato: misura === "4/4" ? "block" : lato,
    fit: img.fit || "contain",
    profile: `figura${misura[0]}`,
  };
}

module.exports = { normalizeFigura };
