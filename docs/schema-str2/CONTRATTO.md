# STR2 — Il saliente e le sue linee

## Nucleo e integrazione

La mantenibilità di una posizione dipende dalla rete che la alimenta. L'interdizione ne riduce la ridondanza, poi il sostegno residuo; la perdita del saliente apre lo spazio all'avanzata Blue. Le nuove posizioni Blue devono a loro volta essere mantenute.

Il campo conserva due basi, tre posizioni Blue, tre nodi Red e un saliente. Le posizioni Blue superiore e inferiore sono più avanzate della centrale. La neutralizzazione riguarda la funzione di sostegno al saliente: nodi e collegamenti retrostanti Red restano presenti e costituiscono la nuova linea nel finale. Percentuali, soglia e tempi sono illustrativi, non misure storiche di Lyman; la SSA non è una media aritmetica delle efficienze.

Inserimento nell'articolo `lyman-contesa-posizioni-sostegno`, subito dopo la frase «Se il primo ciclo corre abbastanza più rapidamente del secondo in un punto determinato, il rapporto di posizione può cambiare senza che la difesa scompaia».

## Stati e regia

| Stato | Nodi superiore / centrale / inferiore | SSA | Saliente |
| --- | --- | --- | --- |
| OFF | 100 / 100 / 100 | 100 | Opaco, nessun attacco |
| Stato 1 | 100 / 100 / 100 | 85 | Opaco, pressione diretta |
| Stato 2, momento 1 | 100 / 100 / 100 | 85 | Opaco, pressione combinata |
| Stato 2, momento 2 | 0 / 70 / 70 | 72 | Opaco, ridondanza ridotta |
| Stato 2, momento 3 | 0 / 70 / 0 | 45 | Opaco, difficilmente mantenibile |
| Stato 2, momento 4 | 0 / 30 / 0 | 18 | Crollo del sostegno → trasparenza → avanzata Blue |

Tre selettori di stato e quattro pulsanti di momento, più Indietro, Avanza e Rivedi nel finale. I momenti selezionati direttamente ricostruiscono lo stato necessario; il momento 4 riparte sempre dalla condizione del momento 3. Non esiste un quinto momento. Ogni comando sostituisce l'intera regia pendente e parte dai valori visivi correnti, senza salti nelle barre.

Un solo ciclo requestAnimationFrame interpola valori, opacità e coordinate. Ogni impulso compie una sola traversata, senza animazioni perpetue. Uscita dal viewport e pagina nascosta sospendono il tempo della sequenza; il rientro riprende dal punto raggiunto, senza saltare la causalità. Con movimento ridotto sono mostrati quadri statici ordinati dentro il momento 4, con una breve permanenza per la lettura. Nessun timeout concorrente.

## Struttura e responsive

Telaio Nunjucks e lifecycle dello Schema Kit, SVG unico con ID derivati dall'istanza, geometria locale ricomposta sulla larghezza effettiva mediante ResizeObserver. Le etichette SVG mantengono la dimensione in pixel; su schermi stretti il campo acquista altezza e i pannelli si dispongono verticalmente. Legenda sempre visibile, aree di controllo di almeno 44 px, focus visibile, pulsanti nativi con aria-pressed, descrizione SVG e live region aggiornata ai cambiamenti semantici. Il campo OFF e la nota metodologica restano leggibili senza JavaScript.

## Collaudo previsto

Tutti gli stati in avanti e indietro, selezione diretta, ripetizione di almeno tre cicli, interruzione di ciascuna fase del momento 4, valori intermedi delle barre e ordine causale campionato nel browser. Verifica a 1440, 768, 500, 390 e 308 px, tastiera, movimento ridotto, ridimensionamento durante l'animazione, uscita/rientro dal viewport, cambio visibilità, assenza di errori console e regressioni tramite build e suite browser del sito.

## Deroghe motivate

Non si usa createSequence: OFF è una scelta esplicita sempre disponibile e la navigazione termina al momento 4. Non è previsto Auto: la breve coreografia interna al momento 4 si esegue su comando; gli altri passaggi restano guidati dal lettore. Il runtime comune e STR1 non vengono modificati.
