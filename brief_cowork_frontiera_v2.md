# Brief Cowork — Build di *Frontiera* (versione definitiva)

## Riferimento visivo: replica fedele del prototipo

Nella stessa cartella trovi **`frontiera_prototipo.html`**: un prototipo navigabile single-file già approvato. La direzione visiva è decisa — **replicala fedelmente**, non reinventarla. In particolare conserva:

- **Palette**: petrolio profondo (`#0F1A22` / `#16242E`) per chrome, testate e footer; superficie di lettura chiara e fresca (`#F4F6F4` / bianco card); accento brand blu-petrolio (`#1C6E8C`). I colori semantici dell'affidabilità restano **separati** dal brand: confermato verde (`#2E7D5B`), plausibile ambra, non verificato grigio (`#7A8791`), disinformazione rosso (`#B23B36`).
- **Tipografia (3 ruoli)**: *Archivo* per i titoli (display), *Spectral* per il corpo del testo lungo, *IBM Plex Mono* per metadati, eyebrow ed etichette.
- **Firma visiva**: la "linea di frontiera" che avanza sulla home (linea orizzontale + punto luminoso animato) sopra una griglia tipo carta topografica. Rispetta `prefers-reduced-motion` (il punto si ferma).
- **Navigazione in vetro (glassmorphism)**: confinata alla barra superiore. **Non** estendere l'effetto vetro alle superfici di lettura.
- **Struttura delle viste**: home (carosello + griglie di sezione), archivio di sezione filtrabile, pagina analisi, pagina scheda.

Estrai i token (colori, scala tipografica, raggi, spaziature) dal prototipo e centralizzali in CSS custom properties.

## Stack tecnico

- **Generatore**: Eleventy (11ty) + template Nunjucks. Contenuti in Markdown con front matter.
- **Font self-hosted**: scarica e servi localmente i tre font (no CDN esterne, per privacy del lettore). Nel prototipo arrivano da Google Fonts: nella build vanno self-hosted con `font-display: swap`.
- **Zero JS non necessario**: il sito deve funzionare senza JavaScript. JS solo come miglioramento progressivo (carosello, filtro archivio, menù mobile). Senza JS: il carosello degrada a primo elemento statico visibile, i filtri mostrano tutto, il menù resta raggiungibile.
- **Accessibilità e prestazioni**: HTML semantico, focus da tastiera visibile, responsive fino a mobile, immagini responsive (`srcset`), skip-link.

## Modello di contenuti — due tipi distinti

### 1. Analisi (collection `analisi`)
Contenuti legati al tempo: sezioni **Attualità** e **Strategia**. File `.md` in `/contenuti/analisi/`. Front matter:
```yaml
titolo:
data:
sezione: Attualità        # o Strategia
sommario:                 # 1–2 frasi
teatro:                   # area geografica
domini: [aria, droni]     # uno o più: aria, terra, mare, spazio, cyber-ew, industria
immagine:                 # vedi sistema immagini
schede_collegate: [tu-22m3, munizione-circuitante]   # slug delle schede citate
tempo_lettura:
```

### 2. Schede (collection `schede`)
Profili di riferimento **permanenti**, indipendenti dalla cronaca: sezioni **Mezzi aerei**, **Mezzi terrestri**, **Droni**. File `.md` in `/contenuti/schede/`. Front matter:
```yaml
titolo: Tupolev Tu-22M3 «Backfire-C»
slug: tu-22m3
categoria: Mezzi aerei    # Mezzi aerei | Mezzi terrestri | Droni
ruolo:                    # riga descrittiva breve
specifiche:               # coppie chiave/valore per la tabella
  Ruolo:
  Primo volo:
  Equipaggio:
  Velocità max:
  Raggio d'azione:
  Armamento principale:
immagine:
aggiornata:
```

