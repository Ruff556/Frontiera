# Contratto operativo per un nuovo schema

Questo documento va compilato prima dell'implementazione. Non prescrive la
forma: rende esplicite le decisioni che impediscono allo schema di diventare
decorazione o causalita implicita.

## 1. Nucleo concettuale

- **Tesi in una frase:** che cosa deve diventare visibile?
- **Invarianti:** quali elementi restano costanti nel confronto?
- **Variabili:** che cosa cambia realmente fra stati o momenti?
- **Confine causale:** che cosa lo schema non sostiene?
- **Unita di lettura:** confronto, sequenza, circuito, mappa, gerarchia o altro?

Se la tesi non puo essere espressa senza descrivere la UI, il concetto non e
ancora sufficientemente isolato.

## 2. Stati e interazione

- Elenco degli stati semanticamente necessari.
- Stato visibile al caricamento.
- Eventuale stato `off`: vale solo prima della prima interazione e non entra nel
  ciclo successivo.
- Azione di `Avanza`, `Auto`, `Play/Pausa`, tab o altri controlli.
- Comportamento quando lo schema esce dal viewport o la pagina viene nascosta.
- Elementi che persistono e elementi che vengono ricostruiti a ogni passaggio.

Uno stato non va aggiunto soltanto per comodita tecnica.

## 3. Regia delle animazioni

- Origine e destinazione di ogni impulso.
- Significato editoriale di direzione, velocita, simultaneita e pausa.
- Durate illustrative o fondate su misure: dichiarare la differenza.
- Punto esatto di fine ciclo prima della ripetizione.
- Regola di cancellazione durante cambio stato, uscita dal viewport e
  `visibilitychange`.
- Resa alternativa per `prefers-reduced-motion`.

Ogni impulso deve essere una traversata unitaria. La periodicita del tratteggio
non deve permettere a una seconda porzione dello stesso impulso di rientrare nel
percorso.

## 4. Contratto strutturale minimo

- ID univoco dell'istanza e ID SVG derivati dall'istanza.
- `<figure>` con titolo associato mediante `aria-labelledby`.
- `<title>` e `<desc>` per ogni SVG informativo.
- `data-section-navigation-stop` e label comprensibile.
- live region per cambiamenti avviati manualmente.
- controlli da tastiera con stato ARIA coerente.
- nota metodologica che chiarisca semplificazioni e limiti.
- nessun contenuto essenziale disponibile soltanto attraverso il colore o il
  movimento.

## 5. Responsivita

Definire prima dell'animazione:

- viewBox e strategia di ricomposizione;
- soglia oltre la quale il contenuto viene ricomposto, non soltanto ridotto;
- dimensione minima dei controlli: 44 px;
- misura minima leggibile per label e microtesti;
- comportamento di testata, watermark, console e didascalia.

Viewport minimi di verifica: 1440, 768, 500 e 390 px. Aggiungere 308 px quando
lo schema puo essere letto in finestre laterali strette.

## 6. Matrice di collaudo

Per ogni viewport verificare:

- stato al caricamento;
- tutti gli stati raggiungibili manualmente;
- almeno due cicli automatici completi;
- pausa e ripresa;
- uscita e rientro dal viewport;
- cambio scheda o minimizzazione della pagina;
- assenza di overflow e sovrapposizioni;
- focus, frecce, Invio e Spazio;
- resa con movimento ridotto;
- assenza di errori in console.

## 7. Deroghe

Indicare qui quali parti del kit non vengono usate e perche. Una deroga chiara
e preferibile a una generalizzazione che indebolisce il carattere dello schema.
