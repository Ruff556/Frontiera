---
# ---- IDENTITA' E ORDINAMENTO ----
titolo: "Asimmetria iniziale e decisione mancata"
slug: asimmetria-iniziale-decisione-mancata
idFase: p0
numero: 0
numeroEtichetta: "P0"
ordine: 0
linea: profondita

# ---- INFOBOX ----
infobox:
  tipo: 1
datazione: "24 febbraio – Fine giugno 2022"
luoghi: "Intero territorio ucraino; basi aeree e rete di difesa antiaerea; assi di Kyiv, Kharkiv, Kherson e Zaporižžja; profondità russa di confine; Mar Nero"
intentoRusso: "Disarticolare comando, aviazione e difesa aerea ucraini con una campagna nazionale di attacchi, così da impedire una mobilitazione coerente e preparare la decisione rapida terrestre."
intentoUcraino: "Sopravvivere nella propria profondità, preservando governo, comando, aviazione, difesa aerea, mobilitazione e collegamento con la coalizione esterna."
soluzione: "Attacchi russi multidominio contro una profondità ucraina dispersa, mobile e ricostituibile"

# ---- DATI PER LA LINEA DEL TEMPO ----
titoloBreve: "Decisione mancata"
anteprima: "Mosca apre la guerra con missili, aviazione e guerra elettronica contro difesa aerea, basi, comando e infrastrutture militari. Kyiv sottrae una parte decisiva del sistema mediante dispersione, mobilità e ricostituzione: la portata russa produce danni, ma non paralisi. P0 termina soltanto quando HIMARS e M270 rendono ripetibile l'interdizione del retro russo."
dialettica: "Paralisi e sopravvivenza"

sistemi_citati: [iads, tochka-u, moskva, neptune, himars, m270, gmlrs]

# ---- IMMAGINE ----
immagine:
  file: /immagini/profondita/p0-ship.png
  alt: "Lancio di un missile da crociera Kalibr da una corvetta russa della classe Buyan-M nel Mar Nero"
  credito: "Ministero della Difesa della Federazione Russa / Mil.ru, via Wikimedia Commons — frame estratto dal video e convertito in JPG"
  licenza: "CC BY 4.0"
  didascalia: "Una corvetta russa della classe Buyan-M lancia una salva di missili da crociera Kalibr dal Mar Nero nel marzo 2022."

# ---- DIAGRAMMA DELLA PROFONDITÀ ----
# Contratto in docs/diagramma-profondita/CONTRATTO-DATI.md. Solo chiavi e testi:
# nessun colore, classe, coordinata, lunghezza, icona, legenda o nota metodologica.
diagrammaProfondita:
  versione: 1
  dataAssetto: "2022-06-24"
  profili:
    ucraina:
      complesso: "Tochka-U · Neptune · incursioni aeree episodiche"
      accesso:
        contatto:
          stato: reiterabile
        prossima:
          stato: episodico
        intermedia:
          stato: episodico
        profonda:
          stato: non-accessibile
      nodi:
        - tipo: aeroporti
          fascia: prossima
          etichetta: "Base di Millerovo"
        - tipo: depositi
          fascia: prossima
          etichetta: "Deposito carburanti di Belgorod"
        - tipo: flotta
          fascia: intermedia
          etichetta: "Incrociatore Moskva"
      limite: "Pochi strumenti disponibili, rischio elevato e assenza di un metodo reiterabile"
    russia:
      complesso: "Kalibr · Iskander-M · missili aviolanciati · aviazione e guerra elettronica"
      accesso:
        contatto:
          stato: reiterabile
        prossima:
          stato: reiterabile
        intermedia:
          stato: limitato
        profonda:
          stato: limitato
      nodi:
        - tipo: difesa-aerea
          fascia: contatto
          etichetta: "Difesa aerea integrata"
        - tipo: aeroporti
          fascia: intermedia
          etichetta: "Basi e aviazione"
        - tipo: comando
          fascia: profonda
          etichetta: "Comando nazionale"
        - tipo: infrastrutture
          fascia: profonda
          etichetta: "Infrastrutture militari"
      limite: "Targeting lento contro capacità mobili, dispersione ucraina e sopravvivenza della IADS"
