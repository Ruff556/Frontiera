const { buildSeo } = require("../_lib/seo");

module.exports = {
  // Una sola normalizzazione alimenta HTML, Open Graph, Twitter, JSON-LD e sitemap.
  seo: (data) => buildSeo(data),
};
