# Frontiera

Sito statico di analisi di tecnologia e strategia. Generato con **Eleventy (11ty)** + template **Nunjucks**, contenuti in **Markdown**. Nessun CMS, nessun database, nessun framework frontend. Interfaccia interamente in italiano.

Il sito funziona **senza JavaScript**; carosello, filtri d'archivio e menù mobile sono soltanto miglioramenti progressivi.

---

## Avvio rapido

```bash
npm install        # scarica Eleventy e i font open-source (@fontsource)
npm run build      # copia i font in src/fonts/ e genera il sito in _site/
npm start          # anteprima con ricarica automatica su http://localhost:8080
```

`npm run build` esegue prima `npm run font` (copia i woff2 self-hosted dai pacchetti
`@fontsource` dentro `src/fonts/`, **senza rete**) e poi la build Eleventy.

---

## Struttura

```
contenuti/
  analisi/   → le analisi (Attualità, Strategia)   *.md
  schede/    → le schede di riferimento permanenti  *.md
src/
  _data/     → site.js (nav, titolo), sezioni.js (5 archivi), dominiFiltro.js
  _includes/ → layout (base, analisi, scheda, archivio, pagina) e partial
  css/       → frontiera.css (token + stili)
  js/        → carosello, filtro-archivio, menu-mobile (progressive enhancement)
  fonts/     → woff2 self-hosted (popolati da `npm run font`)
  index.njk metodo.md archivio.njk feed.njk
.eleventy.js → collezioni, filtri, backlink automatici, shortcode {% aff %}
```

---

## (a) Aggiungere un'analisi

Crea un file in `contenuti/analisi/`, es. `mio-pezzo.md`. L'URL sarà `/analisi/mio-pezzo/`.
`layout`, `tags` e `date` sono assegnati automaticamente dalla cartella: scrivi solo il front matter dei contenuti.

```yaml
---
titolo: Titolo dell'analisi
data: 2026-06-16
sezione: Attualità            # Attualità | Strategia
sommario: Una o due frasi che anticipano il pezzo.
teatro: Russia                # area geografica
domini: [aria, terra]         # aria, terra, mare, spazio, cyber-ew, industria
affidabilita: plausibile      # opzionale: badge su card/carosello
                              # confermato | plausibile | non-verificato | disinformazione
in_evidenza: true             # opzionale: candida il pezzo al carosello della home
tempo_lettura: 8
schede_collegate: [tu-22m3]   # slug delle schede citate (vedi punto c)
immagine:
  file:                       # vuoto ⇒ slot segnaposto (vedi punto e)
  alt:
  credito:
  licenza:
  didascalia:
---

Corpo in Markdown. Per marcare un'affermazione non consolidata usa lo shortcode:

La notizia è {% aff "plausibile" %} ma manca conferma ufficiale.
```

**Carosello della home:** mostra le analisi con `in_evidenza: true` (le più recenti per prime).
Se nessuna è marcata, ripiega automaticamente sulle analisi più recenti.

## Aggiungere una scheda

Crea un file in `contenuti/schede/`, es. `mio-mezzo.md`. L'URL deriva dal campo `slug`.

```yaml
---
titolo: Nome del mezzo «Designazione»
slug: mio-mezzo               # chiave usata dai rimandi — deve essere unica
categoria: Mezzi aerei        # Mezzi aerei | Mezzi terrestri | Droni
ruolo: Riga descrittiva breve.
specifiche:                   # coppie chiave/valore → tabella della scheda
  Ruolo: ...
  Primo volo: ...
  Equipaggio: ...
  Velocità max: ...
  Raggio d'azione: ...
  Armamento principale: ...
aggiornata: 2026-06-16
immagine: { file:, alt:, credito:, licenza:, didascalia: }
---

Corpo in Markdown.
```

---

## (b) e (c) Collegare una scheda a un'analisi (rimandi bidirezionali)

Il legame si scrive **una sola volta**, nell'analisi. Il resto è automatico in build.

1. Nella scheda, scegli lo `slug` (es. `tu-22m3`).
2. Nell'analisi, elencalo in `schede_collegate`:

   ```yaml
   schede_collegate: [tu-22m3, munizione-circuitante]
   ```

Risultato:

* l'**analisi** mostra il box **«Schede collegate»** con i link alle schede citate;
* ogni **scheda** mostra da sé il box **«Appare in queste analisi»**, calcolato filtrando
  tutte le analisi il cui `schede_collegate` contiene il suo slug. **Nessun backlink da
  mantenere a mano.**

---

## (d) Pubblicazione

Prima di pubblicare, imposta l'URL definitivo in `src/_data/site.js` (campo `url`): serve
ai link assoluti del feed RSS.

### Cloudflare Pages

1. Carica il repository su GitHub/GitLab.
2. Cloudflare Pages → *Create project* → collega il repo.
3. Impostazioni di build:
   * **Build command:** `npm run build`
   * **Build output directory:** `_site`
   * **Node version:** 18 o superiore (variabile d'ambiente `NODE_VERSION=20`).
4. *Deploy*. Ogni push ricostruisce il sito.

### GitHub Pages (via Actions)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Poi *Settings → Pages → Source: GitHub Actions*. Se il sito vive in una sottocartella
(`utente.github.io/frontiera`), aggiungi `pathPrefix: "/frontiera/"` in `.eleventy.js`.

---

## (e) Aggiungere un'immagine (con i diritti)

La gestione dei diritti è **incorporata nella struttura**: ogni immagine ha campi
obbligatori per credito e licenza.

1. Metti il file in `src/immagini/` (es. `tu-22m3.jpg`).
2. Compila il blocco `immagine` nel front matter:

   ```yaml
   immagine:
     file: /immagini/tu-22m3.jpg
     alt: Descrizione testuale obbligatoria dell'immagine
     credito: Nome autore / Fonte
     licenza: CC BY 2.0          # o "Pubblico dominio (US DoD)", "Grafica originale Frontiera"…
     didascalia: Testo opzionale sotto l'immagine
   ```

Credito e licenza vengono sempre mostrati (didascalia sotto l'immagine d'articolo, overlay
discreto sulle anteprime). **Se `file` è vuoto**, compare lo slot segnaposto petrolio: il
sito resta presentabile anche da vuoto.

> Non incorporare immagini protette da copyright senza una licenza chiara: lascia il
> segnaposto finché non hai un file con diritti d'uso espliciti.

### Versioni responsive (consigliato)

Per generare più dimensioni + `srcset` e formati moderni (WebP/AVIF) in automatico, si può
aggiungere il plugin ufficiale `@11ty/eleventy-img`. Il markup attuale usa un singolo `<img>`
con `loading="lazy"`; il partial `src/_includes/partials/media.njk` è il punto unico in cui
introdurre `<picture>`/`srcset` senza toccare i contenuti.

---

## Font

I tre font (Archivo, Spectral, IBM Plex Mono) sono **self-hosted** e serviti dai pacchetti
open-source [@fontsource](https://fontsource.org) (licenza SIL OFL). `npm run font` li copia
in `src/fonts/` come `woff2`; nessuna CDN esterna viene contattata a runtime (privacy del
lettore). Tutti i `@font-face` usano `font-display: swap`.

## Componente affidabilità

Shortcode Eleventy per le etichette inline, da usare nel corpo Markdown:

```
{% aff "confermato" %}  {% aff "plausibile" %}  {% aff "non-verificato" %}  {% aff "disinformazione" %}
```

Gli stessi quattro livelli sono dichiarati nella pagina **Metodo**.
