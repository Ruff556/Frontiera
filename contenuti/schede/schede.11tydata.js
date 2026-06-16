module.exports = {
  tags: "schede",
  layout: "layouts/scheda.njk",
  eleventyComputed: {
    date: (d) => d.aggiornata || d.date,
    permalink: (d) => `/schede/${d.slug}/index.html`,
    titoloPagina: (d) => d.titolo,
    descrizionePagina: (d) => d.ruolo,
  },
};
