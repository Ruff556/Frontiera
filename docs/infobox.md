# Infobox: contratto editoriale

Ogni famiglia editoriale può usare uno dei quattro formati dichiarando `infobox.tipo`
come numero YAML (`1`, `2`, `3` o `4`). Un tipo dichiarato ma invalido interrompe la
build con il percorso del sorgente. Il vecchio payload con `infobox.voci` privo di
`tipo` resta temporaneamente interpretato come tipo 2; non va usato nei nuovi contenuti.

## Tipo 1 — sintetico

Nelle schede F e P le cinque voci sono derivate dai campi storici `datazione`,
`luoghi`, `intentoRusso`, `intentoUcraino` e `soluzione`. I campi non vanno copiati.

```yaml
infobox:
  tipo: 1
```

Nelle altre famiglie, o per sostituire le sole voci mostrate in una F/P:

```yaml
infobox:
  tipo: 1
  titolo: "Titolo facoltativo"
  voci:
    - etichetta: "Etichetta"
      testo: "Testo della voce."
      ruolo: neutro
    - etichetta: "Esito"
      testo: "Testo in evidenza."
      ruolo: evidenza
```

`ruolo` è facoltativo e accetta soltanto `neutro`, `russo`, `ucraino` o `evidenza`.

## Tipo 2 — editoriale a voci

```yaml
infobox:
  tipo: 2
  titolo: "Tre strati della capacità"
  voci:
    - occhiello: "Infrastruttura"
      titolo: "La rete, non la parabola"
      testo: "Descrizione della voce."
```

`titolo` generale è facoltativo. Ogni voce deve compilare almeno uno fra
`occhiello`, `titolo` e `testo`.

## Tipo 3 — complesso e raggruppato

```yaml
infobox:
  tipo: 3
  titolo: "Architettura del sistema"
  gruppi:
    - titolo: "Piattaforme"
      voci:
        - nome: "Piattaforma A"
          descrizione: "Descrizione minimale e informativa."
        - nome: "Piattaforma B"
          descrizione: "Descrizione minimale e informativa."
    - titolo: "Sviluppi"
      voci:
        - nome: "Sviluppo A"
          descrizione: "Descrizione minimale e informativa."
```

`titolo` generale è facoltativo. `gruppi` deve contenere almeno un gruppo; ogni
gruppo richiede titolo e almeno una voce; ogni voce richiede nome e descrizione.
Accenti e alternanze cromatiche sono automatici e non fanno parte del front matter.

## Tipo 4 — Contatti

Pannello verticale istituzionale per i recapiti pubblici di Frontiera. L’immagine
è un percorso locale; l’indirizzo email deve avere testo e `mailto:` corrispondenti.
Il profilo X è facoltativo soltanto finché non è disponibile un handle definitivo;
quando viene dichiarato, richiede entrambi i campi e un handle coerente con l’URL.

```yaml
infobox:
  tipo: 4
  titolo: "Contatti"
  immagine: "/favicon-256x256.png"
  email:
    testo: "frontiera.redazione@gmail.com"
    href: "mailto:frontiera.redazione@gmail.com"
  x:
    testo: "@HANDLE"
    href: "https://x.com/HANDLE"
```

Sono ammessi soltanto `tipo`, `titolo`, `immagine`, `email` e `x`. Sono obbligatori
`tipo`, `titolo`, `immagine`, `email.testo` e `email.href`; se presente, `x` deve
contenere obbligatoriamente `testo` e `href`. Nel rendering l’immagine precede il
divisore principale, il titolo, l’email e — quando disponibile — il divisore minore
seguito dal collegamento X. Il richiamo e il dialogo mobile restano automatici e
usano lo stesso nodo del dispatcher condiviso.

## Verifica

Sotto `900px`, ogni infobox valido riceve automaticamente il richiamo mobile:
il pulsante compare soltanto dopo il superamento del pannello originale e apre
lo stesso nodo in un dialogo liquid glass. Non sono richiesti campi aggiuntivi.

```bash
npm run verify:infobox
npm run verify:infobox-mobile
npm run build
```