### Rimandi bidirezionali (requisito chiave)
Il legame analisi↔scheda è il cuore di *Frontiera* e va **automatico**:
- In una **analisi**, `schede_collegate` genera il box "Schede collegate" con i link alle schede citate.
- In una **scheda**, calcola in build il box "Appare in queste analisi" filtrando tutte le analisi il cui `schede_collegate` contiene lo slug della scheda corrente. Nessuna manutenzione manuale del backlink: si deduce dai dati.

## Sistema immagini (mix foto + grafica)

Le immagini mescolano foto reali e grafica originale. **La gestione dei diritti è incorporata nella struttura**: ogni immagine ha campi obbligatori per credito e licenza.
```yaml
immagine:
  file:                   # percorso in /immagini/
  alt:                    # testo alternativo (obbligatorio)
  credito:                # autore/fonte
  licenza:                # es. "CC BY 2.0", "Pubblico dominio (US DoD)", "Grafica originale Frontiera"
  didascalia:             # opzionale
```
- Renderizza credito e licenza in modo discreto ma sempre presente (sotto l'immagine o in un overlay leggero).
- **Fallback segnaposto**: quando `immagine.file` manca, mostra lo slot scuro petrolio del prototipo (con etichetta mono), così il sito resta presentabile da vuoto.
- Genera immagini responsive (più dimensioni + `srcset`); formati moderni (WebP/AVIF) con fallback.
- **Non** scaricare né incorporare immagini protette da copyright: i segnaposto restano finché non fornisco file con licenza chiara.

## Pagine

- **Home**: carosello editoriale dei pezzi in evidenza (sobrio, avanzamento lento, frecce + dot, fermo con reduced-motion) + griglie "Attualità", "Strategia" e "Schede · Mezzi e sistemi".
- **Archivio di sezione**: una per ciascuna delle sei voci di nav, con filtri (per le analisi: per dominio; per le schede: per categoria).
- **Analisi** e **Scheda**: come da prototipo, con i box di rimando.
- **Metodo**: pagina che dichiara gerarchia delle fonti, scala di affidabilità e separazione fatto/interpretazione. Scrivine una prima bozza sobria.
- **Feed RSS** delle analisi.

## Componente affidabilità
Crea uno shortcode Eleventy per le etichette inline, es. `{% aff "plausibile" %}`, che produce lo `<span>` stilizzato del prototipo. Le bozze in Markdown lo useranno per marcare i claim non consolidati.

## Contenuti di prova
Replica i segnaposto del prototipo come contenuti reali nel sistema: **3 analisi** (incluso il Tu-22M3 caduto in Attualità e la capacità residua del bombardamento strategico in Strategia) e **2–3 schede** (Tu-22M3 fra i Mezzi aerei, una munizione circuitante fra i Droni, un mezzo terrestre), con i rimandi bidirezionali **funzionanti** fra loro. Corpo in testo segnaposto strutturato, ciascun pezzo con almeno un'etichetta di affidabilità.

## Flusso di lavoro
1. Poiché la direzione visiva è approvata, **non** ridiscutere il design. Presenta solo: (a) l'alberatura dei file, (b) il modello di dati definitivo (front matter, collections, meccanismo dei backlink). **Attendi una mia conferma breve**, poi costruisci.
2. Costruisci il sito completo.
3. Verifica: esegui la build, controlla i link interni e i rimandi bidirezionali, la resa responsive e il funzionamento senza JS. Fai un'autocritica rispetto al prototipo (cosa diverge e perché).
4. Consegna un `README.md` con istruzioni concise per: (a) aggiungere un'analisi e una scheda (con esempi di front matter), (b) collegare una scheda a un'analisi, (c) buildare in locale, (d) pubblicare su Cloudflare Pages o GitHub Pages, (e) aggiungere un'immagine rispettando i campi di licenza.

## Cosa non fare
- Niente CMS, database, framework frontend.
- Niente immagini protette da copyright incorporate d'iniziativa.
- Tutta l'interfaccia in italiano.
- Non ridiscutere la direzione visiva: è decisa nel prototipo.
- Non procedere alla build prima della conferma del modello di dati e dell'alberatura.
