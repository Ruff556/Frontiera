---
permalink: false
eleventyExcludeFromCollections: true
---

# Espansione immagini F/P — validazione

Data: 26 agosto 2026

## Ambito implementato

Il lightbox viene inizializzato esclusivamente sulle cornici immagine valide dei
layout `scheda-fase.njk` e `scheda-profondita.njk`. Attualità, Strategia, Sistemi,
immagini nel corpo, mappe, diagrammi, card e segnaposto restano esclusi. Il
portale è unico e viene creato direttamente sotto `body` solo quando la pagina
contiene una cornice valida.

## Verifiche automatiche

- `npm run verify:image-lightbox`: superato;
- geometria `contain` con rapporto naturale e senza upscaling: superata;
- limiti di traslazione e ricentratura degli assi non eccedenti: superati;
- conservazione del fulcro durante pinch con punto medio mobile: superata;
- macchina a stati e chiamata aptica protetta: superate;
- hook presenti solo nei layout F/P e CSS/script selettivi nel layout globale:
  superati;
- `npm run build`: superato, incluse tutte le verifiche preesistenti;
- copia identica del modulo in `_site/js/image-lightbox.js`: verificata;
- miniatura responsive caricata all'ingresso e originale assente dalla rete fino
  all'apertura esplicita: verificato nel browser.

## Verifiche nel browser

Pagine controllate:

- F0 — `/fasi/manovra-fallita/`;
- P0 — `/profondita/asimmetria-iniziale-decisione-mancata/`;
- esclusioni — un articolo di Attualità e la scheda Starlink.

Viewport controllate:

- 1440 × 900;
- 1024 × 768;
- 768 × 1024;
- 430 × 932;
- 390 × 844.

Esiti:

- animazione FLIP campionata durante l'espansione dalla geometria 4:3 reale;
- file originale interamente visibile con rapporto naturale e `object-fit:contain`;
- didascalia, credito e licenza clonati dai nodi esistenti e corretti su F/P;
- chiusure con X, fondale ed Escape; nessuna chiusura da clic interno;
- scroll bloccato con `body` fisso e ripristinato al medesimo valore (429 px nel
  caso campione), senza overflow orizzontale;
- `main` inerte durante l'apertura, focus sulla X, focus trap e ritorno al trigger;
- doppio tap 1×→2×, pan limitato, secondo doppio tap 2×→1× con ricentratura;
- resize aperto 430→390 px con ricalcolo, reset centrato e nessun contenuto
  irraggiungibile;
- dialogo e target X sempre entro viewport; target X misurato 44 × 44 px;
- nessun portale né trigger nelle pagine Attualità e Sistemi controllate;
- nessun errore o avviso in console.

Il ramo `prefers-reduced-motion` e il fallback privo di `backdrop-filter` sono
stati verificati per contratto nel codice e nel CSS; l'ambiente di collaudo non
esponeva l'emulazione di queste preferenze.

## Verifiche fisiche ancora richieste

Un browser desktop non può attestare la sensazione aptica né riprodurre due
contatti capacitivi reali. La chiamata `navigator.vibrate(12)` è stata verificata
con un mock e viene emessa una sola volta per transizione utente valida su
puntatore `coarse` o dispositivo con contatti touch. Il calcolo multitouch è
coperto dai test del fulcro e dei limiti; fluidità del pinch e intensità della
vibrazione richiedono un controllo finale su telefono reale.

## Revisione Prompt 2

La revisione successiva ha consolidato i casi limite senza cambiare la resa
della miniatura chiusa:

- apertura e chiusura rapide cancellano in modo esplicito attese e animazioni,
  lasciando stato, `inert`, scroll e focus sempre ripristinati;
- il fallback senza Web Animations usa una vera transizione CSS con
  `transitionend` e timeout di sicurezza;
- il volo di ritorno inverte correttamente i raggi, da 4 px nella cella a 14 px
  nella miniatura;
- una chiusura con immagine ancora zoomata usa la dissolvenza breve, evitando il
  salto fra contenuto traslato e clone centrato;
- `pointercancel` non può più essere interpretato come tap e i gesti iniziano
  soltanto quando il dialogo è nello stato `open`;
- l'aptica considera sia `(pointer: coarse)` sia `navigator.maxTouchPoints`;
- una fascia didascalia realmente scrollabile riceve un tab stop e un focus
  visibile, mentre le didascalie normali non aggiungono passaggi di tastiera.

La build completa e il test dedicato sono stati rieseguiti con esito positivo.
Il browser ha inoltre verificato la chiusura durante l'apertura, le cinque
viewport previste, F0/P0, resize 430→390 px, chiusure interne/esterne, ripristino
del focus ed esclusione delle pagine di Attualità, senza errori in console.

## Revisione geometria mobile variabile

La revisione mobile successiva sostituisce la riga flessibile quasi fullscreen
con un'altezza ricavata da larghezza utile e rapporto naturale. L'altezza viene
limitata dallo spazio residuo dopo la misura reale della didascalia e dopo due
margini esterni da almeno `5dvh`; nei casi limitati la fotografia conserva il
rapporto con `object-fit: contain` e il tasto X si allinea al suo bordo visibile.

Durante lo zoom la cella non cambia geometria. Lo stato `is-zoomed` apre solo i
clipping mobile della catena dialogo/figura/stage, porta lo stage trasformabile
sopra didascalia e tasto, e rende quest'ultimo trasparente e non interattivo. Il
ritorno entro l'epsilon di `1×` azzera scala e traslazione prima di ripristinare
clipping e tasto. Il doppio tap ritorna a `1×` da 1.3×, 2.7× e 4× nei test
deterministici.

Misure browser campione:

- 390 × 844, T-72 verticale moderato: cella 577.84 px, immagine 441.59 px,
  margini esterni 133.08 px sopra e sotto;
- 390 × 844, raffineria orizzontale: cella 337.72 px, immagine 255.47 px,
  margini esterni 253.14 px sopra e sotto;
- 430 × 932, Sea Baby quadrata: cella 490.25 px, immagine 408 px, margini
  esterni 220.88 px sopra e sotto;
- 844 × 390: cella limitata a 352 px, margini esterni 19 px per lato verticale,
  stage a piena larghezza e X sovrapposta al rettangolo fotografico contenuto.

In tutti i casi misurati lo spazio fra stage e didascalia è 0 px, la X resta
44 × 44 px e l'overflow orizzontale è nullo. A 1440 × 900 il ramo desktop conserva
la geometria approvata (dialogo 1324.8 × 801 px) e non riceve custom property
mobile. Il browser di collaudo esponeva un puntatore fine: pinch reale, Pointer
Events touch e vibrazione restano simulati tramite test di geometria, fulcro,
limiti, soglie e aptica, non attestati su hardware fisico.