---

## L'intero territorio raggiungibile, il sistema ancora vivo

Il 24 febbraio 2022 la profondità ucraina sembra perdere il proprio significato protettivo. Missili balistici e da crociera, aviazione e guerra elettronica permettono alla Russia di investire in poche ore basi aeree, radar, batterie antiaeree, depositi e nodi di comando distribuiti sull'intero paese {% affV1 "P0-E001" %}. La distanza dal fronte non garantisce più sicurezza; soprattutto, Mosca possiede una capacità offensiva alla quale Kyiv non può rispondere su scala equivalente.

Questa asimmetria non produce però l'esito per cui era stata costruita. La Russia danneggia e degrada funzioni reali, ma non ne rende indisponibili abbastanza con la rapidità necessaria a paralizzare lo Stato e consegnare alla manovra terrestre un avversario disarticolato. L'Ucraina non protegge ogni installazione e non impedisce che città e infrastrutture vengano colpite. Conserva tuttavia il governo, il comando, una parte dell'aviazione e soprattutto una rete antiaerea ancora capace di contestare lo spazio aereo. Mosca rende raggiungibile l'intera profondità ucraina; Kyiv impedisce che raggiungibilità significhi cessazione del sistema.

La prima fase del filo *profondità* comincia quindi nello stesso istante del [Prologo](/fasi/manovra-fallita/), ma segue una contesa differente e si estende oltre. Il Prologo osserva Hostomel, gli assi terrestri e la manovra che si esaurisce con il ritiro russo dal nord all'inizio di aprile. Questa scheda segue invece il duello fra attacco e sopravvivenza nella profondità. Dopo l'abbandono dell'asse di Kyiv, la Russia può ancora colpire il territorio ucraino su scala nazionale, mentre l'Ucraina conserva soltanto strumenti episodici per raggiungere il retro avversario. La relazione cambia davvero a fine giugno, quando HIMARS e M270 con razzi guidati GMLRS rendono possibile una prima interdizione precisa e ripetibile del retro operativo russo.

## Colpire la profondità per comprimere il tempo

La prima salva non è una campagna separata dall'invasione. Missili e aviazione devono colpire bersagli già individuati; la guerra elettronica deve interferire con sensori e comunicazioni; esche e missioni di soppressione devono aprire corridoi; forze aviotrasportate e colonne terrestri devono sfruttare la finestra prima che l'Ucraina riesca a ricomporsi. Non sono i missili, da soli, a dover vincere la guerra. Il loro compito è sottrarre all'avversario il tempo necessario a mobilitare e coordinare la risposta.

Il disegno dipende da tre previsioni. 
1. Anzitutto, **l'elenco preordinato** dei bersagli deve rappresentare con sufficiente precisione il dispositivo ucraino all'apertura delle ostilità. 
2. In secondo luogo, la **soppressione iniziale delle difese aeree** deve poter essere **mantenuta**: una batteria che riappare o un radar che torna a emettere devono essere riconosciuti e colpiti prima che restringano nuovamente la libertà dell'aviazione russa. 
3. Infine, **la paralisi militare deve convergere con l'azione terrestre abbastanza rapidamente** da impedire allo Stato, alle riserve e al sostegno esterno di acquistare massa.

La prima campagna ottiene risultati importanti. Installazioni statiche vengono colpite, radar e sistemi antiaerei sono distrutti o danneggiati, basi e depositi subiscono perdite {% affV1 "P0-E002" %}. Nel sud, dove una parte del dispositivo ucraino riceve meno preavviso, è più esposta o riesce a reagire con minore efficacia, la degradazione è più grave {% affV1 "P0-E003" %}. Lo strumento russo non è dunque incapace di produrre effetti. Il problema emerge nel passaggio successivo: convertire quei danni locali in una condizione nazionale durevole, quindi in decisione politica.

