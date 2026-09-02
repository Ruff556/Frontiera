const fs = require("fs");
const path = require("path");
const rssPlugin = require("@11ty/eleventy-plugin-rss");
const siteData = require("./src/_data/site");
// @11ty/eleventy-img 7 è ESM-only: viene importato una volta nel lifecycle
// asincrono, prima che Nunjucks invochi il filtro sincrono di rendering.
let Image;
const {
  cartinaAriaLabel,
  cartinaCategories,
  cartinaTerritorySummary,
  renderCartinaSvg,
} = require("./src/_lib/cartina");
// Motore del diagramma della profondità (schede P): importato UNA sola volta e
// usato in due punti — la validazione della collezione schedeProfondita e il
// filtro di normalizzazione consumato dal partial.
const {
  validateDiagrammaProfondita,
  normalizeDiagrammaProfondita,
  vocabolario: profonditaVocabolario,
} = require("./src/_lib/diagramma-profondita");
const { normalizeInfobox } = require("./src/_lib/infobox");
const {
  creaRegistry: creaRegistryAffidabilitaV1,
  renderIndicatore: renderIndicatoreAffidabilitaV1,
} = require("./src/_lib/affidabilita-v1");

// Profili commisurati ai componenti reali. Il fallback mantiene il formato
// sorgente, mentre WebP è la sorgente moderna principale del <picture>.
const IMAGE_PROFILES = Object.freeze({
  carousel: {
    widths: [480, 768, 960, 1280],
    sizes: "(min-width: 880px) min(42vw, 36rem), calc(100vw - 2rem)",
  },
  timeline: {
    widths: [360, 640, 960],
    sizes: "(min-width: 1000px) 40vw, 88vw",
  },
  systemCard: {
    widths: [360, 640, 960],
    sizes: "(min-width: 1120px) 30vw, (min-width: 700px) 46vw, 92vw",
  },
  archiveCard: {
    widths: [360, 640, 960],
    sizes: "(min-width: 960px) 30vw, (min-width: 620px) 46vw, calc(100vw - 2rem)",
  },
  phasePanel: {
    widths: [360, 640, 960],
    sizes: "(min-width: 900px) 38vw, calc(100vw - 2rem)",
  },
  articleHero: {
    widths: [640, 960, 1280, 1600],
    sizes: "(min-width: 1020px) min(53vw, 48rem), calc(100vw - 2rem)",
  },
  lightboxInline: {
    widths: [640, 960, 1280, 1600],
    sizes: "(min-width: 900px) 20rem, calc(100vw - 2rem)",
  },
});
const RESPONSIVE_WIDTHS = [...new Set(
  Object.values(IMAGE_PROFILES).flatMap((profile) => profile.widths)
)].sort((a, b) => a - b);
const responsiveMetadata = new Map();
let responsiveOutputPrepared = false;

function imageSourcePath(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.startsWith("/immagini/")) {
    throw new Error(`[immagini responsive] percorso non supportato: ${publicUrl}`);
  }
  const relative = publicUrl.replace(/^\/immagini\//, "");
  const source = path.resolve(__dirname, "src", "immagini", relative);
  const imageRoot = path.resolve(__dirname, "src", "immagini") + path.sep;
  if (!source.startsWith(imageRoot) || !fs.existsSync(source)) {
    throw new Error(`[immagini responsive] originale assente: ${publicUrl}`);
  }
  return source;
}

function findEditorialImageUrls() {
  const roots = ["contenuti", "src"];
  const urls = new Set();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(?:md|njk|json|js)$/i.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const match of text.matchAll(/^\s*file:\s*(\/immagini\/[^\s#]+)\s*$/gm)) {
          if (/\.(?:jpe?g|png|webp|avif)$/i.test(match[1])) urls.add(match[1]);
        }
      }
    }
  };
  roots.map((root) => path.join(__dirname, root)).filter(fs.existsSync).forEach(visit);
  return [...urls].sort();
}

