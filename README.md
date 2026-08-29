# Frontiera

Sito statico di analisi di tecnologia e strategia. Generato con **Eleventy (11ty)** + template **Nunjucks**, contenuti in **Markdown**. Nessun CMS, nessun database, nessun framework frontend. Interfaccia interamente in italiano.

Il sito funziona **senza JavaScript**; carosello, filtri d'archivio e menù mobile sono soltanto miglioramenti progressivi.

---

## Licenze

- Il codice e l'infrastruttura software originali di Frontiera sono proprietari: tutti i diritti sono riservati.
- Salvo diversa indicazione, i contenuti editoriali originali di Frontiera sono disponibili con licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Il nome, il logo e il branding Frontiera sono esclusi dalla CC BY 4.0.
- Immagini, font, dipendenze, cartografia e altri materiali di terzi restano soggetti alle rispettive licenze.

Per i dettagli, le attribuzioni e le esclusioni, consulta [`LICENSE.md`](LICENSE.md).

---

## Avvio rapido

```bash
npm install        # scarica Eleventy e i font open-source (@fontsource)
npm run build      # copia i font in src/fonts/ e genera il sito in _site/
npm start          # anteprima con ricarica automatica su http://localhost:8080
```

`npm run build` esegue prima `npm run font` (copia i woff2 self-hosted dai pacchetti
`@fontsource` dentro `src/fonts/`, **senza rete**) e poi la build Eleventy.

I tre formati di infobox e i relativi blocchi YAML pronti da copiare sono
documentati in [`docs/infobox.md`](docs/infobox.md).

La base operativa per i futuri schemi autonomi e documentata in
[`docs/schema-kit/README.md`](docs/schema-kit/README.md). Il kit standardizza
telaio, accessibilita e primitive di animazione senza imporre geometria o regia.

---

## Struttura

```
contenuti/
  analisi/   → le analisi (Attualità, Strategia)   *.md
  schede/    → le schede di riferimento permanenti  *.md
src/
  _data/     → site.js (nav, titolo), sezioni.js (2 archivi), dominiFiltro.js
  _includes/ → layout (base, analisi, scheda, archivio, pagina) e partial
  css/       → base condivisa + moduli caricati solo dove servono
  js/        → runtime del sito + schema-kit.js (primitive opt-in per nuovi schemi)
  fonts/     → woff2 self-hosted (popolati da `npm run font`)
  index.njk progetto.md archivio.njk feed.njk
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
tempo_lettura: 8              # conservato per compatibilità: NON è più mostrato
                              # nell'interfaccia (scelta editoriale)
sistemi_citati: [starlink, palantir] # slug dei sistemi citati (vedi punto b)
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

**Carosello della home:** rappresenta Attualità, Strategia e Sistemi con al massimo
un contenuto per nucleo; `in_evidenza: true` candida il contenuto al proprio slot.

## Aggiungere una scheda

Crea un file in `contenuti/schede/`, es. `mio-sistema.md`. L'URL deriva dal campo
`slug`. La homepage (`/#sistemi`) è l'indice pubblico completo della sezione.

```yaml
---
titolo: Nome del sistema
slug: mio-sistema             # chiave usata dai rimandi — deve essere unica
categoria: Sistemi            # valore richiesto per collections.sistemi
ruolo: Riga descrittiva breve.
specifiche:                   # coppie chiave/valore → tabella della scheda
  Ruolo: ...
  Tipologia: ...
  Produttore: ...
  Architettura: ...
  Impiego: ...
aggiornata: 2026-06-16
immagine:
  file:
  alt:
  credito:
  licenza:
  didascalia:
  fit: contain                # opzionale per loghi/grafiche; default: cover
---

Corpo in Markdown.
```

---

## (b) Rimandi automatici tra contenuti e schede S

Il contratto editoriale è `sistemi_citati`: un array di slug per i sistemi che
svolgono una funzione analiticamente significativa nel contenuto. La corrispondenza
è esatta e non viene ricavata dalla ricerca nel titolo o nel corpo Markdown.

Il campo è ammesso nelle tre famiglie che alimentano i backlink delle schede S:

* **Linea F**: pagine con tag `fasi`;
* **Linea P**: pagine con tag `schede-profondita` (le pagine reali, non i nodi
  sintetici di `collections.profondita`);
* **Attualità**: analisi con `sezione: Attualità`.

In **Attualità**, `sistemi_citati` alimenta il box **«Sistemi citati»**, che mostra
solo le schede S realmente esistenti. Le pagine di **Strategia** restano escluse
da questo rimando. In F/P il campo alimenta il backlink automatico nelle schede S:
il box **«Il sistema in Frontiera»** compare solo quando esiste almeno un riferimento
e usa l'URL reale della pagina citante. F e P mostrano rispettivamente il codice
`F{{ numero }}` o `P{{ numero }}` e preferiscono `titoloBreve` a `titolo`.