<div class="derivazione">
  <span class="der-cap">Le congetture e gli assunti degli attori in P0</span>
  <div class="der-liv der-liv--strat">
    <span class="der-tag">Congettura offensiva russa · comprimere il tempo fino alla decisione</span>
    <span class="der-txt">Una campagna nazionale di attacchi, coordinata con guerra elettronica, aviazione e manovra terrestre, può <b>disarticolare abbastanza rapidamente le funzioni militari ucraine</b> da impedire allo Stato di mobilitare e ricomporre una risposta coerente.</span>
    <div class="der-body">
      <div class="der-liv der-liv--ann">
        <span class="der-tag">Primo assunto russo · la coordinata rappresenta ancora la funzione</span>
        <span class="der-txt">L'elenco preordinato dei bersagli deve descrivere con sufficiente attualità il dispositivo ucraino: colpire basi, radar, batterie, depositi e comandi conosciuti deve rimuovere una quota decisiva delle capacità che vi sono associate.</span>
      </div>
      <div class="der-coppia">
        <div class="der-liv der-liv--ann">
          <span class="der-tag">Secondo assunto russo · la soppressione può essere mantenuta</span>
          <span class="der-txt">Sensori, comando e ciclo d'attacco devono ritrovare e colpire le capacità mobili sopravvissute abbastanza rapidamente da impedire alla difesa aerea e all'aviazione ucraine di ricostituire una minaccia persistente.</span>
        </div>
        <div class="der-liv der-liv--ann">
          <span class="der-tag">Terzo assunto russo · gli effetti convergono prima della ricomposizione</span>
          <span class="der-txt">Il danno nella profondità e la manovra terrestre devono saldarsi prima che comando, mobilitazione, riparazione e sostegno esterno trasformino le capacità residue in un sistema nuovamente coerente.</span>
        </div>
      </div>
      <div class="der-liv der-liv--sup">
        <span class="der-tag">Controcongettura difensiva ucraina · sopravvivere come sistema</span>
        <span class="der-txt">Kyiv non deve rendere invulnerabile la propria profondità: può negare la decisione rapida se <b>conserva e ricompone abbastanza funzioni militari e statali</b> da continuare ad agire mentre il tempo amplia le risorse disponibili.</span>
        <div class="der-body">
          <div class="der-coppia">
            <div class="der-liv der-liv--ann">
              <span class="der-tag">Primo assunto ucraino · mobilità e dispersione rompono la corrispondenza</span>
              <span class="der-txt">Spostare velivoli, batterie, scorte e comandi, ridurre le emissioni e usare sedi alternative può separare la funzione dalla coordinata conosciuta e rendere rapidamente obsoleta una parte del targeting russo.</span>
            </div>
            <div class="der-liv der-liv--ann">
              <span class="der-tag">Secondo assunto ucraino · le componenti disperse possono ricomporsi</span>
              <span class="der-txt">Comunicazioni, comando alternativo, manutenzione e procedure devono permettere a piattaforme e sensori sopravvissuti di tornare a operare insieme: salvare l'oggetto vale soltanto se viene conservata la funzione.</span>
            </div>
          </div>
          <div class="der-coppia">
            <div class="der-liv der-liv--ann">
              <span class="der-tag">Terzo assunto ucraino · una IADS sopravvissuta può negare libertà persistente</span>
              <span class="der-txt">La difesa aerea non deve impedire ogni impatto: deve conservare un grado di dissuasione che costringa l'aviazione russa a limitare le penetrazioni e a dipendere maggiormente da attacchi stand-off.</span>
            </div>
            <div class="der-liv der-liv--ann">
              <span class="der-tag">Quarto assunto ucraino · il tempo estende la profondità oltre il territorio</span>
              <span class="der-txt">Se governo e forze armate mantengono continuità, intelligence, comunicazioni, rifornimenti e capacità della coalizione possono aggiungere risorse esterne più rapidamente di quanto Mosca riesca a chiudere la guerra.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

## Una coordinata distrutta non è una funzione rimossa

Il primo limite della campagna russa nasce dalla differenza fra bersaglio conosciuto e sistema vivente. Nelle ore precedenti l'invasione, le forze ucraine disperdono numerosi velivoli, sistemi antiaerei e scorte; diversi radar riducono le emissioni o cambiano posizione; comandi e unità mobili abbandonano sedi note {% affV1 "P0-E004" %}. Un missile può così raggiungere con precisione la coordinata assegnata e non trovare più la piattaforma per la quale era stato lanciato. L'accuratezza del vettore non rende attuale l'informazione che lo guida.

