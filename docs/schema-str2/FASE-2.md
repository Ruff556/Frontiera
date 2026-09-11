# STR2 — Rifiniture finali, fase 2

Revisione conservativa della baseline `0a1868e18a9f45c8979272e3512a0dc485ea1d81`, sul checkout e sul branch esistenti `audit/str2-lyman-ci`. Il riferimento precedente `c29968f` resta nella stessa storia.

## Quattro interventi

1. **Due selettori attivi.** Rimossi il pulsante OFF e la relativa cella. L'apertura conserva rete integra, nodi 100/100/100, SSA 100%, saliente opaco, assenza di attacchi e lettura iniziale invariata. Nessuno dei due pulsanti risulta premuto prima dell'attivazione. Indietro dallo Stato 1 conserva il ritorno all'assetto iniziale.
2. **Indicazioni nel campo iniziale.** Eliminati il blocco della legenda e tutti i suoi stili. Il campo OFF identifica tre posizioni Blue, tre nodi logistici e le linee nodo → saliente. Le indicazioni usano la stessa interpolazione dei vettori: all'ingresso negli stati attivi si dissolvono nei medesimi 950 ms, senza timer aggiuntivi. Rimangono assenti anche nel finale privo di attacchi. Per i campi stretti si adattano esclusivamente le nuove etichette; nessun simbolo è spostato. Il testo è di 11 px, con la sola etichetta Blue centrale a 10 px nei campi inferiori a 300 px.
3. **Rivedi riparte dal Momento 1.** Il comando finale richiama la selezione esistente dello Stato 2 / Momento 1, ripristina la relativa selezione e torna a chiamarsi Avanza. Il ritorno interpola i valori correnti con la stessa regia cancellabile, anche se interrotto da altri comandi.
4. **Definizione SSA permanente.** Il sottotitolo del pannello contiene sempre «Soglia Sufficienza Approvvigionamenti (SSA)». Titolo, percentuali, soglia del 60% e barre restano invariati.

## Collaudo

`npm run verify:all` completato con successo: build e **80 test browser superati**, inclusi i 16 test STR2. Esecuzione finale senza retry, con Chromium tramite Playwright; suite browser completata in 3,9 minuti.

Una precedente esecuzione ha rilevato un timeout intermittente nel test preesistente dell'infobox mobile (`technical-recon.spec.js:87`, Control+Home sulla pagina `/fasi/manovra-fallita/`, che non carica STR2). La prova isolata è passata due volte su tre; l'intera suite successiva è passata senza modificare quel test o il componente. Il log dell'esecuzione con timeout è conservato in `reports/str2-phase2/verify-all-infobox-timeout.log`.

I 14 test STR2 precedenti sono conservati e adattati alle aspettative intenzionalmente cambiate; due nuovi test campionano la dissolvenza iniziale con animazione reale, entrando rispettivamente nello Stato 1 e nello Stato 2. Le verifiche comprendono:

- due pulsanti e nessun controllo OFF nell'interfaccia o nell'albero di accessibilità;
- lettura iniziale esatta, etichette SVG presenti e legenda assente dal DOM;
- nessun vettore visibile all'apertura; opacità complementari di etichette e vettori durante l'attivazione;
- tre cicli consecutivi 1 → 2 → 3 → 4 → Rivedi → 1, più i tre cicli avanti/indietro precedenti, a ciascuna delle cinque larghezze: **225 passaggi** nella matrice completa;
- ripristino delle coordinate, dei valori, del saliente e della selezione dopo Rivedi; interpolazione continua anche durante il ritorno;
- collisioni delle etichette con altri testi, simboli e linee, dimensioni dei controlli, testo tagliato e overflow;
- annullamento durante ciascuna fase del Momento 4, input rapidi anche durante Rivedi, selezione diretta e ridimensionamento;
- sospensione fuori dal viewport e durante la visibilità nascosta del documento; quest'ultima è simulata tramite evento;
- movimento ridotto, tastiera, frecce/Home/End, focus, live region, descrizione SVG e assetto iniziale senza JavaScript;
- definizione SSA presente in ogni stato e assenza di errori console nei cicli e nelle verifiche del sito.

Il controllo supplementare delle etichette è passato anche a 320, 340, 360, 380, 400, 420, 440, 460, 480, 520, 580 e 620 px, oltre alle cinque larghezze richieste.

## Confronto con la baseline

Acquisite e ispezionate le configurazioni iniziale, Momento 1, Momento 3 e finale del Momento 4 a 1440, 768, 500, 390 e 308 px. I tracciati, le trasformazioni, le opacità delle scene stabilizzate e le dimensioni del campo coincidono con la baseline in tutti i 20 confronti. Il confronto del codice conferma l'identità di stati e valori preesistenti, geometria, traiettorie, impulsi, tempi, interpolazione, coda cancellabile e testi analitici.

| Larghezza viewport | Riduzione dell'altezza dello schema |
| --- | --- |
| 1440 px | 119,7 px |
| 768 px | 119,7 px |
| 500 px | 167,7 px |
| 390 px | 186,7 px |
| 308 px | 240,9 px |

Evidenze conservate nel repository:

- [Apertura desktop](screenshots/fase2-1440-iniziale.png)
- [Apertura mobile](screenshots/fase2-390-iniziale.png)
- [Apertura nella finestra da 308 px](screenshots/fase2-308-iniziale.png)
- [Finale e comando Rivedi](screenshots/fase2-1440-finale.png)

Le acquisizioni complete, i confronti e il log locale sono nella cartella ignorata `reports/str2-phase2/`. Le immagini della prima implementazione sono conservate separatamente.

## Perimetro e pubblicazione

Modificati soltanto il template, il CSS e il JavaScript STR2, i test dedicati e la documentazione STR2 con le relative schermate. Articolo, punto d'inserimento, STR1 e runtime comune dello Schema Kit invariati. Nessuna deviazione dalla specifica.

L'aggiornamento usa il normale commit e push su `audit/str2-lyman-ci`, nella [preview già esistente](https://audit-str2-lyman-ci.frontiera.pages.dev/analisi/lyman-contesa-posizioni-sostegno/#schema-str2-saliente). Nessun nuovo branch, nuova preview indipendente, merge, rebase o cherry-pick verso `main`.
