# Revisione avvisi territoriali F0–F2

Data: 25 agosto 2026.

## Esito

I 14 avvisi originari sono risolti senza modificare i master territoriali.

- **F0:** rimossi dal confronto i riferimenti numerici che non avevano un
  corrispettivo editoriale nella scheda. Il riepilogo pubblico continua a
  derivare dalla geometria.
- **F1–F2:** mantenute le percentuali editoriali approvate e ripristinata la
  loro precedenza nelle didascalie pubbliche.
- **Controllo indipendente:** le aree occupate sono intersecate con i confini
  ADM1, mentre la percentuale usa come denominatore le superfici
  amministrative terrestri ufficiali. In questo modo le estensioni marittime
  dei confini costieri non producono falsi scarti.
- **Kherson:** la differenza residua fra stima editoriale e master conservativo
  è documentata con tolleranza ±5 punti percentuali; non è stata corretta
  deformando la geometria.

## Verifica finale

- `verify:territori`: 6 istantanee su 6, nessun `AVVISO`, `FALLITO` o
  `MANCANTE`;
- verifiche Schema Kit, infobox desktop/mobile, lightbox, cartina e diagramma
  della profondità: tutte concluse con codice 0;
- Eleventy 3.1.6: 25 output generati e 79 file copiati;
- HTML F1/F2: percentuali editoriali correttamente pubblicate.

Il dettaglio numerico resta in `report-percentuali.md`; fonti e distinzione fra
dato editoriale e controllo geometrico sono in `FONTI-E-METODO.md`.
