module.exports = {
  titolo: "Frontiera",
  sottotitolo: "analisi di tecnologia e strategia",
  titoloEsteso: "Analisi di tecnologia e strategia",
  descrizione:
    "Pubblicazione analitica indipendente in lingua italiana sulla guerra russo-ucraina, la tecnologia e la strategia.",
  // Fonte unica del dominio. Il valore di ambiente prevale; il fallback è già
  // il dominio pubblico canonico e non richiede una configurazione implicita.
  url: (process.env.FRONTIERA_SITE_URL || "https://frontiera.pages.dev").replace(/\/+$/, ""),
  lingua: "it",
  locale: "it_IT",
  ogImage: {
    file: "/immagini/meta/frontiera-og-home.jpg",
    alt: "Frontiera",
    width: 1200,
    height: 630,
    type: "image/jpeg",
  },
  // Voci di navigazione: 2 archivi editoriali, la sezione Sistemi in homepage
  // e la pagina statica Il progetto Frontiera. Fonte unica per desktop, mobile e footer.
  nav: [
    { nome: "Attualità", url: "/archivio/attualita/" },
    { nome: "Strategia", url: "/archivio/strategia/" },
    { nome: "Sistemi", url: "/#sistemi" },
    { nome: "Il progetto Frontiera", url: "/progetto/" },
  ],
};
