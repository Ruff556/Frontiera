# STR2 — Rapporto di collaudo

## Esito

`npm run verify:all` completato con successo: build e **78 test browser superati**, inclusi 14 test dedicati a STR2. Collaudo effettuato con Chromium tramite Playwright. Gli asset CSS e JavaScript generati coincidono con i sorgenti verificati.

Lo schema è inserito nell'articolo subito dopo «Se il primo ciclo corre abbastanza più rapidamente del secondo in un punto determinato, il rapporto di posizione può cambiare senza che la difesa scompaia». Il testo dell'articolo è conservato; sono aggiunte soltanto l'importazione e la chiamata al componente. CSS e JavaScript STR2 vengono caricati esclusivamente nelle pagine che lo contengono.

## Verifica funzionale richiesta

- [x] Posizione Blue superiore più avanzata della centrale.
- [x] Posizione Blue inferiore più avanzata della centrale.
- [x] Saliente Red esposto sui fianchi; nessuna sovrapposizione tra base e posizione Blue centrale nelle finestre strette.
- [x] OFF privo di vettori offensivi; rete integra e SSA 100%.
- [x] Stato 1 diretto contro il saliente, nodi al 100% e SSA 85%.
- [x] Stato 2, Momento 1: pressione contro saliente e nodi, rete ancora attiva.
- [x] Momento 2: sostegno del nodo superiore neutralizzato, linea degradata, valori 0/70/70 e SSA 72%, sopra soglia.
- [x] Momento 3: sostegno inferiore neutralizzato, linea degradata, valori 0/70/0 e SSA 45%, sotto soglia.
- [x] Momento 3: saliente ancora completamente opaco e posizioni Blue ferme.
- [x] Momento 4: efficienza centrale in calo progressivo da 70% a 30%, SSA da 45% a 18%.
- [x] Momento 4: perdita progressiva di opacità del saliente solo dopo il calo del sostegno residuo.
- [x] Nodi Red retrostanti e collegamenti alla Base Red sempre visibili e attivi.
- [x] Avanzata Blue solo dopo che il saliente ha raggiunto l'opacità residua del 5%.
- [x] Avanzata interna al Momento 4, senza un quinto momento selezionabile.
- [x] Nuova linea Red riconoscibile e linee Blue allungate verso le posizioni raggiunte.
- [x] Lettura finale dedicata all'alimentazione, protezione e mantenimento delle nuove posizioni Blue.
- [x] Barre interpolate continuamente, con numeri sincronizzati. Il campionamento nel browser verifica numerosi valori intermedi, senza sostituzioni istantanee nella modalità animata.
- [x] Tutti gli stati reversibili; ritorno 4 → 3 ripristina saliente, coordinate, efficienze e SSA.
- [x] Interruzione verificata separatamente durante calo del sostegno, perdita del saliente e avanzata.
- [x] Selezione diretta del Momento 4, comandi rapidi e ridimensionamento durante la sequenza senza residui.
- [x] Tre cicli completi avanti/indietro a 1440, 768, 500, 390 e 308 px: 150 passaggi nella matrice finale, oltre alle prove con animazione reale.
- [x] Nessun overflow della pagina, nessuna etichetta dei pulsanti tagliata, controlli di almeno 44 × 44 px.
- [x] Tastiera: Tab, frecce, Home/End, Invio e Spazio; focus visibile, selezioni ARIA e live region coerenti.
- [x] Movimento ridotto: quadri statici ordinati nel Momento 4, senza perdere la precedenza della perdita del saliente rispetto all'avanzata.
- [x] Uscita/rientro dal viewport e visibilità della pagina sospendono/riprendono il progresso senza saltare fasi. La visibilità del documento è simulata nel test tramite il relativo evento.
- [x] Campo OFF e nota metodologica leggibili senza JavaScript.
- [x] Nessun errore console nei cicli verificati; suite di integrità dell'intero sito superata su desktop e mobile.
- [x] Legenda completa, percentuali dichiarate illustrative e distinzione esplicita fra sostenibilità sintetica e media dei nodi.
- [x] Confronto visivo con il concept STR2 e la registrazione STR1: telaio, font, colori, controlli e animazioni coerenti con Frontiera.

## Evidenze visive

Le schermate mostrano lo schema intero; l'altezza del viewport di acquisizione consente di includere legenda e nota metodologica. Le larghezze sono quelle indicate nei nomi.

- [Desktop, Momento 3](screenshots/str2-1440-momento-3.png)
- [Desktop, conclusione del Momento 4](screenshots/str2-1440-momento-4.png)
- [Mobile, conclusione del Momento 4](screenshots/str2-390-momento-4.png)
- [Finestra stretta, conclusione del Momento 4](screenshots/str2-308-momento-4.png)

## Continuità Git e preview

Lavoro eseguito nel checkout esistente `C:/Users/miche/Documents/GitHub/Frontiera - Preview/Preview`, sul branch `audit/str2-lyman-ci`, partendo da `c29968fb8799a64b9fd05cd7c8eeb17b37c94bb8`. Prima dell'implementazione il branch locale era pulito e coincideva con il remoto. Nessun nuovo branch, merge, rebase o cherry-pick verso `main`.

La preview di branch già associata al commit iniziale è [audit-str2-lyman-ci.frontiera.pages.dev](https://audit-str2-lyman-ci.frontiera.pages.dev/analisi/lyman-contesa-posizioni-sostegno/#schema-str2-saliente). L'aggiornamento usa il normale push sul medesimo branch, senza creare una nuova preview indipendente.

Gli output locali ereditati da compilazioni precedenti sono stati conservati fuori da `_site`, in `reports/str2-qa/pre-str2-generated-output`, e la build è stata ripetuta da un output pulito. Nessuna modifica ai contenuti storici è stata necessaria per superare i controlli.