Esempio:

```yaml
sistemi_citati: [starlink, palantir]
```

Uno slug valido non richiede che esista già una scheda S: finché la scheda non è
pubblicata resta un metadato dormiente, senza link, segnaposto o avvisi pubblici.
Quando viene pubblicata una scheda con quello `slug`, i riferimenti pregressi
emergono automaticamente alla build. Gli array devono contenere stringhe non vuote,
senza duplicati, nel formato `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

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

Credito e licenza restano sempre visibili nella pagina editoriale completa; le anteprime
della homepage (carosello e card Sistemi) non mostrano overlay. **Se `file` è vuoto**, compare lo slot segnaposto petrolio: il
sito resta presentabile anche da vuoto.

Nella griglia Sistemi della homepage le card sono pannelli 16:9 e la griglia passa
da una a due e infine a un massimo di tre colonne. Per fotografie ometti `fit`
(il default è `cover`); per loghi e grafiche usa `fit: contain`, che preserva
l'intera immagine su un fondo nero senza padding. La pagina di dettaglio Sistemi
riusa la stessa struttura visuale e responsive degli articoli di Attualità.

> Non incorporare immagini protette da copyright senza una licenza chiara: lascia il
> segnaposto finché non hai un file con diritti d'uso espliciti.

### Versioni responsive

La build genera automaticamente varianti WebP e nel formato originale tramite
`@11ty/eleventy-img`, con larghezze calibrate per carosello, timeline, card, pannelli e
testate editoriali. I template emettono `<picture>`, `srcset`, `sizes`, dimensioni intrinseche
e caricamento differito; solo l'immagine prioritaria usa `loading="eager"` e
`fetchpriority="high"`. Il file originale delle immagini F/P viene richiesto dal lightbox
soltanto all'apertura. Non occorre generare a mano le varianti: `npm run build` aggiorna
`_site/immagini/responsive/`.

---

## Sistema visivo (Liquid Glass editoriale)

La base condivisa vive in `src/css/frontiera.css`; gli schemi, il debito d'integrazione e
il lightbox hanno fogli separati che `base.njk` carica soltanto nelle pagine interessate.
Tre regole reggono l'insieme:

1. **Un solo ambiente.** Il reticolo cartografico esiste una volta sola, in `.ambiente`
   (fisso, `z-index:-1`, iniettato da `base.njk`). Nessun componente lo ristampa al proprio
   interno: le superfici traslucide lo lasciano semplicemente trasparire.
   L'ambiente è composto di cinque strati: campo petrolio, banda d'aurora diagonale,
   reticolo a due densità in deriva lentissima, traiettorie diagonali rade, luci diffuse
   con vignettatura. Due variabili in `:root` regolano l'intera atmosfera senza toccare
   altro: **`--vibrazione`** (intensità delle luci, `.7` trattenuto → `1.3` acceso) e
   **`--reticolo`** (presenza di reticolo e traiettorie). Le luci più forti stanno dove non
   corre testo — destra, fondo, margini — così l'aumento di atmosfera non costa contrasto.
2. **Tre famiglie di superficie.** *Vetro scuro* (`--gd-*`) per chrome, pannelli operativi e
   card; *vetro chiaro* (`--gl-*`) per controlli, navigatore e pop-up; *foglio* (`--fg-*`)
   per la lettura lunga — opaco, senza `backdrop-filter`, per non pagare blur su superfici
   enormi durante lo scroll.
3. **Testate senza fondo proprio.** `.testata` non dipinge un rettangolo scuro: appoggia
   soltanto un alone locale, così l'ambiente prosegue senza cuciture fino al foglio chiaro.

Token principali: petrolio `--ink*`, carta `--paper*`, accento `--accent` (superfici) e
`--accent-hi` (testo su fondo scuro, tarato per restare ≥4.5:1). I livelli `--on-dark-2/3/4`
sono le tre densità di testo ammesse sul buio.

La linea del tempo della home (`.linea-fasi`) è un **componente di solo CSS**: si espande
su hover/focus dove il puntatore è fine (`@media (hover:hover) and (pointer:fine)`) e
resta distesa e completa su touch e senza JavaScript.

**L'immagine di fase è materia permanente del pannello**, non un accessorio che compare
all'interazione. Vive in `.lf-scena` (un `<img loading="lazy">` decorativo, `aria-hidden`):
su desktop copre l'intero pannello a opacità ridotta e cresce di presenza in espansione; su
mobile è una banda a tutta larghezza in testa alla card. In entrambi i casi lo scrim
(`.lf-scena::after`) garantisce il contrasto di numero e titolo, e **crediti e licenza
vivono nel piede** (`.lf-credito`), mai sopra l'immagine.

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

La logica degli indicatori di affidabilità è descritta nella pagina **Il progetto Frontiera**.

## Schema «Debito d'integrazione»

Componente editoriale interattiva e **riutilizzabile**: due curve (frontiera
dell'innovazione / capacità integrata) e la fascia compresa fra esse. Non è legata
a un articolo: si richiama dove serve, con testi e configurazione propri.

### File

- `src/_includes/partials/debito-integrazione.njk`: macro Nunjucks, markup, SVG e
  **tutti i testi predefiniti** (in testa al file);
- `src/css/debito-integrazione.css`: stili e stati;
- `src/js/debito-integrazione.js`: miglioramento progressivo (ripristino su clic
  esterno/Esc, comparsa delle curve). Caricato da `base.njk`, esce subito se in
  pagina non c'è alcuno schema.

### Richiamo (Markdown o Nunjucks)

```njk
{% from "partials/debito-integrazione.njk" import debitoIntegrazione %}
{{ debitoIntegrazione({ id: "debito-mio-pezzo" }) }}
```

L'`id` deve essere **unico nella pagina**: da esso derivano i nomi dei controlli e
gli identificatori di gradienti e trame. Senza altri parametri la componente esce
con i testi predefiniti.

### Parametri

Tutti opzionali, tutti stringhe salvo dove indicato:

| Parametro | Effetto |
|---|---|
| `id` | identificatore univoco (obbligatorio se in pagina c'è più di uno schema) |
| `eyebrow`, `titolo`, `intro` | testata editoriale |
| `variante` | `chiara` (predefinito, sul foglio) o `scura` (su fondo in vetro scuro) |
| `classe` | classe aggiuntiva sul `<figure>`; `debito--larga` mette il pannello a fianco del grafico oltre i 1024 px |
| `innovazioneNome`, `innovazioneTesto` | curva superiore |
| `integrataNome`, `integrataTesto` | curva inferiore |
| `debitoNome`, `debitoTesto` | fascia |
| `frenataNome/Etichetta/Testo/Messaggio` | primo momento (etichetta = versione breve per mobile) |
| `governataNome/Etichetta/Testo/Messaggio` | secondo momento |
| `frammentazioneNome/Etichetta/Testo/Messaggio` | terzo momento |
| `chiusuraPrima`, `chiusuraSeconda` | le due righe di chiusura (`chiusuraSeconda: false` la elimina) |
| `didascalia`, `fonte` | `<figcaption>` |
| `titoloGrafico`, `descrizione` | nome e descrizione accessibili dell'SVG |
| `watermark` | `false` disattiva la firma FRONTIERA (attiva per impostazione predefinita) |

Per cambiare i testi **di tutti i richiami** si modificano i valori predefiniti in
testa al partial; per cambiarli in un solo punto si passano come parametri.

### Vincoli rispettati

Nessuna dipendenza funzionale da JavaScript: curve, fascia, assi, etichette, tre
momenti e pannello sono nell'HTML e la selezione è CSS puro (sei `radio` nascosti
ma raggiungibili da tastiera, letti da `:checked`). Con JS disattivato lo schema
compare completo e resta interamente esplorabile. Nessuna libreria, nessuna
richiesta di rete, nessun font o stile aggiuntivo.

## Cartina delle schede-fase

La cartina viene generata durante la build di Eleventy. Nel browser arriva soltanto
HTML/SVG statico: non esiste alcuno script cartografico lato client.

### File

- `src/_includes/partials/cartina-fase.njk`: componente grafico comune;
- `src/_lib/cartina.js`: proiezione, validazione e generazione SVG a build-time;
- `src/_data/cartinaLuoghi.json`: registro centrale dei luoghi;
- `src/_data/cartinaLinee.json`: dataset GeoJSON delle linee di contatto;
- `src/immagini/cartografia/ukraine-administrative-base.png`: base amministrativa;
- `src/immagini/cartografia/CREDITS.txt`: attribuzione e licenza della base.

### Front matter

```yaml
cartina:
  dataRiferimento: "1 marzo 2025"
  datiTerritoriali: "Testo sintetico o percentuali territoriali della fase."
  hotspot:
    - tipo: punto
      luogo: sudzha
      etichetta: "Sudža"
      posizioneEtichetta: sinistra
    - tipo: asse
      da: pokrovsk-donetsk
      a: kostiantynivka-donetsk
      etichetta: "Asse Pokrovs'k–Kostjantynivka"
      posizioneEtichetta: sopra
  lineaContatto:
    dataset: contatto-fase-4-2025-03-13
