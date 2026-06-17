const rssPlugin = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(rssPlugin);

  // ---- Asset statici (passthrough) ----
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/immagini": "immagini" });

  // ---- File da NON trattare come pagine ----
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("brief_cowork_frontiera_v2.md");
  eleventyConfig.ignores.add("frontiera_prototipo.html");

  // ---- Collections ordinate (più recenti prima) ----
  eleventyConfig.addCollection("analisi", (c) =>
    c.getFilteredByTag("analisi").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("schede", (c) =>
    c.getFilteredByTag("schede").sort((a, b) =>
      (a.data.titolo || "").localeCompare(b.data.titolo || "", "it")
    )
  );

  // Carosello home: pezzi con in_evidenza:true; fallback ai più recenti.
  eleventyConfig.addCollection("inEvidenza", (c) => {
    const analisi = c.getFilteredByTag("analisi").sort((a, b) => b.date - a.date);
    const flagged = analisi.filter((i) => i.data.in_evidenza === true);
    return (flagged.length ? flagged : analisi).slice(0, 3);
  });

  // ---- Rimandi bidirezionali ----
  // Analisi -> schede: risolve gli slug in oggetti scheda.
  eleventyConfig.addFilter("schedeBySlug", (schede, slugs) => {
    if (!Array.isArray(slugs)) return [];
    return slugs
      .map((s) => (schede || []).find((item) => item.data.slug === s))
      .filter(Boolean);
  });
  // Scheda -> analisi: tutte le analisi che citano lo slug corrente (calcolato in build).
  eleventyConfig.addFilter("analisiPerScheda", (analisi, slug) =>
    (analisi || [])
      .filter((item) => (item.data.schede_collegate || []).includes(slug))
      .sort((a, b) => b.date - a.date)
  );

  // ---- Selettori per griglie ----
  eleventyConfig.addFilter("perSezione", (items, nome) =>
    (items || []).filter((i) => i.data.sezione === nome)
  );
  eleventyConfig.addFilter("perCategoria", (items, nome) =>
    (items || []).filter((i) => i.data.categoria === nome)
  );
  eleventyConfig.addFilter("limita", (items, n) => (items || []).slice(0, n));

  // ---- Filtro per dominio (archivi analisi) ----
  eleventyConfig.addFilter("perDominio", (items, dominio) => {
    if (!dominio || dominio === "tutto") return items;
    return (items || []).filter((i) => (i.data.domini || []).includes(dominio));
  });

  // ---- Shortcode affidabilità: {% aff "plausibile" %} ----
  const AFF = {
    confermato: { cls: "conf", label: "Confermato" },
    plausibile: { cls: "plaus", label: "Plausibile" },
    "non-verificato": { cls: "nonver", label: "Non verificato" },
    nonverificato: { cls: "nonver", label: "Non verificato" },
    disinformazione: { cls: "disinfo", label: "Probabile disinformazione" },
  };
  eleventyConfig.addShortcode("aff", (livello, testo) => {
    const key = String(livello || "").toLowerCase().trim();
    const m = AFF[key] || AFF["nonverificato"];
    return `<span class="aff aff--${m.cls}">${testo || m.label}</span>`;
  });
  // Badge affidabilità per card/slide (filtro, output | safe). Vuoto se assente.
  eleventyConfig.addFilter("affBadge", (livello) => {
    const m = AFF[String(livello || "").toLowerCase().trim()];
    return m ? `<span class="aff aff--${m.cls}">${m.label}</span>` : "";
  });

  // ---- Date helper (visualizzazione it) ----
  const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  eleventyConfig.addFilter("dataIt", (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getUTCDate()} ${MESI[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("dataMono", (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${String(dt.getUTCDate()).padStart(2, "0")} ${MESI[dt.getUTCMonth()].toUpperCase()} ${dt.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("isoData", (d) => (d ? new Date(d).toISOString() : ""));

  // ---- Nome sezione/categoria -> URL archivio ----
  const ARCH = {
    Attualità: "/archivio/attualita/",
    Strategia: "/archivio/strategia/",
    "Mezzi aerei": "/archivio/mezzi-aerei/",
    "Mezzi terrestri": "/archivio/mezzi-terrestri/",
    Droni: "/archivio/droni/",
  };
  eleventyConfig.addFilter("archivioUrl", (nome) => ARCH[nome] || "/");

  // ---- Estrai i ruoli unici dalle schede di una categoria (filtro opzionale) ----
  eleventyConfig.addFilter("ruoliUnici", (items) => {
    const set = new Set();
    (items || []).forEach((i) => {
      const r = i.data.specifiche && i.data.specifiche.Ruolo;
      if (r) set.add(r);
    });
    return [...set];
  });

  return {
    templateFormats: ["njk", "md", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "src/_includes",
      data: "src/_data",
      output: "_site",
    },
  };
};
