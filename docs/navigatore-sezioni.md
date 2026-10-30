# Navigatore delle sezioni — componente comune

Documentazione tecnica interna alla build v3.8. **Non pubblicata dal sito**:
`docs/**` è escluso in `.eleventy.js` (`eleventyConfig.ignores`).

Il navigatore delle sezioni (rail verticale desktop + rullino tattile mobile) è un
**componente comune, automatico e riutilizzabile** per tutti i contenuti
editoriali lunghi: schede F, schede P, articoli di Attualità/Strategia/Sistemi e
qualunque futuro layout. Non va copiato nei Markdown e non richiede un indice
manuale nel front matter.

File coinvolti:

- comportamento: [`src/js/nav-sezioni.js`](../src/js/nav-sezioni.js)
- estetica: sezione 17 di [`src/css/frontiera.css`](../src/css/frontiera.css)
- id in build: transform `idSezioni` in [`.eleventy.js`](../.eleventy.js)

---

## 1. Il contratto di markup comune

Il navigatore **non** dipende più dai nomi editoriali (`fasebody`, `reading`, …).
Dipende da un solo attributo semantico, dichiarato dal layout sul contenitore che
racchiude **il solo corpo editoriale indicizzabile**:

```html
data-section-navigation
```

Esempi reali:

| Layout | Contenitore col contratto |
|---|---|
| `layouts/scheda-fase.njk` | `<div class="fasebody" data-section-navigation>` |
| `layouts/scheda-profondita.njk` | `<div class="fasebody" data-section-navigation>` |
| `layouts/analisi.njk` | `<div class="articlebody" data-section-navigation>` |

Per abilitare il navigatore in un **nuovo** layout è sufficiente aggiungere questo
attributo al contenitore del corpo. Nessun'altra modifica è necessaria.

### Perché due strutture diverse

- Le schede **F/P** usano `.fasebody` con selettori CSS a **figlio diretto**
  (`.fasebody > h2`). Introdurre un wrapper interno spezzerebbe quei selettori e
  la griglia: perciò l'attributo è messo **sul `.fasebody` esistente**.
- Gli **articoli** usano `.reading` con selettori a discendente (`.reading h2`):
  un wrapper interno è sicuro. Si introduce quindi `.articlebody` per separare
  esplicitamente il corpo dagli apparati (immagine di testa, box «Schede
  collegate»), che restano **fuori** dal contenitore.

Entrambe le vie sono ammesse: la regola è «attributo sul contenitore del solo
corpo indicizzabile», non «una specifica classe».

---

## Lettore con scroller interno (M1)

M1 riusa lo stesso `nav-sezioni.js`, lo stesso markup `.secnav` e gli stessi
stili della sezione 17 di `frontiera.css`. Il corpo dichiara anche
`data-section-navigation-scroll-root=".mr-reading"`: l’adattatore usa lo scroller
nativo indicato, anziché `window`, e colloca la rail nel suo contenitore.

Le otto sezioni di variabile sono stop custom con ID `mr-variable-c`, `-u`,
`-i`, `-kg`, `-kl`, `-sc`, `-gc`, `-df`, generati dal renderer dei segmenti.
Le tacche e i titoli sono quelli del componente comune, con hover, tastiera,
stato attivo e navigazione esplicita. Solo il click/attivazione di un link
sposta il testo; lo scroll normale resta nativo e il focus AUTO/MANUALE di M1
non viene modificato dal navigatore. L’indicatore segue la lettura anche quando
una variabile grafica resta bloccata manualmente.

L’adattatore abilita la rail nel layout desktop (anche a 1024 px) e riserva una
fascia a destra della lettura. La scrollbar nativa è nascosta. Sul layout mobile
la rail è nascosta e il rullino non viene creato, preservando i controlli e le
interazioni attuali del lettore. Gli articoli normali mantengono rail e rullino.

---

## 2. Che cosa diventa una tappa

La fonte unica dei titoli è **il corpo reale del contenuto**:

- ogni `<h2>` **figlio diretto** del contenitore (le sezioni `##` del Markdown);
- il **primo** blocco `.derivazione`, come tappa «Schema di derivazione», nella
  sua posizione reale (presente solo nelle schede che lo contengono);
- il titolo `#` (h1) **non** è una tappa;
- gli apparati sono esclusi.

### Esclusione degli apparati

Gli elementi di servizio che seguono il corpo sono marcati con
`data-section-navigation-ignore` (oppure vivono fuori dal contenitore):

- `.fasenodi` («I nodi della fase»), `.fasenav` (navigazione sequenziale) nelle
  schede F/P;
- `.relbox` («Schede collegate») negli articoli.

Sia il JavaScript sia il transform di build si fermano al primo apparato, così
nessun id viene aggiunto e nessun titolo di servizio diventa una tappa.

### Soglia minima

Con meno di **2** tappe il navigatore non viene creato (`if (stops.length < 2)`),
per non aggiungere un indice inutile.

---

## 3. ID di sezione generati in build

Il transform `idSezioni` in `.eleventy.js` assegna in fase di build id **leggibili
e stabili** agli `<h2>` del corpo (e l'ancora `#schema-di-derivazione` al primo
blocco `.derivazione`). Vale per **qualunque** pagina che dichiari il contratto:
schede F, schede P, articoli. Caratteristiche:

- slug leggibili, accenti rimossi, apostrofi gestiti, id ripetuti deduplicati;
- gli id dichiarati dall'autore non vengono sovrascritti;
- nessun id fuori dal corpo editoriale.

Così **gli hash funzionano anche senza JavaScript**: il navigatore resta un
miglioramento progressivo, ma i link `#sezione` sono validi nell'HTML statico.
Il CSS aggiunge `scroll-margin-top` coerente con l'header sticky (schede F/P via
`.fasebody > h2`, articoli via `.reading h2`).

---

## 4. Resa e comportamento (invariati)

- **desktop/tablet largo** (≥1140px): rail verticale di tacche con pannello
  Liquid Glass che si espande a sinistra su hover/focus;
- **schermi stretti**: rullino tattile fisso in alto a destra con menu-indice.

Conservati: evidenziazione della sezione attiva, navigazione tramite hash e
aggiornamento dell'URL, supporto tastiera, focus visibile,
`prefers-reduced-motion`, fallback senza JavaScript, scroll coerente con l'header
sticky, nessuna dipendenza esterna. `aria-label="Navigazione delle sezioni"`.

Negli articoli a colonna singola la rail desktop è ancorata al **margine destro**
del foglio (`.reading > .secnav`), così le tacche non toccano mai il testo e la
misura editoriale resta intatta.

---

## 5. Opt-out

Il valore predefinito dei layout editoriali lunghi è **attivo**. Per escludere un
contenuto o un layout è sufficiente **non** emettere l'attributo comune. Il modo
più semplice, senza toccare il Markdown, è avvolgere l'attributo in una
condizione nel layout, per esempio:

```njk
<div class="articlebody"{% if navigatoreSezioni !== false %} data-section-navigation{% endif %}>
```

e, nel raro caso servisse, `navigatoreSezioni: false` nel front matter. Nei layout
attuali l'attributo è sempre presente: l'opt-out è previsto ma non forzato.

---

## 6. Nota per i futuri produttori

> Ogni nuovo articolo deve usare uno dei layout editoriali abilitati al
> navigatore. I titoli di secondo livello (`##`) costituiscono automaticamente le
> tappe del navigatore; non occorre e non è consentito compilare manualmente un
> indice parallelo nel front matter, né inserire l'HTML del navigatore nel
> Markdown.
