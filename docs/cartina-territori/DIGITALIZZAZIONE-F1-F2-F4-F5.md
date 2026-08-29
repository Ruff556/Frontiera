# Fasi 1, 2, 4 e 5 — digitalizzazione territoriale completata

Aggiornato: 20 luglio 2026.

## Esito

Le quattro istantanee mancanti sono state prodotte e integrate. I master sono:

- `controllo-fase-1-2022-11-13.geojson`;
- `controllo-fase-2-2023-09-30.geojson`;
- `controllo-fase-4-2025-03-13.geojson`;
- `controllo-fase-5-2026-07-15.geojson`.

Le digitalizzazioni d'ingresso, complete di metadati e fonti, sono in
`data-sources/cartina-territori/digitalizzazioni/`. Tutte sono state importate
con `scripts/importa-territori.mjs`; nessun master è stato scritto a mano.

Il validatore chiude con `OK: 6 istantanee validate su 6 previste`. I fallback
`lineaContatto` di F1, F2, F4 e F5 sono stati rimossi dal front matter dopo
importazione, verifica topologica e controllo del render. Motore, proiezione,
CSS, renderer, hotspot, `cartinaLuoghi.json` e master F0/F3 sono rimasti
inalterati; i relativi hash sono stati ricontrollati.

## Revisioni cartografiche primarie

| Fase | Data | Revisione DeepStateMap | Timestamp UTC | Controllo coevo |
|---|---|---:|---|---|
| 1 | 2022-11-13 | `1668381004` | 2022-11-13 23:10:04 | ISW, assessment del 13 novembre 2022 |
| 2 | 2023-09-30 | `1696066231` | 2023-09-30 09:30:31 | ISW, carta nazionale del 30 settembre 2023 |
| 4 | 2025-03-13 | `1741873398` | 2025-03-13 13:43:18 | ISW/CTP, assessment e carta Kursk del 13 marzo 2025 |
| 5 | 2026-07-15 | `1784114834` | 2026-07-15 11:27:14 | ISW, carta nazionale del 15 luglio 2026 |

Indice revisioni: <https://deepstatemap.live/api/history/public>. Ogni master
riporta anche l'URL della revisione GeoJSON esatta, la verifica ISW/CTP e VIINA
2.0 come controllo indipendente giornaliero presso i centri abitati.

## Regole di classificazione applicate

1. `pre-2022`: riuso identico del perimetro pre-2022 già approvato in F3;
2. `post-2022`: poligoni DeepState `Occupied`, `CADR and CALR` e `Occupied
   Crimea`, con sottrazione del perimetro pre-2022 durante l'import;
3. `conteso`: soltanto i poligoni DeepState `Unknown status`, separati dalle
   aree attribuite a un controllo consolidato;
4. `ucraino-in-russia`: parte dei poligoni blu esterna al confine ucraino, al
   netto delle aree russe riconquistate e dello stato ignoto.

I poligoni verdi o azzurri di liberazione all'interno dell'Ucraina non sono
stati trasformati in una categoria territoriale: la cartina rappresenta il
controllo russo, il controllo ucraino in Russia e l'effettiva zona grigia. Raid,
infiltrazioni, ricognizioni, direttrici d'avanzata e massime rivendicate sono
esclusi.

## Normalizzazione topologica

Le revisioni storiche contengono segmenti quasi coincidenti lungo il Donbas
pre/post-2022. La prima importazione li ha correttamente bloccati. Le sole
digitalizzazioni d'ingresso sono state quindi normalizzate con:

- snap a `0,000005°`;
- dissoluzione per categoria;
- semplificazione Douglas–Peucker a 50 m per controllo/conteso e 20 m per le
  piccole aree ucraine in Russia;
- eliminazione di isole inferiori rispettivamente a 0,01, 0,005 e 0,001 km²;
- fascia tecnica di 25 m fra origine pre-2022 e post-2022, inferiore
  all'incertezza delle fonti e invisibile alla scala del renderer.

La normalizzazione è dichiarata in `metadata.normalizzazioneGeometrica` di
ogni digitalizzazione. I master esportati conservano la precisione completa
prodotta dalle operazioni booleane dell'importatore.

## Note per fase

### Fase 1 — 13 novembre 2022

La revisione cade alle 23:10 UTC, dopo il ritiro russo dalla riva destra del
Dnipro. Kherson città e la riva destra non sono classificate come controllo
russo; il saliente di Kharkiv perduto a settembre non viene mantenuto. La zona
grigia resta distinta lungo il fronte orientale.

### Fase 2 — 30 settembre 2023

La revisione delle 09:30 UTC aggiorna esplicitamente il fronte a ovest di
Verbove. Robotyne e il saliente della controffensiva sono trattati come
controllo consolidato, non come massima penetrazione; presso Bakhmut e
Robotyne–Verbove le fasce incerte rimangono `conteso`.

### Fase 4 — 13 marzo 2025

Sudzha è già persa. Il controllo ucraino in Russia è limitato ai due lembi blu
ancora non coperti da riconquista russa o stato ignoto: 150,26 km² complessivi.
La stima è volutamente conservativa nella fase di rapido ripiegamento.

### Fase 5 — 15 luglio 2026

È un'istantanea di fase aperta. Il residuo consolidato ucraino in Russia misura
11,19 km²; il controllo indipendente pubblicato per il 14 luglio indica circa
4 miglia quadrate, ordine di grandezza coerente. Le numerose aree di stato
ignoto lungo il fronte spiegano l'estensione maggiore della categoria
`conteso`; non sono state convertite in controllo russo.

## Import riproducibile

```bash
npm run import:territori -- --fase 1 --input data-sources/cartina-territori/digitalizzazioni/fase-1-2022-11-13-digitalizzazione.geojson
npm run import:territori -- --fase 2 --input data-sources/cartina-territori/digitalizzazioni/fase-2-2023-09-30-digitalizzazione.geojson
npm run import:territori -- --fase 4 --input data-sources/cartina-territori/digitalizzazioni/fase-4-2025-03-13-digitalizzazione.geojson
npm run import:territori -- --fase 5 --input data-sources/cartina-territori/digitalizzazioni/fase-5-2026-07-15-digitalizzazione.geojson
npm run verify:cartina
npm run verify:territori
npm run build
```

## Blocco front matter attivo

Per ciascuna fase è attivo esclusivamente:

```yaml
cartina:
  dataRiferimento: "…"
  datiTerritoriali: "…"
  territori:
    dataset: controllo-fase-N-YYYY-MM-DD
    data: "YYYY-MM-DD"
  hotspot:
    # elenco canonico della fase, non modificato
```

Non resta alcun blocco `lineaContatto` nelle quattro fasi.

## Output di verifica

- report per oblast: `docs/cartina-territori/report-percentuali.md`;
- riepilogo macchina: `reports/territori-report.json`;
- screenshot desktop/mobile: `docs/cartina-territori/screenshots/`;
- controllo dei render: `docs/cartina-territori/screenshots/controllo-visivo.json`.
