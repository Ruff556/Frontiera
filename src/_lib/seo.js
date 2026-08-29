"use strict";

const DEFAULT_DESCRIPTION_LENGTH = 160;

function stringValue(value) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function plainText(value) {
  return stringValue(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/{[%{][\s\S]*?[}%]}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]+/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, maximum = DEFAULT_DESCRIPTION_LENGTH) {
  const text = plainText(value);
  if (!text || text.length <= maximum) return text;
  const candidate = text.slice(0, Math.max(1, maximum - 1));
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary >= maximum * 0.65 ? boundary : candidate.length).trim()}…`;
}

function cleanBaseUrl(value) {
  const text = stringValue(value).trim();
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function absoluteUrl(value, baseUrl) {
  const source = stringValue(value).trim();
  const base = cleanBaseUrl(baseUrl);
  if (!source || !base) return "";
  try {
    const url = new URL(source, `${base}/`);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function tagsContain(tags, expected) {
  if (Array.isArray(tags)) return tags.includes(expected);
  return stringValue(tags).split(/[\s,]+/).includes(expected);
}

function isoDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

function normalizeImage(value, fallbackAlt = "") {
  if (typeof value === "string") return { file: value, alt: fallbackAlt };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const file = stringValue(value.file || value.url || value.src).trim();
  if (!file) return null;
  const width = Number(value.width);
  const height = Number(value.height);
  return {
    file,
    alt: plainText(value.alt) || fallbackAlt,
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
  };
}

function hasEditorialRights(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    plainText(value.credito) &&
    plainText(value.licenza)
  );
}

function titleFor(data, site) {
  return plainText(data.titoloPagina || data.titolo) || plainText(site.titolo);
}

function descriptionFor(data, site) {
  const source = [
    data.descrizionePagina,
    data.sommario,
    data.anteprima,
    data.ruolo,
    data.soluzione,
    site.descrizione,
    site.sottotitolo,
  ].find((value) => plainText(value));
  return truncate(source || "", DEFAULT_DESCRIPTION_LENGTH);
}

function pageFamily(data) {
  if (data.seoKind === "notFound") return "404";
  if (data.page?.url === "/") return "homepage";
  if (tagsContain(data.tags, "analisi")) return data.sezione === "Attualità" ? "attualita" : "strategia";
  if (tagsContain(data.tags, "fasi")) return "fasi";
  if (tagsContain(data.tags, "schede-profondita")) return "profondita";
  if (tagsContain(data.tags, "schede")) return "sistemi";
  if (data.page?.inputPath?.endsWith("/archivio.njk")) return "archivio";
  return "istituzionale";
}

function buildStructuredData(seo, site) {
  if (!seo.indexable || !seo.canonical) return "";
  const base = cleanBaseUrl(site.url);
  if (!base) return "";
  const organizationId = `${base}/#organization`;
  const websiteId = `${base}/#website`;
  const graph = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: site.titolo,
      url: `${base}/`,
      description: site.descrizione,
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${base}/`,
      name: site.titolo,
      description: site.descrizione,
      inLanguage: site.lingua,
      publisher: { "@id": organizationId },
    },
  ];

  const webPage = {
    "@type": "WebPage",
    "@id": `${seo.canonical}#webpage`,
    url: seo.canonical,
    name: seo.title,
    description: seo.description,
    inLanguage: site.lingua,
    isPartOf: { "@id": websiteId },
  };
  graph.push(webPage);

  if (seo.isAnalysis) {
    const article = {
      "@type": seo.family === "attualita" ? "NewsArticle" : "Article",
      "@id": `${seo.canonical}#article`,
      mainEntityOfPage: { "@id": webPage["@id"] },
      headline: seo.title,
      description: seo.description,
      inLanguage: site.lingua,
      articleSection: seo.articleSection,
      author: { "@id": organizationId },
      publisher: { "@id": organizationId },
    };
    if (seo.imageIsEditorial) article.image = seo.image.url;
    if (seo.publishedTime) article.datePublished = seo.publishedTime;
    if (seo.modifiedTime) article.dateModified = seo.modifiedTime;
    graph.push(article);
    webPage.mainEntity = { "@id": article["@id"] };
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replace(/</g, "\\u003c");
}

function buildSeo(data) {
  const site = data.site || {};
  const base = cleanBaseUrl(site.url);
  const family = pageFamily(data);
  const title = titleFor(data, site);
  const description = descriptionFor(data, site);
  const isHome = family === "homepage";
  const is404 = family === "404";
  const isArticle = ["attualita", "strategia", "fasi", "profondita", "sistemi"].includes(family);
  const isAnalysis = ["attualita", "strategia"].includes(family);
  const explicitImage = data.ogImage === false ? null : normalizeImage(data.ogImage, title);
  const editorialImage = !explicitImage && data.ogImage !== false && isAnalysis && hasEditorialRights(data.immagine)
    ? normalizeImage(data.immagine, title)
    : null;
  const fallbackImage = normalizeImage(site.ogImage, `${site.titolo} — ${site.sottotitolo}`);
  const selectedImage = explicitImage || editorialImage || fallbackImage;
  const pageUrl = stringValue(data.page?.url || (is404 ? "/404.html" : "/"));
  const canonical = is404 ? "" : absoluteUrl(pageUrl, base);
  const imageUrl = selectedImage ? absoluteUrl(selectedImage.file, base) : "";
  const publishedTime = isAnalysis ? isoDate(data.data || data.date) : "";
  const modifiedTime = family === "sistemi" ? isoDate(data.aggiornata) : isoDate(data.modificata);
  const robots = is404 || data.noindex === true
    ? "noindex, follow"
    : plainText(data.robots);
  const htmlTitle = isHome
    ? `${site.titolo} | ${site.titoloEsteso || "Analisi di tecnologia e strategia"}`
    : `${title} | ${site.titolo}`;

  const seo = {
    family,
    title,
    htmlTitle,
    description,
    canonical,
    ogType: isArticle ? "article" : "website",
    ogUrl: is404 ? absoluteUrl("/404.html", base) : canonical,
    robots,
    indexable: !is404 && !robots.toLowerCase().includes("noindex"),
    image: {
      url: imageUrl,
      alt: selectedImage?.alt || `${site.titolo} — ${site.sottotitolo}`,
      width: selectedImage?.width || null,
      height: selectedImage?.height || null,
    },
    imageIsEditorial: Boolean(editorialImage || explicitImage),
    isArticle,
    isAnalysis,
    articleSection: plainText(data.sezione || data.categoria || (
      family === "fasi" ? "Le fasi del conflitto" : family === "profondita" ? "Il filo della profondità" : ""
    )),
    publishedTime,
    modifiedTime,
    lastmod: isAnalysis ? publishedTime : family === "sistemi" ? modifiedTime : "",
  };
  seo.jsonLd = buildStructuredData(seo, site);
  return seo;
}

module.exports = {
  absoluteUrl,
  buildSeo,
  cleanBaseUrl,
  isoDate,
  plainText,
  truncate,
};
