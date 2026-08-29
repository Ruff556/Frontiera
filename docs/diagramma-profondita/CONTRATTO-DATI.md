# Contratto dati del diagramma della profondità

Che cosa scrive l'autore nel front matter di una scheda P, e nient'altro.
Struttura e motore sono descritti in [`ARCHITETTURA.md`](ARCHITETTURA.md); i
messaggi d'errore in [`VALIDAZIONE.md`](VALIDAZIONE.md).

---

## 1. Pubblicare una nuova scheda P

Per pubblicare **P3** (o qualunque successiva) bastano tre gesti. Nessuna
modifica al template, al CSS, al motore o a `.eleventy.js`.

1. creare `contenuti/profondita/3-<slug>.md` con il front matter della famiglia P
   (`slug`, `idFase: p3`, `numero`, `numeroEtichetta`, `ordine`, `linea:
   profondita`, `datazione`, `titolo`, `titoloBreve`, `anteprima`, `dialettica`,
   `immagine`, …: vedi [`../filo-profondita-architettura.md`](../filo-profondita-architettura.md));
2. compilare il blocco `diagrammaProfondita` descritto qui sotto;
3. eseguire `npm run build`.

La card della timeline in home si collega da sola, la navigazione «Passaggio
precedente/successivo» si aggiorna da sola, il diagramma compare da solo nella
testata.

---

## 2. Il blocco

```yaml
diagrammaProfondita:
  versione: 1
  dataAssetto: "YYYY-MM-DD"

  profili:
    ucraina:
      complesso: "Sistemi e catena d'attacco dominante"
      accesso:
        contatto:
          stato: reiterabile
        prossima:
          stato: limitato
        intermedia:
          stato: episodico
        profonda:
          stato: non-accessibile
      nodi:
        - tipo: depositi
          fascia: prossima
          etichetta: "Etichetta editoriale facoltativa"
      limite: "Fattore dominante che interrompe o degrada l'accesso"

    russia:
      complesso: "Sistemi e catena d'attacco dominante"
      accesso:
        contatto:
          stato: reiterabile
        prossima:
          stato: reiterabile
        intermedia:
          stato: limitato
        profonda:
          stato: episodico
      nodi: []
      limite: "Fattore dominante che interrompe o degrada l'accesso"
```

### Campi

| Chiave | Obbligatoria | Note |
|---|---|---|
| `versione` | sì | intero; oggi è supportata la sola versione `1` |
| `dataAssetto` | sì | data ISO `YYYY-MM-DD`, reale; la resa italiana è derivata |
| `profili.ucraina` / `profili.russia` | sì, entrambi | nessun altro attore è ammesso |
| `complesso` | sì | sistemi e catena d'attacco dominante dell'attore nella fase |
| `accesso.<fascia>.stato` | sì, tutte e quattro | una delle quattro chiavi di stato; è l'**unica** chiave ammessa nella fascia |
| `nodi` | no (default `[]`) | array, anche vuoto |
| `nodi[].tipo` | sì | uno dei quattordici tipi della tassonomia |
| `nodi[].fascia` | sì | una delle quattro fasce, **accessibile** per quell'attore |
| `nodi[].etichetta` | no | precisa l'etichetta; in mancanza si usa quella del tipo |
| `limite` | sì | fattore dominante che interrompe o degrada l'accesso |

> **Chiavi ritirate.** `accesso.<fascia>.nota`, `mutamento` e `soglia` facevano
> parte del contratto iniziale e sono state **rimosse**: la fascia porta
> soltanto stato, nodi e vettore, e la lettura interpretativa della fase resta
> affidata al corpo editoriale della scheda. Non sono ignorate ma **rifiutate**:
> un front matter che le conservi fa fallire la build.

---

## 3. Le quattro fasce

Sono **spaziali**, lette dalla linea del contatto verso la profondità avversaria,
uguali per entrambe le corsie.

| Chiave | Etichetta | Distanza orientativa |
|---|---|---|
| `contatto` | Contatto | 0–30 km |
| `prossima` | Fascia prossima | 30–100 km |
| `intermedia` | Fascia intermedia | 100–300 km |
| `profonda` | Fascia profonda | oltre 300 km |

