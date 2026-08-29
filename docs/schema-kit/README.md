# Schema Kit Frontiera v1

## Scopo

Schema Kit e la base operativa per sviluppare schemi editoriali autonomi senza
ricominciare ogni volta da telaio, accessibilita, ciclo di vita e primitive di
animazione. Non e un generatore di diagrammi e non stabilisce una forma grafica
obbligatoria.

La regola fondamentale e:

> standardizzare il telaio e il motore per lasciare piu spazio al carattere
> concettuale dello schema.

S1 Starlink e S2 Palantir restano invariati e costituiscono i riferimenti
storici. Il kit viene adottato dai nuovi schemi; un'eventuale migrazione dei
precedenti avverra solo se porta un vantaggio concreto e dopo confronto visivo.

## Componenti

### Telaio Nunjucks

`src/_includes/partials/schema-kit.njk` offre macro componibili:

- `schemaFrame`: figura, testata, watermark, navigazione interna e live region;
- `schemaStage`: area grafica priva di aspect ratio imposto;
- `schemaConsole`: relazione fra lettura e controlli;
- `schemaReading`: pannello interpretativo;
- `schemaControls`: contenitore accessibile, senza imporre il tipo di comando;
- `schemaCaption`: metodo, limiti e fonti.

Ogni macro accetta `className`: lo schema puo estendere o sostituire localmente
la resa senza duplicare il contratto comune.

### Stili

`src/css/schema-kit.css` contiene solo primitive di superficie, tipografia,
console, pulsanti, accessibilita e responsive. Non contiene coordinate, layout
interni dell'SVG, palette semantiche del soggetto o durate.

Le custom property `--schema-*` permettono varianti locali senza modificare il
kit.

### Runtime JavaScript

`src/js/schema-kit.js` espone `window.FrontieraSchemaKit` e fornisce:

- contesti cancellabili per timer e animazioni;
- `wait`, `animate`, `fade`, `drawPath` e `pulse`;
- pulizia dei layer e gestione dell'opacita;
- osservazione congiunta di viewport e visibilita della pagina;
- sequenze con stato iniziale `off` escluso dal ciclo;
- autoplay opzionale e indipendente dalla forma dei controlli.

Il runtime non inizializza automaticamente alcuno schema. Ogni componente
mantiene il proprio file JS e decide quali primitive usare.

## Flusso di produzione

1. Compilare il contratto concettuale in `CONTRATTO.md`.
2. Disegnare la geometria e validare il significato dello schema statico.
3. Costruire il componente con le macro del telaio.
4. Implementare stati e regia in un file JS specifico usando il runtime.
5. Aggiungere soltanto il CSS specifico della geometria e della semantica.
6. Eseguire `npm run verify:schemi` e `npm run build`.
7. Completare la matrice visuale e interattiva della checklist.

## Confine dell'astrazione

Devono restare specifici:

- tesi e metafora visuale;
- disposizione, coordinate e percorsi;
- illustrazioni e asset;
- numero e significato degli stati;
- direzione, velocita e ritmo delle animazioni;
- testo della lettura e nota metodologica.

Una deviazione dal telaio e ammessa quando migliora la comprensione. Va
documentata nel componente specifico; non va aggirata introducendo eccezioni
nascoste nel kit comune.

## Versionamento

Il kit usa una propria versione semantica. Questa prima edizione e `1.0.0`.

- patch: correzione senza modifica del contratto;
- minor: nuova primitiva opt-in;
- major: modifica incompatibile di macro o runtime.