Le ricostruzioni operative indicano una forte differenza fra l'efficacia delle prime salve contro siti fissi e quella contro capacità mobili. I numeri disponibili dipendono anche da testimonianze ucraine e non descrivono in modo incontestabile l'intero dispositivo {% affV1 "P0-E005" %}; il rapporto generale è però coerente con ciò che segue. Mosca colpisce efficacemente molte strutture immobili. Kyiv conserva una parte decisiva di ciò che può muovere, spegnersi o operare da una posizione alternativa.

La Russia può naturalmente aggiornare i bersagli. Deve però osservare la capacità sopravvissuta, identificarla, trasmettere l'informazione, assegnare un vettore e completare l'attacco prima che essa si sposti di nuovo. Dopo l'insufficienza delle prime salve contro la difesa aerea, questo ciclo richiede spesso decine di ore secondo le ricostruzioni disponibili {% affV1 "P0-E006" %}. Il ritardo può essere accettabile contro un edificio o un impianto; contro batterie mobili, velivoli dispersi e posti di comando alternativi, restituisce al difensore la possibilità di sottrarsi.

Anche la valutazione del danno diventa parte del combattimento. Le forze russe presumono in più occasioni che un bersaglio assegnato sia stato neutralizzato; quelle ucraine impiegano occultamento, esche e disciplina delle emissioni per conservare l'incertezza {% affV1 "P0-E007" %}. Se l'attaccante considera chiuso un ingaggio che ha soltanto costretto il difensore a silenziarsi o a spostarsi, una capacità sopravvissuta può riapparire proprio dove era stata registrata come distrutta.

Il limite, quindi, non appartiene al missile preso isolatamente. Nasce dall'incontro fra un apparato costruito in larga misura attorno a coordinate note e un avversario che rende instabile la corrispondenza fra luogo e funzione. L'Ucraina guadagna tempo non perché la propria profondità sia lontana o intoccabile, ma perché la trasforma in un sistema mobile che l'attaccante deve continuamente ritrovare.

## La profondità che si ricompone

Sottrarre una piattaforma al primo colpo è soltanto l'inizio. Un velivolo disperso ma privo di carburante, manutenzione o ordini è salvo come oggetto, ma perduto come capacità militare. Una batteria che spegne il radar ma non riesce più a ricevere informazioni protegge se stessa e lascia scoperto il sistema. Il successo difensivo ucraino dipende dunque dalla continuità fra dispersione e ricomposizione.

L'aviazione conserva una parte significativa dei propri velivoli e continua a generare sortite nelle prime settimane. Comandi alternativi, comunicazioni ridondanti, riparazioni e trasferimenti permettono a unità danneggiate o separate di rientrare nell'azione. Avvertimenti precedenti all'invasione, intelligence alleata, collegamenti satellitari e afflusso di materiali ampliano le possibilità ucraine {% affV1 "P0-E008" %}. Non sostituiscono però l'iniziativa di Kyiv: sono le forze ucraine a decidere che cosa muovere, quando riaccendere un sensore, come ricomporre una rete e dove accettare il rischio.

Il nodo tecnico decisivo è la sopravvivenza del sistema integrato di difesa aerea, o *IADS*. Batterie e radar mobili subiscono perdite e consumano munizioni, ma cambiano posizione, alternano le emissioni e continuano a minacciare i velivoli russi {% affV1 "P0-E009" %}. La rete non rende sicuro l'intero territorio: missili e aerei continuano a colpire, alcune regioni rimangono più esposte di altre e nessuna difesa può coprire ogni bersaglio. Impedisce però alla Russia di convertire la superiorità di piattaforme e gittata in un dominio aereo permanente.

