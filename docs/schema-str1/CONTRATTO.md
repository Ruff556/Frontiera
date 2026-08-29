# STR1 — Contratto operativo

## Nucleo concettuale

- **Tesi:** rende visibile quale componente Blue attraversa la difesa Red e dove Red concentra la minaccia.
- **Invarianti:** basi, SAM, cupole difensive, asse del terreno e label Blue/Red.
- **Variabili:** vettore che penetra, tracce pregresse, livello dei mirini e allerta Red.
- **Confine causale:** nessuna distanza, probabilità, scala, durata reale, esito d’attacco o riuscita dell’esfiltrazione.
- **Unità di lettura:** confronto di tre sequenze in tre momenti.

## Stati e interazione

Lo stato iniziale è `off` nella modalità Stand-off. `off` non appartiene al ciclo 1–2–3. Avanza e Auto avviano il momento 1; ogni comando manuale ferma Auto. Il cambio modalità cancella la regia e ripristina `off`. Le selezioni dirette ricostruiscono autonomamente le tracce pregresse.

Le tab usano roving `tabindex`, frecce, Invio e Spazio. Lettura, contatore, descrizione SVG e live region pubblicano lo stato semantico corrente.

## Regia e ciclo di vita

Ogni impulso e il relativo mirino condividono un carrier SVG. Un solo progresso normalizzato, calcolato con `getTotalLength()` e `getPointAtLength()`, aggiorna la posizione del carrier; le soglie di comparsa/scomparsa sono progressi geometrici memorizzati per rotta. I frame, i timer e i token vengono invalidati a ogni cambio di stato, uscita dal viewport o `visibilitychange`.

Le durate sono illustrative. Con movimento ridotto gli stati finali sono composti immediatamente e il triangolo resta statico.

## Struttura e responsive

Gli ID di titolo, descrizione, clip e percorsi derivano dall’ID dell’istanza. Il componente usa tutte le macro del kit, una live region e `data-section-navigation-stop`. I controlli non scendono sotto 44 px. A 760 px la console passa a una colonna; a 390 px le tab si ricompongono verticalmente.

## Deroghe

L’Auto usa una pianificazione locale cancellabile, invece di `createAutoplay`, perché attende il completamento effettivo di ogni coreografia e la pausa di lettura. Il runtime comune non viene modificato.