```

`posizioneEtichetta` è obbligatoria. Valori ammessi:
`destra`, `sinistra`, `sopra`, `sotto`, `alto-destra`, `alto-sinistra`,
`basso-destra`, `basso-sinistra`.

Per una correzione eccezionale si può aggiungere:

```yaml
scostamentoEtichetta:
  x: 0
  y: -0.5
```

Gli scostamenti sono espressi nelle unità del `viewBox` SVG. Identificatori,
coordinate, dataset e posizioni non valide interrompono la build con un errore
esplicito.

### Cartina territoriale: aree invece della linea

Una fase può mostrare le **aree di controllo** invece della linea di contatto,
dichiarando `territori` al posto di `lineaContatto`:

```yaml
cartina:
  dataRiferimento: "14 agosto 2024"
  territori:
    dataset: controllo-fase-3-2024-08-14
    data: "2024-08-14"
```

Area e linea non convivono: una fase dichiara l'una o l'altra. Le categorie
della legenda sono ricavate automaticamente dalle feature presenti nel dataset.

Oggi possiedono il master territoriale le Fasi 0 e 3. Le Fasi 1, 2, 4 e 5
restano sul fallback della linea di contatto e `npm run verify:territori` lo
dichiara a ogni build con un avviso `MANCANTE`. Il blocco `territori` è già
scritto come commento nel front matter di ciascuna: per attivarlo servono le
geometrie digitalizzate.

Per produrle:

```bash
npm run import:territori -- --fase 1 --input <digitalizzazione.geojson>
npm run verify:territori
```

L'import non deduce il fronte da testi, percentuali o linee di contatto: riceve
una digitalizzazione su cartografia datata e si limita a ripararla, dissolverla,
separarne le categorie ed esportarla. Formato d'ingresso, fonti suggerite per
ciascuna data e criteri conservativi sono in
`docs/cartina-territori/DIGITALIZZAZIONE-F1-F2-F4-F5.md`.

Il dataset `fase-4-test-locale` in `cartinaLinee.json` è residuo di collaudo e
non è più richiamato da alcuna pagina.

## Diagramma della profondità (schede P)

Le **schede P** non usano la cartina: nella testata ospitano il *diagramma
funzionale della profondità*, componente seriale proprio della linea P. Mostra
come una fase distribuisce capacità di accesso, qualità dell'accesso,
vulnerabilità funzionali e mutamento lungo la profondità del conflitto — non il
controllo territoriale. Generato in build: nel browser arriva solo HTML/CSS, mai
JavaScript.

### File

- `src/_data/profonditaVocabolario.js`: fasce, stati, attori, tassonomia dei nodi,
  simboli, limiti e testi fissi — fonte canonica unica;
- `src/_lib/diagramma-profondita.js`: validazione, normalizzazione, segmentazione
  dei vettori, riepilogo accessibile;
- `src/_includes/partials/diagramma-profondita.njk`: renderer (HTML + CSS Grid);
- `src/immagini/profondita/icone-profondita.svg`: sprite locale delle icone;
- `src/css/frontiera.css`, sezione 14.1: namespace `.depth-*`.

### Front matter

```yaml
diagrammaProfondita:
  versione: 1
  dataAssetto: "2022-10-09"
  profili:
    ucraina:
      complesso: "Sistemi e catena d'attacco dominante"
      accesso:
        contatto:   { stato: reiterabile }
        prossima:   { stato: reiterabile }
        intermedia: { stato: non-accessibile }
        profonda:   { stato: episodico }
      nodi:
        - tipo: depositi
          fascia: prossima
          etichetta: "Etichetta editoriale facoltativa"
      limite: "Fattore dominante che interrompe o degrada l'accesso"
    russia:
      # stessa struttura
```

Fasce: `contatto` · `prossima` · `intermedia` · `profonda`, di uguale larghezza
semantica (non proporzionale ai chilometri). Stati: `reiterabile` · `limitato` ·
`episodico` · `non-accessibile`, propri della singola corsia e **non
necessariamente monotoni**. Colori, classi, coordinate, lunghezze delle frecce,
legenda, nota metodologica e descrizione accessibile sono derivati: non vanno mai
nel front matter. La fascia dichiara soltanto il proprio `stato`: le chiavi
`nota`, `mutamento` e `soglia` sono state ritirate dal contratto e vengono
rifiutate in build.

Per pubblicare una nuova scheda P bastano il Markdown, il blocco
`diagrammaProfondita` e `npm run build`: nessuna modifica a template, CSS o
configurazione.

```bash
npm run verify:profondita
```

Documentazione completa: `docs/diagramma-profondita/ARCHITETTURA.md`,
`CONTRATTO-DATI.md`, `VALIDAZIONE.md`.