Questa sopravvivenza impone un dilemma. Ad alta e media quota, i velivoli russi restano esposti ai sistemi antiaerei a medio e lungo raggio. Scendendo, possono ridurre parte dell'esposizione ai radar, ma entrano nella fascia dei sistemi portatili e delle difese a corto raggio. Arretrando, devono affidarsi più spesso ad armi *stand-off* lanciate da distanza di sicurezza: strumenti preziosi, disponibili in quantità limitate e meno adatti a inseguire ogni bersaglio mobile. Entro marzo le penetrazioni profonde con equipaggio diventano sempre più costose; entro aprile vengono fortemente ridotte e una quota crescente della pressione passa agli attacchi da remoto {% affV1 "P0-E010" %}.

È qui che la sopravvivenza acquista valore strategico. La difesa aerea non deve abbattere ogni vettore per riuscire. Le basta mantenere abbastanza rischio da impedire all'aviazione russa di osservare e colpire liberamente le capacità che la prima salva non ha distrutto. In tal modo protegge indirettamente comando, mobilitazione, riparazione e ricezione degli aiuti: non costruisce un territorio inviolabile, ma conserva il tempo necessario perché lo Stato continui ad agire.

Il rapporto si alimenta in entrambe le direzioni. Finché il comando rimane attivo, può ridistribuire le batterie e assegnare priorità; finché la difesa aerea resta pericolosa, protegge la possibilità del comando di farlo. L'aviazione dispersa, a sua volta, costringe la Russia a conservare attenzione e risorse per una minaccia che la prima salva avrebbe dovuto eliminare. Nessuna componente, presa da sola, spiega la tenuta: è la loro ricomposizione a impedire che perdite anche gravi si propaghino fino al collasso dell'intero apparato.

La coalizione esterna diventa così parte della profondità ucraina senza cancellarne la responsabilità decisionale. Intelligence, comunicazioni, addestramento e rifornimenti estendono oltre il confine le risorse alle quali Kyiv può attingere. La previsione russa richiedeva che la guerra si chiudesse prima che questa profondità esterna si materializzasse pienamente. Ogni giorno nel quale l'Ucraina conserva governo, comando e collegamenti rende invece più difficile separarla da quella riserva.

## Dove la finestra si chiude, dove resta aperta

Hostomel è la giuntura più visibile fra questa contesa e il Prologo terrestre. La soppressione russa contribuisce ad aprire un corridoio iniziale verso l'aeroporto Antonov; elicotteri da trasporto e d'attacco raggiungono l'obiettivo e le Forze aviotrasportate ottengono un primo successo tattico {% affV1 "P0-E011" %}. La campagna nella profondità crea dunque una possibilità concreta.

La difesa ucraina, però, la richiude prima che produca l'effetto previsto. Artiglieria, difesa antiaerea e contrattacco investono lo scalo; pista e perimetro non diventano il ponte aereo stabile necessario a trasferire rapidamente una forza decisiva accanto a Kyiv {% affV1 "P0-E012" %}. Mosca recupera l'area con l'arrivo delle colonne terrestri, ma non il tempo perduto. Il caso non richiede una seconda narrazione della battaglia: mostra che aprire temporaneamente un corridoio non equivale a mantenerlo disponibile mentre l'avversario conserva comando, fuochi e riserve.

Nel sud, la stessa architettura russa ottiene una conversione maggiore. Le basi in Crimea sono vicine; sorpresa e preparazione favoriscono l'attaccante. Diversi elementi della difesa ucraina ricevono meno preavviso, sono più vecchi o meno mobili, mentre la risposta organizzativa si costruisce con minore efficacia. Le prime salve e la guerra elettronica degradano più gravemente il dispositivo {% affV1 "P0-E013" %}; l'effetto si salda alla rapida manovra dalla Crimea, contribuendo alla conquista di Kherson e a una profonda avanzata territoriale.

Il contrasto impedisce di trasformare la sopravvivenza ucraina in una qualità automatica. Distanze, basi e vie d'accesso contano, ma non emettono da sole il verdetto: diventano decisive attraverso preavviso, preparazione, comando, mobilità e capacità di ricomporre le funzioni sotto attacco. Mosca dimostra di poter disarticolare seriamente un settore. Ciò che non ottiene è una disarticolazione nazionale abbastanza rapida da sostenere la propria ambizione politica.

## Dalla paralisi mancata alla pressione persistente

