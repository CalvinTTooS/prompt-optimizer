# CLAUDE.md — <nome progetto>

> **Template v0.5.** Regole **operative** caricate in ogni sessione: tienile brevi.
> Il **metodo completo** (principi di ingegneria, il "perché") è in `METHOD.md`:
> **leggilo** su decisioni architetturali o di sicurezza importanti, o quando serve
> il razionale di una regola. `METHOD.md` è **STABILE**: non modificarlo senza
> **approvazione esplicita** dell'utente.

## Regola d'oro
Progetta prima, sviluppa dopo. Prima di scrivere codice definisci: **problema**,
**architettura a blocchi**, **strategia di test**, **sicurezza by design**.
Razionale e dettaglio in `METHOD.md` §1.

## Workflow — a ogni modifica
- Presenta un **piano numerato**, poi **FERMATI e chiedi approvazione**. Non
  scrivere file né eseguire comandi nello stesso turno del piano.
- Lavora su **branch di feature**, mai su `main`.
- Esegui il **Gate** *prima* (baseline) e *dopo* ogni modifica.
- Fai **un cambiamento piccolo e coeso** alla volta. Prima di spostare o
  rifattorizzare codice, **mappa le dipendenze** (chi lo chiama/legge — incluse le
  **variabili**, non solo le funzioni).
- Per modifiche **non banali**: prima di consolidare, chiediti *"c'è un modo più
  semplice/elegante?"*; se la soluzione è una pezza, rifalla pulita. **Salta per i
  fix banali** — YAGNI vince, niente gold-plating.
- Se il **Gate è rosso, correggi *prima* di proseguire**. Non accumulare rotture.
- **Committa solo a Gate verde**, con messaggio (cosa + perché) e trailer di
  co-autore.
- Per azioni **esterne/irreversibili** (push, pubblicazione, cancellazioni,
  sovrascritture): **chiedi conferma esplicita**. Non esporre **mai** segreti in
  chat o log.
- **Riferisci con onestà**: se un test fallisce, dillo con l'output. Niente "fatto"
  senza aver letto l'**uscita del Gate**.
- **Fermati e segnala** quando il rischio supera il beneficio.
- Dopo una **correzione** dell'utente: aggiungi la regola in `lessons.md` (una riga
  + perché); rileggi `lessons.md` pertinente a **inizio sessione**. Vedi `METHOD.md`
  (loop di auto-miglioramento).

## Revisione manuale obbligatoria — non delegare la lettura all'AI
Ispeziona a mano il codice che:
- gestisce **credenziali/segreti**;
- **scrive o cancella file**;
- riceve **input dall'esterno** (file, rete, parametri);
- introduce una **nuova dipendenza**.

## Sicurezza — vincoli non negoziabili
- **Nessun segreto** nel repo né nella storia git. Usa env/secret store.
- **Valida gli input** ai confini; **codifica gli output** per contesto
  (HTML/SQL/shell) per prevenire injection.
- **Fail securely**: in caso di errore, **nega** l'accesso.
- Ogni **nuova dipendenza** è superficie di rischio: valuta origine, manutenzione,
  licenza, integrità prima di aggiungerla.

## Igiene — oltre a ciò che impone già il linter
- Niente **codice morto**, **file orfani**, **script temporanei** o **dipendenze
  inutili** (la storia è in git; non commentare-e-tenere).
- Niente `TODO`/placeholder o logica omessa nel codice consegnato.
- Identificatori e commenti in **inglese**; i commenti spiegano il **perché**.
- **Regola dello scout**: lascia il codice toccato più pulito di come l'hai trovato.

## Documentazione — regola di sincronizzazione
Ogni **modifica strutturale** (moduli, dipendenze, flussi, formato dati, comandi)
aggiorna **nello stesso commit** i documenti interessati — in primis `ARCHITECTURE`
e il **diagramma a blocchi**. Una documentazione disallineata è un **bug**.
File canonici: `README` · `USER_GUIDE` · `ARCHITECTURE` · `CHANGELOG` · `WORK_LOG`
· `lessons.md` · `THIRD-PARTY-LICENSES` · `ACKNOWLEDGMENTS` · `ADR/` · `CONTRIBUTING`.

---

# Progetto — DA COMPILARE

## Contesto
Obiettivo: `<cosa fa, per chi, perché>`. Vincoli chiave: `<…>`.
Riferimenti competitivi (opz.): `<…>`.

## Scelte architetturali vincolanti
- **Piattaforma/e target**: `<da decidere · desktop/portable · Android · web · cross-platform>`
- Linguaggio: `<…>`
- Framework / interfaccia: `<…>`
- Persistenza / IO: `<…>`
- Stack di test (runner + fixture/asset): `<…>`
- Packaging / distribuzione: `<…>`

## Organizzazione del codice
Sorgenti: `<…>` · Test: `<…>` · Asset/binari: `<…>` — percorsi **rigidi**: usa
sempre questi, non variarli.

## Comandi del progetto
- Setup ambiente: `<…>`
- Avvio / run: `<…>`
- Test (definisce la **baseline verde**): `<…>`
- Lint / format: `<…>`
- **Gate** — *Definition of Done del singolo passo; eseguilo e leggi la sua
  **uscita** prima di dichiarare "ho finito"*: `<…>`
  (es. `ruff check . && pytest -q` · `npm run lint && npm test` ·
  `./gradlew ktlintCheck test`).

## Profilo di piattaforma
Scegli **un** profilo da `profiles/` (desktop · android · web), **incollane qui il
contenuto** e cancella gli altri. Se la piattaforma non è ancora decisa, lascia
questo campo e lavora sul **core agnostico** (`METHOD.md` §1.1) finché non è scelta.
