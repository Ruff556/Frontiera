# Validazione immagini inline

Data: 7 ottobre 2026. Base: `c590814b73d7165e0989fb5dc2a9794a4f386acb`.
Ramo: `feat/immagini-inline`.

## Esplorazione e scelte

- `origin/main` aggiornato tramite fetch; working tree iniziale pulito, nessun
  `AGENTS.md` presente. Eleventy 3, preprocessore Markdown Nunjucks confermato.
- Metadata responsive generati prima del rendering in `eleventy.before`;
  `file:` annidato viene già scoperto, esteso il solo supporto a virgolette/commenti.
- La macro `media()` e il suo profilo `lightboxInline` restano invariati. La nuova
  macro vive nello stesso partial e riusa `responsiveImage` e lo stile `media`.
- Lo schema STR1 misura **728.81px** a viewport 1440px: la figura piena della
  demo misura anch'essa **728.81px**, senza invadere la sidebar. Non è stata
  assunta una larghezza fissa di 38rem per gli schemi.
- Breakpoint viewport 740px, soglie della colonna 480px/608px per i due float.
  Con figure presenti, prosa e figure condividono il bordo del corpo. Nel foglio
  senza sidebar la larghezza esplicita impedisce il collasso dovuto a containment.
- `sizes="auto, …"` usa la misura effettiva delle immagini lazy; le stime di
  fallback sono separate per misura. Nessuna nuova dipendenza e nessun JS di layout.

## Misure reali nel browser

| Viewport | Corpo / figura piena | 2/4 | 3/4 |
| --- | ---: | ---: | ---: |
| 1440 | 728.81 | 342.53 (float) | 481.02 (float) |
| 1280 | 737.78 | 346.75 (float) | 486.92 (float) |
| 1024 | 521.75 | 245.22 (float) | 521.75 (blocco) |
| 900 | 419.81 | 419.81 (blocco) | 419.81 (blocco) |
| 768 | 654.34 | 307.53 (float) | 431.86 (float) |
| 740 | 630.50 | 296.33 (float) | 416.13 (float) |
| 739 | 629.66 | 629.66 (blocco) | 629.66 (blocco) |
| 390 | 319.63 | 319.63 (blocco) | 319.63 (blocco) |

Il passaggio a blocco a 900px è intenzionale: compare la sidebar e la colonna
si restringe. I valori sono in CSS px, con font del sito caricati.

## Verifiche

- Build pulita: `_site` rimosso prima di `npm run build`, metadata ricreati nel
  nuovo processo. La demo include anche `str1-sam-blue.png`, asset esistente
  precedentemente esterno alle dichiarazioni editoriali responsive.
- Shortcode reale richiamato con contesto di pagina: riferimenti indefiniti, asset
  mancanti e percorsi fuori da `src/immagini/` rifiutati con diagnostica.
- `verify:figure-inline`: default, errori di misura/lato/alt/campi, escaping con
  HTML ostile, assenza di paragrafi spurii nella figura, asset emessi esistenti,
  Markdown successivo preservato, `noindex`, esclusione da home/feed/sitemap.
- Test Chromium dedicati: otto viewport; rettangoli delle righe verificano il
  vero affiancamento e il ritorno a piena larghezza. Verificati clear, figure
  consecutive, rapporti d'aspetto, contenimento, assenza di overflow, allineamento
  didascalie e assenza di errori JavaScript. Caso aggiuntivo senza sidebar su
  desktop, tablet e mobile. Lightbox F0 aperto/chiuso e schema STR1 ancora presente.
- Screenshot ispezionati su desktop, tablet e mobile. Nessun test su telefono
  fisico, Safari o Firefox; senza container query il fallback è a blocco.
- Gli articoli e gli asset originali non sono stati modificati; STR3 e tavola
  Geran esclusi dall'intervento. Nessun merge o deploy in produzione.

Esecuzione locale: Chromium di sistema (`/usr/bin/chromium`) tramite una
configurazione Playwright temporanea esterna al repository. La CI conserva la
configurazione e l'installazione Chromium già adottate dal progetto.

## Screenshot

- [Desktop 1440px](screenshots/demo-1440.png)
- [Tablet 768px](screenshots/demo-768.png)
- [Soglia 740px](screenshots/demo-740.png)
- [Mobile 390px](screenshots/demo-390.png)

Dettagli di lettura: [wrapping desktop](screenshots/wrapping-1440.png) e
[disposizione mobile](screenshots/wrapping-390.png).
