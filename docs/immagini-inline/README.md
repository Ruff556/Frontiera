# Immagini nel corpo degli articoli

La funzione usa il corpo `.articlebody` dei layout Analisi e Sistemi.
Demo tecnica: `/demo/immagini-inline/`, esclusa dalle collezioni, home, feed e
sitemap, con `noindex, follow`.

## Scrittura

Dichiara un archivio locale nel front matter. Il nome di ogni voce è libero:

```yaml
immagini_inline:
  esempio:
    file: /immagini/strategia/str1-bombardamento-strategico.webp
    alt: Formazione di bombardieri in volo.
    didascalia: Fotografia di esempio già presente nel sito.
    credito: U.S. Air Force / Staff Sgt. Lauren Diaz
    licenza: Pubblico dominio — U.S. Government work
    fit: contain
```

- `file`: asset esistente sotto `src/immagini/`, richiamato con URL `/immagini/`;
  JPEG, PNG, WebP e AVIF. Sono ammessi percorsi YAML quotati e commenti finali.
- `alt`: testo significativo obbligatorio. `alt: ""` è una scelta esplicita per
  un'immagine decorativa; non ometterlo sulle immagini informative.
- `didascalia`, `credito`, `fonte`, `licenza`: testi facoltativi. Nel registro
  Analisi gli indirizzi HTTP e HTTPS diventano link con etichette leggibili.
  L'HTML nei campi viene mostrato come testo. L'assenza dei campi di attribuzione
  non costituisce un'autorizzazione all'uso dell'immagine.
- `fit`: `contain` (default, tavole e diagrammi) oppure `cover`. Nessun rapporto
  fisso, crop o deformazione; con la cornice naturale anche `cover` conserva
  l'intera immagine. Non viene applicato `posizione` alla figura inline.

Nel Markdown, ogni shortcode deve stare **su una riga propria, separata dai
paragrafi da righe vuote**:

```njk
{% figura immagini_inline.esempio %}

{% figura immagini_inline.esempio, "4/4" %}

{% figura immagini_inline.esempio, "2/4", "left" %}

Questo è un normale paragrafo Markdown: scorre accanto alla figura e torna
alla larghezza completa dopo il bordo inferiore, didascalia inclusa.

{% figura immagini_inline.esempio, "2/4", "right" %}

{% figura immagini_inline.esempio, "3/4", "left" %}

{% figura immagini_inline.esempio, "3/4", "right" %}

Un breve paragrafo affiancato.

{% clearFigura %}

Questo paragrafo deve iniziare sotto la figura.
```

La misura omessa è `4/4`, il lato omesso è `left`. `4/4` ignora un lato valido e
resta a blocco. Misure e lati non previsti, riferimenti indefiniti, campi di tipo
errato e asset mancanti interrompono la build con una diagnostica. La significatività
della descrizione e l'appropriatezza dei diritti restano verifiche editoriali.

## Flusso e dimensioni

`4/4` occupa la larghezza disponibile agli schemi (massimo 64rem, senza uscire
dal corpo). `2/4` e `3/4` usano float CSS al 47% e 66%, con gutter di 1.25rem.
Il margine inferiore è quello dei paragrafi, 1.25rem. La didascalia e il rimando
al registro in Analisi fanno parte del float, come i diritti in Sistemi. Le
figure a destra allineano a destra anche il contenuto della didascalia.

Sotto 740px tutte le figure sono verticali. Anche sopra tale soglia, le container
query mantengono la disposizione verticale quando il corpo ha meno di 30rem
(`2/4`) o 38rem (`3/4`). Questo evita colonne residue troppo strette con sidebar.
Senza supporto alle container query resta il fallback verticale.

Titoli, tabelle, schemi, figure, liste, citazioni e blocchi di codice ripartono
sotto i float. Le figure consecutive si impilano e un elemento di clear prima
di ciascuna impedisce al testo successivo di risalire accanto alla precedente.
Il corpo con figure contiene i float tramite `flow-root`; solo in tali pagine,
prosa e figure condividono la stessa larghezza del corpo, anche oltre 1140px,
per allineare correttamente il float destro. Gli altri articoli restano invariati.

## Pipeline

Nunjucks precede Markdown e riceve `immagini_inline` dal front matter. Lo shortcode
valida il modello e rende `figuraInline` nel partial media già esistente. In Analisi
il layout assegna i numeri alla copertina e poi alle figure nell'ordine del corpo
renderizzato. Gli usi ripetuti della stessa voce YAML condividono i crediti e
hanno un collegamento di ritorno per ogni figura. I crediti e le eventuali note
sulle modifiche si scrivono negli stessi campi del front matter.

Il filtro comune `responsiveImage` usa i metadati preparati in
`eleventy.before`. Il rilevatore `file:` gestisce i valori YAML quotati, i
commenti finali e i campi annidati.

Dimensioni intrinseche, `loading="lazy"`, `decoding="async"` e `srcset` vengono
preservati. I profili delle tre misure usano `sizes="auto, …"`: sui browser che
lo supportano la scelta della risorsa segue esattamente la larghezza resa,
comprese sidebar e container query. Seguono stime distinte per misura come
fallback per browser senza auto-sizes; queste sono necessariamente indicative
nei layout a larghezza variabile. Il markup compatto evita che righe vuote nei
campi facoltativi interrompano il blocco HTML durante il parsing Markdown.

Nessun JavaScript per il wrapping e **nessun lightbox** sulle figure inline.

## Verifiche ripetibili

- `npm run build`: comprende `verify:figure-inline` e tutti i controlli esistenti.
- `npm run test:browser -- tests/browser/figure-inline.spec.js`: geometria reale,
  righe affiancate e ritorno a piena larghezza, clear, contenimento, proporzioni,
  risorse e regressione lightbox F/P a otto viewport.
- `FIGURE_SCREENSHOTS=1 npm run test:browser -- tests/browser/figure-inline.spec.js`:
  aggiorna gli screenshot in `docs/immagini-inline/screenshots/`.

La demo riusa un asset esistente; non introduce né sceglie la tavola Geran.
