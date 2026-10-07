---
layout: layouts/analisi.njk
permalink: /demo/immagini-inline/
eleventyExcludeFromCollections: true
noindex: true
titolo: Immagini nel corpo del testo
sommario: Pagina di prova tecnica. Fotografie già presenti nel progetto, testi dimostrativi e nessun nuovo contenuto editoriale.
sezione: Strategia
data: 2026-10-07
infobox:
  tipo: 1
  titolo: Prova di impaginazione
  voci:
    - etichetta: Figure e testo
      testo: Tre misure, due lati e proporzioni originali. Ridimensiona la finestra per verificare la disposizione verticale e il flusso del testo.
immagini_inline:
  esempio:
    file: /immagini/strategia/str1-bombardamento-strategico.webp
    alt: Bombardiere in volo, fotografia già utilizzata nell’articolo sul bombardamento strategico.
    didascalia: Fotografia di prova ripresa dal patrimonio immagini del sito.
    credito: U.S. Air Force / Staff Sgt. Lauren Diaz
    licenza: Pubblico dominio — U.S. Government work
    fit: contain
  lunga:
    file: "/immagini/strategia/str1-bombardamento-strategico.webp" # percorso YAML quotato
    alt: Bombardiere in volo.
    didascalia: Questa didascalia volutamente estesa verifica che la cella segua la larghezza della figura e che il testo dell’articolo scorra accanto all’intero blocco, inclusi descrizione, credito e licenza. La fotografia conserva le proporzioni originali anche quando cambia lo spazio disponibile.
    credito: U.S. Air Force / Staff Sgt. Lauren Diaz
    licenza: Pubblico dominio — U.S. Government work
  minima:
    file: /immagini/strategia/str1-sam-blue.png
    alt: ""
---

## Figura piena — 4/4

{% figura immagini_inline.esempio %}

Questa figura occupa la larghezza editoriale disponibile agli schemi. Il testo riprende sotto la didascalia: **grassetti**, *corsivi* e [collegamenti](/progetto/) restano normale Markdown.

## Metà colonna — sinistra

{% figura immagini_inline.esempio, "2/4", "left" %}

Il primo paragrafo si dispone accanto alla fotografia. Questo è testo dimostrativo, separato dagli articoli del sito: serve a osservare il flusso delle righe e la distanza tra la figura e la lettura. La didascalia appartiene alla figura e occupa lo stesso spazio laterale.

Il secondo paragrafo prosegue nel flusso ordinario. Quando il testo supera il bordo inferiore della figura, ritorna spontaneamente alla larghezza completa della colonna, senza un contenitore aggiuntivo e senza interrompere la continuità della lettura. Le righe seguenti permettono di verificare questo passaggio in modo visibile.

Un ultimo paragrafo conclude il caso di prova e usa tutta la larghezza che torna disponibile. Il bordo della pagina e la posizione dei contenuti successivi rimangono indipendenti dall’altezza della fotografia.

## Metà colonna — destra e didascalia lunga

{% figura immagini_inline.lunga, "2/4", "right" %}

La fotografia è ora sul lato destro. Quando il testo è affiancato, anche la didascalia e le informazioni sui diritti allineano il proprio testo a destra. Su mobile la figura torna a blocco e la didascalia si allinea a sinistra. Questo paragrafo mantiene il gutter necessario alla lettura.

La descrizione estesa aumenta l’altezza complessiva della figura. Il wrapping deve quindi continuare anche mentre il testo passa accanto alla didascalia, fino al bordo inferiore della cella. Su uno schermo stretto l’immagine e la descrizione precedono invece il testo nell’ordine naturale del documento.

Il terzo paragrafo offre altre righe per osservare il comportamento del flusso. Non esiste una seconda colonna di contenuto: sono normali paragrafi Markdown, liberi di tornare a piena larghezza appena lo spazio occupato dalla figura è terminato.

### Un titolo dopo la figura

Questo titolo e il suo paragrafo iniziano sempre sotto la figura precedente, anche quando la didascalia è più alta del testo affiancato.

## Tre quarti — sinistra

{% figura immagini_inline.esempio, "3/4", "left" %}

La misura tre quarti usa il sessantasei per cento della colonna. Il nome è una convenzione editoriale: lo spazio residuo deve permettere una lettura sensata. Se la colonna si restringe, questa variante passa prima alla disposizione verticale.

Questo secondo paragrafo permette di seguire il ritorno delle righe a piena larghezza dopo il bordo inferiore della figura. La fotografia non viene ritagliata e la descrizione mantiene una gerarchia distinta dalle informazioni sui diritti.

## Tre quarti — destra e interruzione esplicita

{% figura immagini_inline.esempio, "3/4", "right" %}

Un breve testo scorre a sinistra della fotografia.

{% clearFigura %}

Questo paragrafo è obbligatoriamente sotto la figura grazie a **clearFigura**.

## Figura senza didascalia né diritti

{% figura immagini_inline.minima, "2/4" %}

L’immagine qui è dichiarata decorativa con alt vuoto esplicito. Non compare una cella vuota e non vengono aggiunti separatori.

{% clearFigura %}

## Figure consecutive e blocchi complessi

{% figura immagini_inline.esempio, "2/4", "left" %}

{% figura immagini_inline.esempio, "2/4", "right" %}

Le figure consecutive si dispongono una sotto l’altra. Non stringono il testo tra due float opposti.

| Controllo | Risultato atteso |
| --- | --- |
| Tabella | Parte sotto le figure |
| Mobile | Nessuno scorrimento orizzontale |

{% figura immagini_inline.minima, "2/4", "left" %}

<figure class="schema-kit"><figcaption class="schema-kit__caption">Telaio dello schema: la larghezza coincide con quella della figura piena e il blocco inizia sotto il float.</figcaption></figure>

## Fine del corpo dimostrativo

{% figura immagini_inline.esempio, "2/4", "right" %}

Anche quando il testo finale è breve, la figura resta contenuta nel corpo: nessuna sovrapposizione con il fondo del foglio o il footer.
