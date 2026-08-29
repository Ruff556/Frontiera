# Motore territoriale — architettura

## Flusso dei dati

Il front matter richiama un identificatore stabile sotto `cartina.territori.dataset`. Il filtro Eleventy carica la relativa `FeatureCollection` da `src/_data/cartinaTerritori`, valida lo stato semantico e converte ogni coordinata WGS84 con la stessa funzione `project()` già usata dagli hotspot.

Il renderer produce SVG statico in build. Non invia librerie GIS o JavaScript cartografico al browser.

Ordine dei livelli:

1. base raster georeferenziata e wash;
2. pattern territoriali SVG;
3. fallback della linea, solo quando la fase non possiede `territori`;
4. hotspot e leader lines;
5. nomi della base e accessori.

Le Fasi 0 e 3 non dichiarano `lineaContatto`: area e linea non possono quindi apparire insieme. Le categorie della legenda sono ricavate dalle feature realmente presenti.

Il fallback della linea era uno stato transitorio. Dal 20 luglio 2026 tutte le sei fasi possiedono un master territoriale validato: i blocchi `lineaContatto` di F1, F2, F4 e F5 sono stati rimossi soltanto dopo importazione, verifica topologica e controllo del render. Il motore conserva la compatibilità con il fallback, ma nessuna fase pubblicata lo usa.

Il generatore d'import non deduce il fronte: non legge testi, non legge le percentuali editoriali, non chiude le linee di contatto e non interpola fra istantanee. Riceve geometrie digitalizzate su cartografia datata e le normalizza soltanto. Procedura e fonti per ciascuna fase in `DIGITALIZZAZIONE-F1-F2-F4-F5.md`.

## Componenti

| File | Responsabilità |
|---|---|
| `src/_lib/cartina.js` | caricamento, proiezione, path SVG, pattern, accessibilità, debug e superficie geodetica |
| `src/_includes/partials/cartina-fase.njk` | struttura del singolo SVG, legenda automatica e crediti |
| `src/_data/cartinaTerritori/*.geojson` | geometrie master e metadati per istantanea |
| `scripts/verifica-territori.cjs` | struttura, topologia, proiezione, sovrapposizioni, aree e intersezioni ADM1 |
| `scripts/genera-territori.mjs` | riproduzione controllata dei master F0/F3 da esportazioni storiche autorizzate |
| `scripts/importa-territori.mjs` | import delle digitalizzazioni delle Fasi 1, 2, 4 e 5: riparazione, dissoluzione, separazione delle categorie, ritaglio ed export |

## Debug

`CARTINA_DEBUG=1 npm run build` aggiunge soltanto all'HTML di sviluppo reticolo geografico, vertici, bounding box, identificatore e superficie delle feature. Il validatore interrompe la build sui punti di autointersezione e sulle sovrapposizioni fra categorie; la build pubblica ordinaria non contiene il livello debug.

Non esistono correzioni per fase in coordinate SVG o pixel.