Le quattro colonne hanno **uguale larghezza semantica**, non proporzionale ai
chilometri: l'ultima fascia è aperta e una scala proporzionale produrrebbe una
falsa precisione. È un principio della rappresentazione, non un testo pubblico:
la nota metodologica resa dice una cosa sola, che il diagramma misura l'accesso
effettivo e non la gittata nominale.

Le fasce non si chiamano «tattica», «operativa» o «strategica»: quella natura
appartiene alle funzioni colpite e agli effetti prodotti, non alla distanza.

---

## 4. I quattro stati di accesso

| Chiave | Etichetta pubblica | Significato |
|---|---|---|
| `reiterabile` | Accesso reiterabile | pressione sostenibile o ripetibile come campagna |
| `limitato` | Accesso limitato o contestato | accesso reale ma degradato da difesa, disponibilità, targeting, autorizzazioni o reiterazione insufficiente |
| `episodico` | Accesso episodico | penetrazione dimostrata senza capacità di campagna |
| `non-accessibile` | Non accessibile nella fase | profondità non convertibile in effetto in modo militarmente significativo nella fase |

Lo stato appartiene alla **singola corsia**, non alla fascia in astratto: la
stessa fascia può essere reiterabile per un attore e non accessibile per l'altro.

Non esiste lo stato «protetto»: protezione e accessibilità non sono alternative.

### Profili non monotoni: ammessi e attesi

Nulla impone che l'accesso degradi con la distanza. Una profondità molto lontana
può essere raggiunta episodicamente anche quando la fascia intermedia non è
accessibile come campagna. È il caso della corsia ucraina di **P2**:

```yaml
intermedia:
  stato: non-accessibile
profonda:
  stato: episodico
```

Il vettore si interrompe davvero nella fascia intermedia e riparte come segmento
**autonomo** nella fascia profonda. La build non fallisce: fallirebbe, semmai,
una resa che fingesse continuità.

---

## 5. Tassonomia dei nodi funzionali

`depositi` · `comando` · `logistica` · `ferrovie` · `ponti` · `aeroporti` ·
`difesa-aerea` · `porti` · `flotta` · `energia` · `raffinazione` · `industria` ·
`trasporti` · `infrastrutture`

Ogni tipo ha un'etichetta italiana predefinita e un simbolo. Il front matter può
precisare l'etichetta («Base di Millerovo» invece di «Aeroporti»), ma **non
conosce** percorsi, classi o markup delle icone.

Regole editoriali applicate dalla build:

- si mostrano **soltanto** i nodi dichiarati: le fasce non si riempiono per
  simmetria e l'asimmetria fra le due corsie è legittima;
- massimo **quattro** nodi per attore: è il budget che impedisce al diagramma di
  diventare un inventario;
- massimo **quattro** nodi per singola fascia: una fase può quindi concentrare
  l'intero budget su un solo strato di profondità (assetto reale quando la
  campagna si addensa lì), senza che la densità complessiva della figura cresca;
- un nodo non può stare in una fascia dichiarata `non-accessibile` per quel
  medesimo attore;
- due nodi identici (stesso tipo, stessa fascia, stessa etichetta) sono un errore.

Il diagramma non è un inventario esaustivo: è la selezione delle funzioni che la
fase mette davvero in gioco.

---

## 6. Che cosa NON va nel front matter

Mai, in nessuna scheda:

- colori, classi CSS, stili inline;
- coordinate o posizioni in pixel;
- larghezza o lunghezza delle frecce;
- percorsi delle icone;
- testo della legenda;
- watermark;
- nota metodologica;
- descrizione accessibile compilata a mano;
- note discorsive di fascia, `mutamento`, `soglia` (chiavi ritirate);
- HTML.

Sono tutti **derivati**. Una chiave estranea a questi livelli — anche solo un
refuso come `profilo:` per `profili:` o `nodo:` per `nodi:` — fa fallire la build
con l'elenco delle chiavi ammesse.

Le schede P non usano più il blocco `cartina:`: dichiararlo è un errore di build.
