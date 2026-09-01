# Report migrazione epistemica — Tranche B

## Stato repository

- Branch: `V1---corpus`
- Worktree operativo: `C:/Users/miche/Documents/GitHub/Frontiera-Codex`
- Registro autoritativo: `C:/Users/miche/Desktop/Codex - Frontiera MATERIALI/Registro-epistemico-corpus-Frontiera.md`

## Stato globale

- Articoli canonici: 19
- Indicatori attesi: 329
- Confermati attesi: 213
- Plausibili attesi: 96
- Non verificati attesi: 20

## Dataset

| Dataset | Articoli | Indicatori |
| --- | ---: | ---: |
| linea-f | 6 | 132 |
| linea-p | 7 | 112 |
| attualita | 2 | 20 |
| strategia | 1 | 15 |
| sistemi | 3 | 50 |

## Articoli

| Articolo | page.inputPath | Attesi | Migrati | Errori |
| --- | --- | ---: | ---: | ---: |
| F0 | `contenuti/fasi/0-prologo-manovra-fallita.md` | 10 | 10 | 0 |
| F1 | `contenuti/fasi/1-duello-logistico.md` | 22 | 22 | 0 |
| F2 | `contenuti/fasi/2-difesa-che-osserva.md` | 29 | 29 | 0 |
| F3 | `contenuti/fasi/3-occhio-che-diventa-arma.md` | 18 | 18 | 0 |
| F4 | `contenuti/fasi/4-nervo-fuori-dallo-spettro.md` | 22 | 22 | 0 |
| F5 | `contenuti/fasi/5-macchina-prima-delluomo.md` | 31 | 31 | 0 |
| P0 | `contenuti/profondita/0-asimmetria-iniziale-decisione-mancata.md` | 21 | 21 | 0 |
| P1 | `contenuti/profondita/1-interdizione-operativa-arretramento-logistico.md` | 19 | 19 | 0 |
| P2 | `contenuti/profondita/2-coercizione-energetica-profondita-negata-a-kyiv.md` | 16 | 16 | 0 |
| P3 | `contenuti/profondita/3-profondita-selettiva-alta-qualita.md` | 13 | 13 | 0 |
| P4 | `contenuti/profondita/4-autonomia-embrionale-campagne-concorrenti-di-scala.md` | 23 | 23 | 0 |
| P5 | `contenuti/profondita/5-industrializzazione-santuario-penetrato.md` | 7 | 7 | 0 |
| P6 | `contenuti/profondita/6-attacco-sistemico-profondita-difesa.md` | 13 | 13 | 0 |
| A1 | `contenuti/analisi/articolo-attualita-fedorov-syrskyj.md` | 0 | 0 | 0 |
| A2 | `contenuti/analisi/Storm-Shadow-Ucraina-la-fabbrica-entra-nella-profondita.md` | 20 | 20 | 0 |
| STR1 | `contenuti/analisi/capacita-residua-bombardamento.md` | 15 | 15 | 0 |
| S1 | `contenuti/schede/S1-Starlink.md` | 18 | 18 | 0 |
| S2 | `contenuti/schede/S2-Palantir.md` | 12 | 12 | 0 |
| S3 | `contenuti/schede/S3-Rassvet.md` | 20 | 20 | 0 |

`A1 — 0 attesi / 0 migrati`

## Controlli

- Marker V1 totali: 329
- Vecchi marker residui: 0
- Record V1 totali: 329
- Marker senza record: 0 nella verifica strutturale deterministica
- Record migrati senza marker: 0 nella verifica strutturale deterministica
- ID ambigui: 0
- Path non risolti: 0 come percorsi; la risoluzione runtime è bloccata dalla contraddizione `ID_RE` descritta sotto
- Fonti Frontiera individuate: 0
- Differenze editoriali non autorizzate: 0
- Fonti associate importate dal Registro: 417
- Distribuzione effettiva: 213 confermati / 96 plausibili / 20 non verificati

### Esito test tecnico

npm run verify:affidabilita-v1:source: FALLITO (exit 1) — [verify:affidabilita-v1] FAIL   - [affidabilita V1] data-sources/affidabilita-v1/attualita/attualita.json.ambiti.contenuti/analisi/Storm-Shadow-Ucraina-la-fabbrica-entra-nella-profondita.md[0].id: "A2-E001" non è un ID canonico
Eleventy: FALLITO (exit 1) — [11ty] Eleventy Fatal Error (CLI): [11ty] 1. Error in your Eleventy config file '.eleventy.js'. (via EleventyConfigError) [11ty] 2. [affidabilita V1] data-sources/affidabilita-v1/attualita/attualita.json.ambiti.contenuti/analisi/Storm-Shadow-Ucraina-la-fabbrica-entra-nella-profondita.md[0].id: "A2-E001" non è un ID canonico

La verifica dati/runtime fallisce perché l’implementazione V1 preesistente in `src/_lib/affidabilita-v1.js` definisce `ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, che rifiuta gli ID maiuscoli immutabili del Registro (per esempio `F0-E001`). Il resolver non è stato modificato, come prescritto dal prompt. Di conseguenza la migrazione strutturale è completa, ma la risoluzione runtime/build resta tecnicamente non eseguibile finché non viene risolta questa contraddizione fuori dalla Tranche B.

## Eccezioni deliberate

- `F1-E010` — ambito semantico definitivo applicato; marker riposizionato dopo l’intera proposizione causale senza riscrivere il testo.
- `F5-E010` — formulazione sostitutiva applicata esattamente.
- `S3-E017` — formulazione sostitutiva applicata esattamente.

## Contraddizioni isolate

- Registro definitivo: ID epistemici maiuscoli e immutabili.
- Resolver V1: regex degli ID limitata a caratteri minuscoli.
- Azione eseguita: sidecar e marker mantengono gli ID maiuscoli del Registro; l’infrastruttura V1 è rimasta invariata.

## Nota sul sidecar di prova preesistente

Il precedente `data-sources/affidabilita-v1/bombardamento-strategico.json` è stato sostituito dal sidecar di gruppo `data-sources/affidabilita-v1/strategia/strategia.json`, evitando duplicazioni e mantenendo i dati conformi al Registro definitivo.