Quando lo Stato ucraino non collassa, Mosca amplia e modifica progressivamente il repertorio dei bersagli. Già all'inizio di marzo crescono gli attacchi contro strutture governative, comunicazioni, industria militare, carburanti e infrastrutture {% affV1 "P0-E014" %}. La campagna non cessa di produrre danni; cambia la funzione alla quale quei danni vengono ordinati. Da premessa di una decisione rapida, lo strumento a lungo raggio diventa sempre più un mezzo di logoramento, coercizione e pressione contro un avversario destinato a sopravvivere al primo colpo.

Non è ancora la campagna energetica sistematica che comincerà nell'ottobre 2022. In questa fase, città e infrastrutture ucraine sono già colpite, ma non esiste ancora la forma stagionale, reiterata e concentrata sulla rete elettrica che definirà quel passaggio successivo. Confondere i due momenti cancellerebbe l'adattamento russo: Mosca deve prima riconoscere che non sta occupando rapidamente un sistema intatto, quindi imparare a degradare nel tempo uno Stato che continua a combattere.

La selezione iniziale dei bersagli riflette probabilmente anche la razionalità politica della guerra breve. Per circa due settimane, molti nodi della rete nazionale dei trasporti non vengono investiti con la sistematicità che ci si attenderebbe da una campagna rivolta soltanto alla massima distruzione {% affV1 "P0-E015" %}. È coerente ritenere che Mosca volesse conservare parte delle infrastrutture che prevedeva di utilizzare dopo una rapida vittoria. Il profilo osservato sostiene questa inferenza; non permette di attribuirla con certezza a ogni centro decisionale russo.

Quando quell'aspettativa cade, emergono insieme i limiti informativi, operativi e quantitativi della campagna. La Russia deve ritrovare abbastanza in fretta i bersagli mobili, mantenere la soppressione delle difese su un territorio vastissimo e concentrare munizioni di precisione senza esaurire scorte difficili da sostituire. Non produce la densità necessaria a paralizzare comando, trasporti, comunicazioni e rifornimenti su scala nazionale {% affV1 "P0-E016" %}. Ciò non rende inefficace l'attacco: ne misura il divario rispetto all'esito politico richiesto.

## Ferire il santuario non significa sottoporlo a una campagna

La profondità russa non è tecnicamente invulnerabile. Il 25 febbraio un attacco attribuito a un Tochka-U — sistema balistico tattico di progettazione sovietica — ucraino colpisce la base aerea di Millerovo, nell'oblast' di Rostov; le immagini mostrano danni, ma vettore ed effetto complessivo non sono ricostruibili con piena certezza {% affV1 "P0-E017" %}. Il 1º aprile un deposito di carburante a Belgorod viene investito da un'incursione che le autorità russe attribuiscono a elicotteri ucraini a bassissima quota; Kyiv non conferma la responsabilità {% affV1 "P0-E018" %}.

I due episodi dimostrano che confine e distanza non costituiscono una barriera assoluta. Non offrono però un metodo scalabile. Richiedono pochi strumenti disponibili, rischio elevato e condizioni favorevoli; non costringono la Russia ad arretrare sistematicamente basi, depositi o comandi. L'Ucraina può produrre un colpo raro oltre il santuario, ma non imporvi una pressione continuativa.

L'affondamento dell'incrociatore *Moskva*, fra il 13 e il 14 aprile, è la breccia più importante del periodo. La perdita della nave è confermata. Kyiv attribuisce l'attacco ai missili antinave Neptune; fonti occidentali e ricostruzioni successive sostengono questa versione, mentre Mosca ha indicato un incendio e l'esplosione di munizioni. L'impiego dei Neptune è altamente plausibile, ma la catena completa di individuazione e ingaggio non è interamente osservabile {% affV1 "P0-E019" %}.

La *Moskva* non è soltanto una piattaforma costosa: contribuisce al comando, alla difesa aerea e alla presenza della Flotta del Mar Nero. La sua perdita modifica localmente il comportamento russo e mostra che Kyiv può unire un vettore nazionale, informazioni e scelta di un bersaglio ad altissimo valore per ottenere un effetto sproporzionato. Non consegna però all'Ucraina il dominio marittimo: la Russia conserva altre unità, continua a lanciare missili Kalibr e mantiene capacità di blocco e pressione.