function metadataForProfile(metadata, profile) {
  const selected = {};
  const wanted = new Set(profile.widths);
  const maximum = Math.max(...profile.widths);
  for (const [format, entries] of Object.entries(metadata)) {
    const eligible = entries.filter((entry) => entry.width <= maximum);
    const exact = eligible.filter((entry) => wanted.has(entry.width));
    const largestEligible = eligible.at(-1);
    if (largestEligible && !exact.some((entry) => entry.width === largestEligible.width)) {
      exact.push(largestEligible);
    }
    if (exact.length) selected[format] = exact.sort((a, b) => a.width - b.width);
  }
  return selected;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(rssPlugin);
  const directoryAffidabilitaV1 = "data-sources/affidabilita-v1";
  let registryAffidabilitaV1 = creaRegistryAffidabilitaV1({
    root: __dirname,
    directory: directoryAffidabilitaV1,
  });
  eleventyConfig.addWatchTarget(directoryAffidabilitaV1);
  // ---- Markdown: consenti HTML grezzo nel corpo (schemi .derivazione, ecc.) e
  //      classifica automaticamente i collegamenti della prosa. ----
  // La distinzione interno/esterno è semantica e avviene una sola volta, nel
  // renderer: nessuna classe va aggiunta a mano nei .md. Ogni collegamento
  // editoriale scritto in Markdown riceve una classe (`external-link` per i link
  // che escono da Frontiera, `internal-link` per i rimandi interni), così il CSS
  // può dare a TUTTI i collegamenti della prosa — e solo a quelli — la stessa
  // resa grafica, senza toccare menu, card, timeline, infobox o altri apparati
  // (che sono generati dai layout .njk e non passano da questo renderer).
  eleventyConfig.amendLibrary("md", (mdLib) => {
    mdLib.set({ html: true });

    // Host considerati INTERNI a Frontiera: un URL assoluto verso uno di questi
    // NON è un link esterno (evita falsi positivi su URL che puntano comunque al
    // sito). Include il dominio canonico, il dominio di anteprima e gli host di
    // sviluppo locale. Aggiornare qui se cambia il dominio pubblico.
    const configuredHost = new URL(siteData.url).hostname.toLowerCase();
    const HOST_INTERNI = new Set([
      configuredHost,
      configuredHost.startsWith("www.") ? configuredHost.slice(4) : `www.${configuredHost}`,
      "frontiera.pages.dev",
      "localhost",
      "127.0.0.1",
    ]);

    // Esterno = URL con schema web (http/https) o protocol-relative (//host) il
    // cui host non è di Frontiera. Restano INTERNI per definizione: percorsi
    // relativi e root-relative (/…), ancore (#…), mailto:, tel:, altri schemi.
    const isExternal = (href) => {
      if (!href) return false;
      let host = null;
      if (/^https?:\/\//i.test(href)) {
        try { host = new URL(href).hostname.toLowerCase(); } catch { return false; }
      } else if (/^\/\//.test(href)) {
        try { host = new URL("https:" + href).hostname.toLowerCase(); } catch { return false; }
      } else {
        return false;
      }
      return !HOST_INTERNI.has(host);
    };

    const baseLinkOpen =
      mdLib.renderer.rules.link_open ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    mdLib.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const href = token.attrGet("href");
      if (href) {
        const cls = token.attrGet("class");
        if (isExternal(href)) {
          token.attrSet("class", cls ? `${cls} external-link` : "external-link");
          // rel difensivo per i collegamenti esterni. NON si imposta target:
          // si conserva il comportamento corrente (stessa scheda). Se un autore
          // dichiara target="_blank" nel proprio HTML, rel resta comunque corretto.
          if (!token.attrGet("rel")) token.attrSet("rel", "noopener noreferrer");
        } else {
          // Rimandi interni della prosa (percorsi relativi/root-relative, ancore,
          // mailto:, tel:): stessa resa grafica dei link esterni, senza rel.
          token.attrSet("class", cls ? `${cls} internal-link` : "internal-link");
        }
      }
      return baseLinkOpen(tokens, idx, options, env, self);
    };

    return mdLib;
  });

  // ---- Asset statici (passthrough) ----
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/immagini": "immagini" });
  eleventyConfig.addPassthroughCopy({ "src/favicon": "." });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  eleventyConfig.addFilter("responsiveImage", (img, profileName, attributes = {}) => {
    if (!img || !img.file) return "";
    const profile = IMAGE_PROFILES[profileName];
    if (!profile) throw new Error(`[immagini responsive] profilo sconosciuto: ${profileName}`);
    const metadata = responsiveMetadata.get(img.file);
    if (!metadata) throw new Error(`[immagini responsive] derivata non preparata: ${img.file}`);

    const imgAttributes = {
      alt: attributes.alt ?? img.alt ?? "",
      loading: attributes.loading || "lazy",
      decoding: "async",
      sizes: profile.sizes,
    };
    if (attributes.fetchpriority) imgAttributes.fetchpriority = attributes.fetchpriority;
    if (img.posizione) imgAttributes.style = `object-position:${img.posizione}`;
    if (attributes.full) imgAttributes["data-full-src"] = img.file;

    return Image.generateHTML(metadataForProfile(metadata, profile), imgAttributes, {
      pictureAttributes: { class: "responsive-picture" },
      fallback: "largest",
      whitespaceMode: "inline",
    });
  });

  // ---- File da NON trattare come pagine ----
  eleventyConfig.ignores.add("README.md");
  // Documentazione e rapporti tecnici: restano nel repository, non nel sito pubblico.
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("reports/**");
  eleventyConfig.ignores.add("Report-migrazione-epistemica-Tranche-B.md");

  // L'archivio Sistemi non è più una pagina pubblica. Eleventy non pulisce
  // automaticamente l'output fra due build: rimuoviamo quindi soltanto la
  // vecchia cartella generata, con un percorso assoluto e intenzionalmente
  // ristretto, prima di ogni compilazione.
  eleventyConfig.on("eleventy.before", async () => {
    // Le sidecar sono esterne all'input Eleventy: ricaricarle a ogni ciclo evita
    // dati stantii durante `--serve` e fa fallire la build prima del rendering.
    registryAffidabilitaV1 = creaRegistryAffidabilitaV1({
      root: __dirname,
      directory: directoryAffidabilitaV1,
    });
    Image ||= (await import("@11ty/eleventy-img")).default;
    fs.rmSync(path.join(__dirname, "_site", "archivio", "sistemi"), {
      recursive: true,
      force: true,
    });
    // La route Metodo è stata ritirata e sostituita da /progetto/.
    fs.rmSync(path.join(__dirname, "_site", "metodo"), {
      recursive: true,
      force: true,
    });
    const responsiveOutput = path.join(__dirname, "_site", "immagini", "responsive");
    if (!responsiveOutputPrepared) {
      fs.rmSync(responsiveOutput, { recursive: true, force: true });
      responsiveOutputPrepared = true;
    }
    fs.mkdirSync(responsiveOutput, { recursive: true });
    // Elimina esclusivamente le vecchie copie di output rimaste dopo la
    // normalizzazione estensione/formato; gli originali sorgente non vengono
    // mai toccati da questa pulizia del build derivato.
    for (const staleImage of [
      "immagini/attualita/F-D-S.jpg",
      "immagini/fasi/fase-3-T72.jpg",
      "immagini/fasi/fase-4-fpv.jpg",
      "immagini/profondita/p0-ship.jpg",
      "immagini/profondita/p1-himars.jpg",
      "immagini/profondita/p2-Kyiv.jpg",
      "immagini/sistemi/s-palantir.jpg",
      "immagini/sistemi/s-rassvet.jpg",
      "immagini/strategia/str1-bombardamento-strategico.jpg",
    ]) fs.rmSync(path.join(__dirname, "_site", ...staleImage.split("/")), { force: true });
    responsiveMetadata.clear();
    for (const publicUrl of findEditorialImageUrls()) {
      const metadata = await Image(imageSourcePath(publicUrl), {
        widths: RESPONSIVE_WIDTHS,
        formats: ["webp", "auto"],
        outputDir: responsiveOutput,
        urlPath: "/immagini/responsive/",
        fixOrientation: true,
        sharpWebpOptions: { quality: 84, effort: 5, smartSubsample: true },
        sharpJpegOptions: { quality: 86, mozjpeg: true },
        sharpPngOptions: { compressionLevel: 9, adaptiveFiltering: true },
      });
      responsiveMetadata.set(publicUrl, metadata);
    }
    console.log(`[immagini responsive] ${responsiveMetadata.size} originali elaborati.`);
  });

  // ---- Collections ordinate (più recenti prima) ----
  // Ordina le analisi per la DATA EDITORIALE del front matter (`data`), non per
  // la data-file di Eleventy: `eleventyComputed.date` popola `data.date` ma non
  // il `page.date` usato nell'ordinamento, che ripiegherebbe sul timestamp del
  // file (fragile e non deterministico, es. dopo una copia della cartella).
  const dataEditoriale = (i) => +new Date(i.data.data || i.date || 0);
  eleventyConfig.addCollection("analisi", (c) =>
    c.getFilteredByTag("analisi").sort((a, b) => dataEditoriale(b) - dataEditoriale(a))
  );
  const ordinaSchede = (items) =>
    [...items].sort((a, b) =>
      (a.data.titolo || "").localeCompare(b.data.titolo || "", "it")
    );
  eleventyConfig.addCollection("schede", (c) =>
    ordinaSchede(c.getFilteredByTag("schede"))
  );
  // Fonte unica della sezione Sistemi in homepage. Il filtro non viene
  // duplicato nei template e conserva l'ordinamento alfabetico delle schede.
  eleventyConfig.addCollection("sistemi", (c) =>
    ordinaSchede(
      c.getFilteredByTag("schede").filter((item) => item.data.categoria === "Sistemi")
    )
  );

  // Carosello home: rappresenta i TRE nuclei editoriali, al massimo un elemento
  // per nucleo e in ordine fisso (Attualità, Strategia, Sistemi).
  // Per ciascun nucleo si sceglie il contenuto più recente marcato
  // in_evidenza:true; in mancanza, il più recente in assoluto (fallback).
  // Se un nucleo non ha contenuti, non produce alcuna slide (niente segnaposto).
  // Attualità/Strategia pescano dalle analisi (per `sezione`); Sistemi pesca
  // dalle schede (per `categoria`). La selezione è deterministica e NON tocca
  // collections.fasi né la fonte dati P0–P6: le due linee temporali hanno già
  // un proprio spazio in home e non compaiono nel carosello.
  eleventyConfig.addCollection("inEvidenza", (c) => {
    // Ordina per data editoriale (vedi nota su collections.analisi). Per le
    // schede si usa `aggiornata`, coerentemente col resto del sistema schede.
    const ordAnalisi = (i) => +new Date(i.data.data || i.date || 0);
    const ordScheda = (i) => +new Date(i.data.aggiornata || i.data.data || i.date || 0);
    const analisi = c.getFilteredByTag("analisi").sort((a, b) => ordAnalisi(b) - ordAnalisi(a));
    const schede = c.getFilteredByTag("schede").sort((a, b) => ordScheda(b) - ordScheda(a));
    // fra gli item già ordinati per data (desc): prima l'in_evidenza più recente,
    // altrimenti il più recente disponibile.
    const scegli = (pool) =>
      pool.find((i) => i.data.in_evidenza === true) || pool[0] || null;
    const attualita = scegli(analisi.filter((i) => i.data.sezione === "Attualità"));
    const strategia = scegli(analisi.filter((i) => i.data.sezione === "Strategia"));
    const sistemi = scegli(schede.filter((i) => i.data.categoria === "Sistemi"));
    return [attualita, strategia, sistemi].filter(Boolean);
  });

  // ---- Contratto dei sistemi citati e raccolta dei riferimenti ----
  // Il valore è editoriale: non viene inferito dal corpo Markdown e non deve
  // necessariamente risolvere una scheda S già pubblicata.
  const SISTEMA_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const validaSistemiCitati = (item) => {
    const valore = item.data.sistemi_citati;
    if (valore === undefined) return [];

    const file = item.inputPath || "(sorgente sconosciuto)";
    if (!Array.isArray(valore)) {
      throw new Error(
        `[rimandi sistemi] ${file}: "sistemi_citati" deve essere un array ` +
        `(valore: ${JSON.stringify(valore)})`
      );
    }

    const visti = new Set();
    valore.forEach((slug, indice) => {
      if (typeof slug !== "string" || slug.trim() === "") {
        throw new Error(
          `[rimandi sistemi] ${file}: "sistemi_citati[${indice}]" deve essere ` +
          `una stringa non vuota (valore: ${JSON.stringify(slug)})`
        );
      }
      if (!SISTEMA_SLUG_RE.test(slug)) {
        throw new Error(
          `[rimandi sistemi] ${file}: slug non canonico in "sistemi_citati[${indice}]" ` +
          `(valore: ${JSON.stringify(slug)}; atteso: /^[a-z0-9]+(?:-[a-z0-9]+)*$/)`
        );
      }
      if (visti.has(slug)) {
        throw new Error(
          `[rimandi sistemi] ${file}: slug duplicato in "sistemi_citati" ` +
          `(valore: ${JSON.stringify(slug)})`
        );
      }
      visti.add(slug);
    });

    // Copia difensiva: nessun template o filtro deve mutare il front matter.
    return [...valore];
  };

  const normalizzaRiferimentoSistema = (item, famiglia) => {
    const d = item.data;
    const eAttualita = famiglia === "attualita";
    return {
      url: item.url,
      famiglia,
      codice: eAttualita ? "Attualità" : `${famiglia === "fasi" ? "F" : "P"}${d.numero}`,
      titolo: eAttualita ? d.titolo : (d.titoloBreve || d.titolo),
      ordine: eAttualita ? null : Number(d.ordine ?? d.numero ?? 0),
      data: d.data || item.date || null,
      sistemiCitati: validaSistemiCitati(item),
    };
  };

  const confrontoTestuale = (a, b) => String(a || "").localeCompare(String(b || ""), "it");
  const dataNumero = (valore) => {
    const numero = +new Date(valore || 0);
    return Number.isFinite(numero) ? numero : 0;
  };

  // Collezione unica dei contenuti che possono alimentare il backlink di una
  // scheda S. Le pagine P provengono intenzionalmente da schedeProfondita:
  // collections.profondita contiene soltanto i nodi sintetici della timeline.
  eleventyConfig.addCollection("riferimentiSistemi", (c) => {
    const fasi = c.getFilteredByTag("fasi");
    const schedeProfondita = c.getFilteredByTag("schede-profondita");
    const attualita = c
      .getFilteredByTag("analisi")
      .filter((item) => item.data.sezione === "Attualità");

    const riferimenti = [
      ...fasi.map((item) => normalizzaRiferimentoSistema(item, "fasi")),
      ...schedeProfondita.map((item) => normalizzaRiferimentoSistema(item, "profondita")),
      ...attualita.map((item) => normalizzaRiferimentoSistema(item, "attualita")),
    ];

    const ordineFamiglia = { fasi: 0, profondita: 1, attualita: 2 };
    return riferimenti.sort((a, b) => {
      const famiglia = ordineFamiglia[a.famiglia] - ordineFamiglia[b.famiglia];
      if (famiglia) return famiglia;

      if (a.famiglia === "attualita") {
        const data = dataNumero(b.data) - dataNumero(a.data);
        if (data) return data;
      } else {
        const ordine = (a.ordine ?? 0) - (b.ordine ?? 0);
        if (ordine) return ordine;
      }

      return confrontoTestuale(a.titolo, b.titolo) || confrontoTestuale(a.url, b.url);
    });
  });

  // ---- Collezioni fasi ed eventi ----
  eleventyConfig.addCollection("fasi", (c) =>
    c.getFilteredByTag("fasi").sort((a, b) => (a.data.ordine ?? 0) - (b.data.ordine ?? 0))
  );
  // ---- Famiglia editoriale "profondità" (schede P) ----
  // Pagine Markdown realmente pubblicate (contenuti/profondita/*.md), rese una
  // vera famiglia Eleventy dal data cascade profondita.11tydata.js (tag
  // "schede-profondita", layout scheda-profondita.njk, permalink /profondita/…).
  // DISTINTA dalla fonte sintetica della timeline (vedi sotto): non confluisce in
  // collections.fasi né nella Linea F. Ordinata per `ordine`.
  eleventyConfig.addCollection("schedeProfondita", (c) => {
    const pagine = c
      .getFilteredByTag("schede-profondita")
      .sort((a, b) => (a.data.ordine ?? 0) - (b.data.ordine ?? 0));
    // --- Validazioni di build (§9.1): campi obbligatori e unicità ---
    const OBBLIGATORI = [
      "slug", "idFase", "numero", "numeroEtichetta", "ordine",
      "linea", "datazione", "titolo", "titoloBreve", "anteprima", "dialettica",
    ];
    const visti = { slug: new Map(), idFase: new Map(), numero: new Map(), permalink: new Map() };
    for (const p of pagine) {
      const d = p.data;
      const rif = d.slug || p.inputPath;
      for (const campo of OBBLIGATORI) {
        if (d[campo] === undefined || d[campo] === null || d[campo] === "") {
          throw new Error(`[schede P] campo obbligatorio mancante "${campo}" in ${p.inputPath}`);
        }
      }
      if (d.linea !== "profondita") {
        throw new Error(`[schede P] "linea" deve valere "profondita" in ${p.inputPath} (trovato: ${d.linea})`);
      }
      // --- Diagramma della profondità: obbligatorio, contratto verificato ---
      // La linea P non usa più la cartina delle schede F: il diagramma è
      // l'infrastruttura visiva propria della famiglia P. Qui si fallisce
      // presto, con il percorso del sorgente, prima di qualunque rendering.
      validateDiagrammaProfondita(d.diagrammaProfondita, { file: p.inputPath });
      if (d.cartina !== undefined) {
        throw new Error(
          `[schede P] ${p.inputPath}: il blocco "cartina" non è più previsto nelle schede P. ` +
            `Lo slot della testata ospita "diagrammaProfondita".`
        );
      }
      const chiavi = { slug: d.slug, idFase: String(d.idFase), numero: String(d.numero), permalink: p.url };
      for (const [k, v] of Object.entries(chiavi)) {
        if (visti[k].has(v)) {
          throw new Error(`[schede P] ${k} duplicato "${v}": ${visti[k].get(v)} e ${p.inputPath}`);
        }
        visti[k].set(v, p.inputPath);
      }
    }
    return pagine;
  });

  // ---- Fonte dati sintetica della timeline "Il filo della profondità" ----
  // Array JSON autonomo dei sette nodi P0–P6: alimenta SOLO la seconda linea
  // temporale della home. NON genera pagine. Per ogni nodo l'URL non è scritto a
  // mano nel JSON ma DERIVATO in build dalla scheda P corrispondente (associata
  // per `idFase`, identificatore esplicito e non ambiguo). Così la card P0 è
  // cliccabile perché la pagina esiste; P1–P6 restano pannelli non interattivi;
  // pubblicando una nuova scheda P la timeline la collega automaticamente, senza
  // duplicare né far divergere l'URL.
  const nodiProfondita = require("./contenuti/profondita/nodi-profondita.json");
  eleventyConfig.addCollection("profondita", (c) => {
    const pagine = c.getFilteredByTag("schede-profondita");
    const urlPerIdFase = new Map();
    const immaginePerIdFase = new Map();
    for (const p of pagine) {
      const id = p.data.idFase ? String(p.data.idFase) : null;
      if (!id) continue;
      // Associazione ambigua: due pagine con lo stesso idFase (già intercettata
      // dalla collezione schedeProfondita, ma verificata anche qui per il nodo).
      if (urlPerIdFase.has(id)) {
        throw new Error(`[timeline profondità] idFase "${id}" associato a più pagine`);
      }
      urlPerIdFase.set(id, p.url);
      if (p.data.immagine?.file) {
        immaginePerIdFase.set(id, p.data.immagine);
      }
    }
    const idNodi = new Set();
    const nodi = [...nodiProfondita]
      .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0))
      .map((n) => {
        const id = n.idFase ? String(n.idFase) : null;
        if (id) idNodi.add(id);
        return {
          ...n,
          url: (id && urlPerIdFase.get(id)) || null,
          immagine: (id && immaginePerIdFase.get(id)) || null,
        };
      });
    // Ogni scheda P pubblicata deve corrispondere a uno dei nodi P0–P6 (§9.1).
    for (const [id, url] of urlPerIdFase.entries()) {
      if (!idNodi.has(id)) {
        throw new Error(`[timeline profondità] scheda P pubblicata (${url}, idFase "${id}") non associabile ad alcun nodo P0–P6`);
      }
    }
    return nodi;
  });
  eleventyConfig.addCollection("eventi", (c) =>
    c.getFilteredByTag("eventi").sort((a, b) => (a.data.ordine ?? 0) - (b.data.ordine ?? 0))
  );
  // ---- Rimandi editoriali ----
  // Attualità -> schede S: risolve esclusivamente contro collections.sistemi
  // (il template passa intenzionalmente quella collezione, non collections.schede).
  eleventyConfig.addFilter("schedeBySlug", (schede, slugs) => {
    if (!Array.isArray(slugs)) return [];
    return slugs
      .map((s) => (schede || []).find((item) => item.data.slug === s))
      .filter(Boolean);
  });
  // Scheda S -> contenuti: corrispondenza esatta sul contratto normalizzato.
  // Il filtro crea sempre un nuovo array e rimuove eventuali duplicati per URL.
  eleventyConfig.addFilter("riferimentiSistemiPerSlug", (riferimenti, slug) => {
    const visti = new Set();
    return (riferimenti || []).filter((riferimento) => {
      if (!Array.isArray(riferimento.sistemiCitati) || !riferimento.sistemiCitati.includes(slug)) {
        return false;
      }
      if (visti.has(riferimento.url)) return false;
      visti.add(riferimento.url);
      return true;
    });
  });

  // Nodi di una fase: schede-evento che portano `fase: <slug>`.
  eleventyConfig.addFilter("eventiPerFase", (eventi, slug) =>
    (eventi || []).filter((e) => e.data.fase === slug)
  );
  // ---- Selettori per griglie ----
  eleventyConfig.addFilter("perSezione", (items, nome) =>
    (items || []).filter((i) => i.data.sezione === nome)
  );
  eleventyConfig.addFilter("perCategoria", (items, nome) =>
    (items || []).filter((i) => i.data.categoria === nome)
  );
  eleventyConfig.addFilter("limita", (items, n) => (items || []).slice(0, n));

  // Pipeline unica per F, P, Attualità, Sistemi e pagine statiche con infobox.
  // L'adattatore storico
  // `specifiche` è normalizzato qui come modello esplicito di tipo 2.
  eleventyConfig.addFilter(
    "modelloInfobox",
    (infobox, famiglia, storico, specifiche, file) => normalizeInfobox({
      infobox,
      famiglia,
      storico,
      specifiche,
      file,
    })
  );

  // ---- Filtro per dominio (archivi analisi) ----
  eleventyConfig.addFilter("perDominio", (items, dominio) => {
    if (!dominio || dominio === "tutto") return items;
    return (items || []).filter((i) => (i.data.domini || []).includes(dominio));
  });

  // ---- Cartina di fase: dati dichiarativi -> SVG statico in fase di build ----
  // Nessun JavaScript cartografico viene inviato al browser.
  eleventyConfig.addFilter("cartinaSvg", (cartina, luoghi, linee) =>
    renderCartinaSvg(cartina, luoghi, linee)
  );
  eleventyConfig.addFilter("cartinaCategorie", (cartina) => cartinaCategories(cartina));
  eleventyConfig.addFilter("cartinaPercentuali", (cartina) => cartinaTerritorySummary(cartina));
  eleventyConfig.addFilter("cartinaAria", (cartina, luoghi) => cartinaAriaLabel(cartina, luoghi));

  // ---- Diagramma della profondità (schede P): dati dichiarativi -> modello ----
  // Filtro unico del componente: valida e normalizza il front matter in un
  // modello già ordinato e classificato (fasce, stati, vettori, legenda, nodi,
  // riepilogo accessibile). Il partial non calcola nulla; il CSS non conosce
  // alcun dato di fase; il browser non riceve JavaScript.
  eleventyConfig.addFilter("diagrammaProfonditaModello", (config, idScheda, sorgente) =>
    normalizeDiagrammaProfondita(config, { id: idScheda, file: sorgente })
  );

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

  // ---- Affidabilità V1: {% affV1 "id-logico" %} ----
  // L'ID è l'unico dato editoriale nel marker. Pagina, livello e contenuto del
  // panel vengono risolti contro le sidecar; il legacy sopra resta indipendente.
  eleventyConfig.addShortcode("affV1", function (id) {
    const inputPath = this.page && this.page.inputPath;
    const record = registryAffidabilitaV1.risolvi(inputPath, id);
    return renderIndicatoreAffidabilitaV1(record, inputPath);
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

  // ---- Nome sezione/categoria -> destinazione pubblica ----
  const ARCH = {
    Attualità: "/archivio/attualita/",
    Strategia: "/archivio/strategia/",
    Sistemi: "/#sistemi",
  };
  eleventyConfig.addFilter("archivioUrl", (nome) => ARCH[nome] || "/");

  // ---- ID di sezione per il navigatore comune (ancore stabili) ----
  // Genera in build id leggibili e stabili sugli <h2> del corpo editoriale, così
  // che i link con hash funzionino anche senza JavaScript. NON è più legato alle
  // sole schede-fase: agisce su qualunque pagina che dichiari il contratto comune
  // data-section-navigation (schede F, schede P, articoli di Attualità/Strategia/
  // Sistemi, futuri layout editoriali). Fonte unica dei titoli: il corpo reale.
  //
  // Ambito: dall'apertura del contenitore data-section-navigation fino al primo
  // apparato (data-section-navigation-ignore, oppure .fasenodi/.fasenav/.relbox),
  // così restano indicizzati gli h2 del corpo (incluso "Vincitori e vinti") e
  // vengono esclusi gli apparati ("I nodi della fase", "Schede collegate",
  // navigazione sequenziale). Nessun id viene aggiunto fuori dal corpo.
  const slugSezione = (text) => {
    let s = String(text).replace(/&[^;]+;/g, " ");
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    s = s
      .toLowerCase()
      .replace(/['‘’´`]/g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return s || "sezione";
  };
  eleventyConfig.addTransform("idSezioni", function (content) {
    const outputPath = (this.page && this.page.outputPath) || this.outputPath || "";
    if (outputPath && !String(outputPath).endsWith(".html")) return content;

    // Apertura del contenitore col contratto comune. `(?![-\w])` esclude
    // data-section-navigation-ignore, che contiene lo stesso prefisso.
    const attr = /data-section-navigation(?![-\w])/;
    const m = attr.exec(content);
    if (!m) return content;
    const tagEnd = content.indexOf(">", m.index);
    if (tagEnd === -1) return content;
    const si = tagEnd + 1;

    // Fine del corpo indicizzabile: primo apparato dopo l'apertura.
    let ei = content.length;
    for (const sent of ['data-section-navigation-ignore', 'class="fasenodi"', 'class="fasenav"', 'class="relbox"']) {
      const i = content.indexOf(sent, si);
      if (i !== -1 && i < ei) ei = i;
    }

    const used = Object.create(null);
    let mid = content
      .slice(si, ei)
      .replace(/<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/g, (mm, attrs, inner) => {
        const text = inner.replace(/<[^>]+>/g, "").trim();
        let id = slugSezione(text);
        const base = id;
        let n = 2;
        while (used[id]) id = `${base}-${n++}`;
        used[id] = true;
        return `<h2${attrs} id="${id}">${inner}</h2>`;
      });

    // Ancora stabile per lo "Schema di derivazione": id sul PRIMO blocco
    // .derivazione del corpo, senza sovrascrivere un id già presente. Solo il
    // primo blocco (replace non globale). Così #schema-di-derivazione funziona
    // anche senza JavaScript. Assente in molti articoli: se non c'è, nessun
    // effetto.
    mid = mid.replace(/<div\b[^>]*\bclass="derivazione"[^>]*>/, (tag) =>
      /\sid=/.test(tag) ? tag : tag.replace("<div", '<div id="schema-di-derivazione"')
    );

    return content.slice(0, si) + mid + content.slice(ei);
  });

  // ---- Validazioni di build sull'HTML generato (§9.2, §9.3) ----
  // Controlli leggeri, senza nuove dipendenze: leggono i file già scritti in
  // _site e fanno fallire la build con un messaggio chiaro se un invariante è
  // violato (timeline profondità incoerente col numero di nodi P0–P6, link
  // morti, id di sezione mancanti, navigatore ancora legato in modo esclusivo
  // a .fasebody).
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const out = (dir && dir.output) || "_site";
    const leggi = (rel) => {
      try { return fs.readFileSync(path.join(out, rel), "utf8"); } catch { return null; }
    };
    const esiste = (url) => {
      // url tipo "/profondita/<slug>/" → _site/profondita/<slug>/index.html
      const rel = url.replace(/^\//, "").replace(/\/$/, "");
      return fs.existsSync(path.join(out, rel, "index.html")) ||
             fs.existsSync(path.join(out, rel));
    };
    const errori = [];

    // --- §9.2 Timeline "Il filo della profondità" nella home (validazione DINAMICA) ---
    // La linea rende un nodo per ciascun elemento P0–P6 di nodi-profondita.json:
    // card cliccabile <a> quando la scheda P corrispondente (associata per idFase)
    // è pubblicata, pannello <div> non interattivo altrimenti. Con l'integrazione
    // progressiva di P1–P6 il numero di card cliccabili cresce: qui si verificano
    // gli INVARIANTI, non un conteggio fisso. La coerenza nodo↔scheda per idFase è
    // già garantita a monte dalla collezione "profondita" (che fallisce su idFase
    // duplicati o schede non associabili ad alcun nodo); questa validazione
    // controlla l'HTML effettivamente reso.
    const home = leggi("index.html");
    if (home) {
      const si = home.indexOf('class="wrap linea linea--profondita"');
      const blocco = si !== -1
        ? home.slice(si, (home.indexOf("</section>", si) + 1) || home.length)
        : "";
      if (!blocco) {
        errori.push("Home: sezione «Il filo della profondità» non trovata.");
      } else {
        const totaleNodi = nodiProfondita.length; // P0–P6: fonte unica dei nodi
        // (2) nessuna card con collegamento morto
        if (/class="lf-link"\s+href="#"/.test(blocco)) {
          errori.push('Home/profondità: presente una lf-link con href="#".');
        }
        const cardCliccabili = [...blocco.matchAll(/<a class="lf-link" href="([^"]+)"/g)].map((x) => x[1]);
        const pannelliInerti = (blocco.match(/<div class="lf-link">/g) || []).length;
        // (1) i nodi resi (cliccabili + non interattivi) coincidono col totale
        //     P0–P6: nessun nodo mancante né duplicato, comunque progredisca la
        //     pubblicazione delle schede.
        if (cardCliccabili.length + pannelliInerti !== totaleNodi) {
          errori.push(
            `Home/profondità: nodi resi ${cardCliccabili.length + pannelliInerti} ` +
            `(cliccabili ${cardCliccabili.length} + non interattivi ${pannelliInerti}) ` +
            `≠ ${totaleNodi} nodi attesi (P0–P6).`
          );
        }
        // (3) ogni card cliccabile punta a una pagina realmente generata; (4) di
        //     conseguenza i nodi privi di scheda restano non interattivi — un nodo
        //     reso cliccabile senza pagina verrebbe qui intercettato come link morto.
        for (const href of cardCliccabili) {
          if (!esiste(href)) {
            errori.push(`Home/profondità: card cliccabile verso pagina inesistente ${href}.`);
          }
        }
      }
    }

    // --- §9.3 Navigatore: id sugli h2, nessuna regressione, selettore comune ---
    const contaH2Id = (html) => (html.match(/<h2\b[^>]*\sid="/g) || []).length;

    const fedorov = leggi("analisi/articolo-attualita-fedorov-syrskyj/index.html");
    if (fedorov && contaH2Id(fedorov) < 2) {
      errori.push("Articolo Fedorov–Syrs'kyj: mancano gli id sugli h2 del corpo.");
    }

    const p0 = leggi("profondita/asimmetria-iniziale-decisione-mancata/index.html");
    if (p0) {
      if (contaH2Id(p0) < 2) errori.push("Scheda P0: mancano gli id sugli h2 del corpo.");
      if (!p0.includes('id="schema-di-derivazione"')) {
        errori.push("Scheda P0: manca l'ancora #schema-di-derivazione.");
      }
    }

    const fase = leggi("fasi/manovra-fallita/index.html");
    if (fase && contaH2Id(fase) < 2) {
      errori.push("Scheda F (manovra-fallita): regressione, id sugli h2 assenti.");
    }

    const navJs = leggi("js/nav-sezioni.js");
    if (navJs) {
      if (!navJs.includes("[data-section-navigation]")) {
        errori.push("nav-sezioni.js: manca il selettore comune [data-section-navigation].");
      }
      if (/querySelector\(\s*["']\.fasebody["']\s*\)/.test(navJs)) {
        errori.push("nav-sezioni.js: ancora presente il vincolo esclusivo querySelector('.fasebody').");
      }
    }

    // --- Diagramma della profondità: HTML generato delle schede P ---
    // Nessun elenco di slug scritto a mano: si controllano TUTTE le schede P
    // realmente pubblicate, così la verifica cresce da sola con P3 e seguenti.
    let schedePcontrollate = 0;
    let cartelleP = [];
    // Fonte unica anche per la verifica: la nota resa deve essere quella del
    // vocabolario, non una copia divergente finita nei template o nei .md.
    const notaCanonica = profonditaVocabolario.testi.notaMetodologica;
    try {
      cartelleP = fs
        .readdirSync(path.join(out, "profondita"), { withFileTypes: true })
        .filter((voce) => voce.isDirectory())
        .map((voce) => voce.name);
    } catch {
      errori.push("Schede P: cartella _site/profondita assente.");
    }
    for (const slug of cartelleP) {
      const html = leggi(path.join("profondita", slug, "index.html"));
      if (!html) continue;
      schedePcontrollate += 1;
      const dove = `Scheda P (${slug})`;
      const conta = (frammento) => (html.split(frammento).length - 1);

      // (1) esattamente un diagramma per scheda; (2) nessun residuo cartografico
      if (conta('class="depth-card"') !== 1) {
        errori.push(`${dove}: attesa una sola figura .depth-card, trovate ${conta('class="depth-card"')}.`);
      }
      if (html.includes("phase-map-card")) {
        errori.push(`${dove}: presente ancora la cartina delle schede F (.phase-map-card).`);
      }

      // (3) apparato completo del componente
      const attesi = [
        ["Profondità contesa", "kicker del componente"],
        ['class="depth-scale"', "testate colonnari delle fasce"],
        ['class="depth-legend"', "legenda degli stati"],
        [`id="depth-${slug}-descrizione"`, "riepilogo accessibile"],
        [`id="depth-${slug}-titolo"`, "titolo accessibile"],
        ['class="depth-nota"', "nota metodologica"],
        ['class="depth-watermark"', "watermark"],
      ];
      // I componenti possono aggiungere classi di sistema al watermark; la
      // verifica controlla quindi il token di classe, non l'ordine esatto
      // dell'attributo HTML.
      const contieneClasse = (classe) => new RegExp(`class="[^"]*\\b${classe}\\b[^"]*"`).test(html);
      for (const [frammento, nome] of attesi) {
        const classe = frammento.match(/^class="([^"]+)"$/)?.[1];
        if (classe ? !contieneClasse(classe) : !html.includes(frammento)) {
          errori.push(`${dove}: manca ${nome}.`);
        }
      }

      // (3b) apparato rimosso dalla revisione: non deve riaffiorare da nessuna
      //      parte del documento, né come blocco né come testo residuo.
      const vietati = [
        ["Mutamento prodotto", "blocco «Mutamento prodotto»"],
        ["Soglia della fase", "blocco «Soglia della fase»"],
        ["depth-reading", "contenitore dei blocchi interpretativi"],
        ["depth-band-note", "nota discorsiva dentro le fasce"],
        ["uguale larghezza semantica", "vecchio testo della nota metodologica"],
      ];
      for (const [frammento, nome] of vietati) {
        if (html.includes(frammento)) errori.push(`${dove}: presente ancora ${nome}.`);
      }

      // (3c) la nota metodologica pubblica è esattamente quella canonica
      if (!html.includes(notaCanonica)) {
        errori.push(`${dove}: la nota metodologica non coincide con il testo canonico del vocabolario.`);
      }

      // (3d) la data dell'assetto compare una volta sola, nel gruppo di testata
      if (conta('class="depth-data"') !== 1) {
        errori.push(`${dove}: la data dell'assetto deve comparire una sola volta nella testata.`);
      }

      // (4) due corsie, quattro fasce per corsia, nell'ordine canonico
      const corsie = html.split('<div class="depth-lane"').slice(1);
      if (corsie.length !== 2) {
        errori.push(`${dove}: attese due corsie, trovate ${corsie.length}.`);
      }
      corsie.forEach((corsia) => {
        const attore = (corsia.match(/^ data-attore="([a-z-]+)"/) || [])[1] || "?";
        const bande = corsia.split('<div class="depth-band ').slice(1).map((pezzo) => ({
          fascia: (pezzo.match(/data-fascia="([a-z-]+)"/) || [])[1] || "?",
          stato: (pezzo.match(/data-stato="([a-z-]+)"/) || [])[1] || "?",
          vettore: (pezzo.match(/class="depth-vector ([^"]*)"/) || [])[1] || "",
          tratto: pezzo.includes("depth-vector-line"),
        }));
        if (bande.length !== 4) {
          errori.push(`${dove}, corsia ${attore}: attese quattro fasce, trovate ${bande.length}.`);
        }
        const ordine = bande.map((b) => b.fascia).join(",");
        if (bande.length === 4 && ordine !== "contatto,prossima,intermedia,profonda") {
          errori.push(`${dove}, corsia ${attore}: ordine delle fasce “${ordine}” non canonico.`);
        }
        // (5) nessuna continuità fittizia: dove non c'è accesso non c'è tratto
        bande.forEach((b) => {
          if (b.stato === "non-accessibile" && (b.tratto || !b.vettore.includes("depth-vector--assente"))) {
            errori.push(
              `${dove}, corsia ${attore}, fascia ${b.fascia}: fascia non accessibile ` +
                `con vettore reso — continuità fittizia.`
            );
          }
          if (b.stato !== "non-accessibile" && !b.tratto) {
            errori.push(`${dove}, corsia ${attore}, fascia ${b.fascia}: accesso dichiarato senza vettore.`);
          }
        });
        // (6) il tratto che riappare oltre una discontinuità è autonomo
        bande.forEach((b, i) => {
          const precedente = bande[i - 1];
          if (i > 0 && b.stato !== "non-accessibile" && precedente.stato === "non-accessibile") {
            if (!b.vettore.includes("depth-vector--autonomo")) {
              errori.push(
                `${dove}, corsia ${attore}, fascia ${b.fascia}: segmento oltre una discontinuità ` +
                  `non marcato come autonomo.`
              );
            }
          }
        });
      });
    }
    if (schedePcontrollate < 3) {
      errori.push(`Schede P: controllate ${schedePcontrollate} pagine, attese almeno 3 (P0, P1, P2).`);
    }

    // P2 è il caso di prova esplicito della NON MONOTONICITÀ: fascia intermedia
    // non accessibile e fascia profonda raggiunta episodicamente.
    const p2 = leggi("profondita/coercizione-energetica-profondita-negata-a-kyiv/index.html");
    if (p2) {
      const corsiaUa = (p2.split('<div class="depth-lane" data-attore="ucraina"')[1] || "").split(
        '<div class="depth-lane"'
      )[0];
      const banda = (chiave) =>
        (corsiaUa.split('<div class="depth-band ').find((p) => p.includes(`data-fascia="${chiave}"`)) || "");
      const intermedia = banda("intermedia");
      const profonda = banda("profonda");
      if (!intermedia.includes('data-stato="non-accessibile"') || intermedia.includes("depth-vector-line")) {
        errori.push("Scheda P2 (corsia Ucraina): la fascia intermedia deve essere non accessibile e priva di vettore.");
      }
      if (!profonda.includes('data-stato="episodico"') || !profonda.includes("depth-vector--autonomo")) {
        errori.push("Scheda P2 (corsia Ucraina): la fascia profonda deve rendere un segmento episodico autonomo.");
      }
    } else {
      errori.push("Scheda P2: pagina non generata.");
    }

    // Nessuna regressione sulle schede F: la cartina resta dov'era.
    if (fase && !fase.includes("phase-map-card")) {
      errori.push("Scheda F (manovra-fallita): regressione, la cartina di fase non è più resa.");
    }

    if (errori.length) {
      throw new Error(
        "Validazioni di build fallite:\n  - " + errori.join("\n  - ")
      );
    }
    console.log(`[verify:navigatore+timeline] OK — ${(home ? 1 : 0) + (fedorov ? 1 : 0) + (p0 ? 1 : 0) + (fase ? 1 : 0)} pagine controllate.`);
    console.log(`[verify:profondita/html] OK — ${schedePcontrollate} schede P con diagramma coerente; cartina F integra.`);
  });

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
