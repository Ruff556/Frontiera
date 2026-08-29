// Data cascade della famiglia editoriale "profondità" (schede P).
// Rende le schede P0–P6 una vera famiglia di contenuti Eleventy, con layout,
// tag e permalink propri — al pari di analisi/schede/fasi — SENZA confluire in
// collections.fasi né comparire nella Linea F.
//
// L'URL è determinato dallo `slug` editoriale dichiarato nel front matter
// (stabile e indipendente dal nome fisico del file), non da page.fileSlug.
module.exports = {
  tags: "schede-profondita",
  layout: "layouts/scheda-profondita.njk",
  eleventyComputed: {
    permalink: (d) => `/profondita/${d.slug}/index.html`,
    titoloPagina: (d) => d.titolo,
    descrizionePagina: (d) => d.anteprima,
  },
};