La distinzione è decisiva. Una forza può colpire e perfino produrre un evento eccezionale con conseguenze operative senza possedere ancora una campagna. Millerovo, Belgorod e la *Moskva* rendono porosa la profondità russa e marittima, ma non le impongono un adattamento generale. Durante questa prima fase della profondità, Mosca rimane l'unico attore capace di sostenere una campagna nazionale continuativa contro bersagli distribuiti sull'intero territorio avversario.

## Quando il colpo diventa campagna

Il passaggio successivo non coincide con l'annuncio di un lanciatore. Il 1º giugno gli Stati Uniti annunciano i primi quattro M142 HIMARS e i razzi guidati GMLRS; gli equipaggi ucraini sono ancora in addestramento. Il 15 giugno viene comunicato il completamento della formazione iniziale di sessanta militari, con la previsione di un impiego entro la fine del mese {% affV1 "P0-E020" %}. Il 24 giugno la presenza dei primi sistemi in Ucraina è confermata; gli attacchi cominciano a essere osservati negli ultimi giorni del mese {% affV1 "P0-E021" %}.

La novità non è la distanza presa da sola. I Tochka-U potevano teoricamente raggiungere bersagli più lontani dei GMLRS. HIMARS e M270 uniscono però precisione, mobilità del lanciatore, munizioni rifornibili, equipaggi addestrati, intelligence e una catena capace di scegliere nuovi bersagli e ripetere le missioni. Kyiv non deve più attendere soltanto l'occasione eccezionale: può pianificare una serie di attacchi contro depositi, comandi, nodi ferroviari e attraversamenti distribuiti nel retro operativo russo.

Anche qui, il lanciatore isolato non è la capacità. Senza coordinate aggiornate, addestramento, protezione degli equipaggi e un flusso regolare di munizioni, quattro mezzi resterebbero una risorsa pregiata ma intermittente. Integrati nel sistema ucraino e sostenuti dalla coalizione, diventano invece il nucleo iniziale di una pratica reiterabile. Non promettono di distruggere ogni deposito russo: permettono di scegliere e colpire quei pochi nodi la cui perdita può ridurre il rendimento di molte unità alla linea, sfruttando i colli di bottiglia del sistema russo.

L'asimmetria nazionale non scompare. La Russia continua a poter raggiungere tutto il territorio ucraino; i GMLRS investono una fascia di circa settanta-ottanta chilometri e il loro impiego dipende da quantità e vincoli politici occidentali. La trasformazione riguarda il teatro: la distanza non protegge più automaticamente le grandi concentrazioni che alimentano l'artiglieria russa.

Questo passaggio consegna il problema alla fase successiva e, lungo la linea principale, al [duello logistico](/fasi/duello-logistico/). Restringendo il fronte e appoggiandosi alla ferrovia, Mosca concentra munizioni, carburante e comando per accrescere il volume di fuoco. Finché Kyiv non può raggiungerli con continuità, quei nodi aumentano il rendimento russo. Quando i GMLRS entrano in combattimento, la stessa concentrazione diventa una vulnerabilità.

La Russia perde dunque la possibilità di trattare i propri attacchi nazionali come premessa sufficiente della decisione, ma non la superiorità nel lungo raggio. L'Ucraina vince nel grado necessario a sopravvivere: conserva lo Stato e le funzioni militari essenziali, senza ottenere ancora reciprocità strategica. A fine giugno la profondità smette però di essere soltanto il luogo nel quale Kyiv deve assorbire il colpo. La nuova domanda è quale concentrazione avversaria raggiungere per ridurre il rendimento dell'intero sistema.

## Vincitori e vinti

Comparire qui non fa di un mezzo, di una dottrina o di una configurazione un vincitore o uno sconfitto dell'intera guerra. I giudizi riguardano questa fase e le condizioni concrete nelle quali ciascun elemento viene impiegato; ciò che ascende conserva valore soltanto finché l'attore mantiene la relazione che lo sostiene, mentre ciò che declina può essere ricomposto in una fase successiva.

