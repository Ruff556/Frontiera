module.exports = {
  tags: "analisi",
  layout: "layouts/analisi.njk",
  eleventyComputed: {
    // mappa il campo `data` del front matter sulla data Eleventy (ordinamento)
    date: (d) => d.data || d.date,
    permalink: (d) => `/analisi/${d.page.fileSlug}/index.html`,
    titoloPagina: (d) => d.titolo,
    descrizionePagina: (d) => d.sommario,
  },
};
