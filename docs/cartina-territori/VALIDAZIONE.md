# Esito di build e validazione

Esecuzione cartografica: 20 luglio 2026. Revisione del confronto percentuale:
25 agosto 2026.

## Pipeline

| Comando | Esito |
|---|---|
| `npm run verify:cartina` | **OK** — proiezione, viewBox, hotspot e coordinate |
| `npm run verify:territori` | **OK** — 6 istantanee su 6 |
| pipeline equivalente a `npm run build` | **OK** — 25 output generati e 79 file copiati |

Il build è stato eseguito dopo l'import definitivo delle quattro
digitalizzazioni e dopo l'attivazione dei blocchi `territori` nel front matter.

## Risultati territoriali

| Dataset | Esito | Vertici | Controllo russo | Conteso | Controllo ucraino in Russia |
|---|---|---:|---:|---:|---:|
| F0 — 24-03-2022 | OK | 9.030 | 150.040,48 km² | — | — |
| F1 — 13-11-2022 | OK | 7.121 | 108.326,41 km² | 819,55 km² | — |
| F2 — 30-09-2023 | OK | 7.927 | 108.108,76 km² | 297,21 km² | — |
| F3 — 14-08-2024 | OK | 3.294 | 109.335,44 km² | — | 467,78 km² |
| F4 — 13-03-2025 | OK | 9.965 | 112.066,72 km² | 776,97 km² | 150,26 km² |
| F5 — 15-07-2026 | OK | 10.739 | 116.609,43 km² | 1.737,68 km² | 11,19 km² |

I controlli bloccanti comprendono tipo e dominio WGS84, chiusura e
orientamento degli anelli, degenerazioni, autointersezioni, sovrapposizioni fra
categorie, date, fonti, proiezione nel `viewBox` e coerenza front matter/master.

## Confronto per oblast

Il dettaglio completo è in `report-percentuali.md`. Le aree controllate sono
calcolate intersecando i master con i confini ADM1; il denominatore usa invece
le superfici amministrative terrestri ufficiali. Questa separazione evita che
le estensioni marittime incorporate dal dataset geoBoundaries in diversi
oblast costieri abbassino artificialmente le percentuali.

Con il denominatore corretto, F1/F2 risultano coerenti con i riferimenti
editoriali. La tolleranza ordinaria è ±2 punti percentuali. Per Kherson è
esplicitamente ±5 punti: la stima editoriale ≈72% è corroborata da una misura
pubblica di 20.500 km², mentre il master Frontiera applica il criterio più
conservativo del controllo continuo e separa le aree contese.

Nelle didascalie pubbliche di F1/F2 prevalgono pertanto i valori editoriali già
presenti nel front matter. Le misure geometriche restano nel report come
controllo indipendente; non sostituiscono automaticamente il testo approvato.

F0 non pubblica percentuali territoriali. I precedenti riferimenti presenti
soltanto nel validatore erano orfani e sono stati rimossi dal confronto; la sua
geometria continua a essere sottoposta a tutti i controlli topologici e
cartografici bloccanti.

F4/F5 non avevano riferimenti editoriali percentuali: il report registra le
misure geometriche senza attribuire una falsa precisione di confronto.

## Rendering verificato

Gli otto render sono in `docs/cartina-territori/screenshots/`:

- quattro versioni desktop, 1200 × 806;
- quattro versioni mobile ad alta densità, 720 × 484 (360 × 242 CSS px a 2×);
- confronto 2×2 `confronto-quattro-fasi.png`;
- riepilogo macchina `controllo-visivo.json`.

Controlli sull'HTML finale e sullo SVG generato:

- F1/F2: due feature russe e una contesa;
- F4/F5: due feature russe, una contesa e una ucraina in Russia;
- nessuna path o legenda `linea di contatto` nelle quattro fasi;
- pattern, base e hotspot restano nel medesimo SVG;
- nessun overflow geometrico nel `viewBox` e nessuna dipendenza cartografica
  lato client.

Il browser remoto dell'ambiente non può aprire la build locale; i controlli
visuali sono stati quindi eseguiti rasterizzando direttamente lo SVG finale
prodotto da Eleventy alle due larghezze. Non è stato introdotto alcun renderer
alternativo nella build.

## Integrità dell'ambito protetto

Il confronto SHA-256 conferma che non sono cambiati:

- `.eleventy.js`;
- `src/_includes/partials/cartina-fase.njk`;
- `src/css/frontiera.css`;
- master F0 e F3.

Non è stato necessario modificare `cartinaLuoghi.json`: tutti gli hotspot
canonici erano già presenti e le loro coordinate sono rimaste invariate.
In `cartinaLinee.json` sono state eliminate esclusivamente le quattro linee
fallback e la fixture `fase-4-test-locale`; le voci F0/F3 sono rimaste
inalterate.

La revisione del 25 agosto modifica soltanto la funzione di riepilogo in
`src/_lib/cartina.js`: quando il report certifica l'esistenza di riferimenti
editoriali, restituisce il testo approvato della scheda; negli altri casi
continua a generare il riepilogo dalla geometria.