<div class="grp grp--asc">
  <svg class="grp-eco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 L20 4"/><path d="M20 10 L20 4 L14 4"/><path d="M4 14 L14 4" opacity="0.5"/><path d="M4 8 L8 4" opacity="0.25"/></svg>
  <div class="grp-head"><svg class="grp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 L19 5"/><path d="M19 12 L19 5 L12 5"/></svg><span class="grp-moto">Ascende</span><span class="grp-tag">profondità ricostituibile</span></div>
  <div class="el"><div class="el-nome">La difesa aerea integrata mobile</div><div class="el-txt">Batterie, sensori e procedure sopravvissuti impediscono alla Russia di trasformare la soppressione iniziale in dominio permanente. Il valore nasce dalla capacità ucraina di <b>muovere, spegnere, riattivare e collegare</b> componenti residue in una rete ancora pericolosa.</div></div>
  <div class="el"><div class="el-nome">Dispersione e ricomposizione</div><div class="el-txt">Velivoli, comandi e munizioni sottratti ai siti conosciuti conservano la propria funzione soltanto grazie a comunicazioni, manutenzione e decisioni che li riportano nell'azione. Intelligence, rifornimenti e collegamenti esterni ampliano questa capacità senza sostituire l'iniziativa ucraina.</div></div>
</div>

<div class="grp grp--dec">
  <svg class="grp-eco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4 L20 20"/><path d="M20 14 L20 20 L14 20"/><path d="M4 10 L14 20" opacity="0.5"/><path d="M4 16 L8 20" opacity="0.25"/></svg>
  <div class="grp-head"><svg class="grp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5 L19 19"/><path d="M19 12 L19 19 L12 19"/></svg><span class="grp-moto">Declina</span><span class="grp-tag">paralisi preordinata</span></div>
  <div class="el"><div class="el-nome">La coordinata come rappresentazione del sistema</div><div class="el-txt">Un elenco ampio e accurato di siti non basta quando l'avversario ha spostato o ricostituito la capacità. Declina l'aspettativa che distruggere il luogo conosciuto equivalga a rimuovere stabilmente la funzione.</div></div>
  <div class="el"><div class="el-nome">La soppressione assunta come distruzione</div><div class="el-txt">Hostomel e il ritorno in attività della rete antiaerea mostrano che una finestra deve essere osservata, mantenuta e riaperta. Senza un ciclo abbastanza rapido, <b>l'avversario rientra nell'azione</b> e lo strike non si converte da solo in controllo.</div></div>
</div>

<div class="grp grp--tra">
  <svg class="grp-eco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12 a8 8 0 0 1 -13.7 5.6"/><path d="M4 12 a8 8 0 0 1 13.7 -5.6"/><path d="M17.7 3 L17.7 6.4 L14.3 6.4"/><path d="M6.3 21 L6.3 17.6 L9.7 17.6"/></svg>
  <div class="grp-head"><svg class="grp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12 a8 8 0 0 1 -13.7 5.6"/><path d="M4 12 a8 8 0 0 1 13.7 -5.6"/><path d="M17.7 3 L17.7 6.4 L14.3 6.4"/><path d="M6.3 21 L6.3 17.6 L9.7 17.6"/></svg><span class="grp-moto">Trasformato</span><span class="grp-tag">pressione e santuario</span></div>
  <div class="el"><div class="el-nome">La campagna russa a lungo raggio</div><div class="el-txt">Nata come parte della decisione rapida, viene progressivamente riordinata al logoramento, alla coercizione e alla pressione persistente. Non è ancora la campagna energetica dell'ottobre 2022: ne prepara il problema, perché Mosca deve colpire uno Stato che non è crollato.</div></div>
  <div class="el"><div class="el-nome">Il santuario</div><div class="el-txt">La profondità ucraina viene investita su scala nazionale ma rimane funzionale; quella russa è penetrata episodicamente ma non ancora sottoposta a un costo continuo. La protezione emerge come rapporto fra frequenza dell'attacco, difesa, riparazione e libertà di operare, non come semplice distanza.</div></div>
</div>
