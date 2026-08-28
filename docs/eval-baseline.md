# Baseline di conformità dei meta-prompt

Registro delle esecuzioni di `npm run eval`. **È l'unica parte dell'output che
va versionata**: i report completi in `eval/output/` pesano ~220 KB a run, sono
riproducibili rilanciando l'harness, e restano gitignorati. I *tassi misurati in
una certa data con un certo codice*, invece, non sono riproducibili — e stanno in
venti righe.

**Come si legge.** I numeri servono a **falsificare** una regola, non a
certificarla: una regola al 100% su ~10 casi dice poco, una al 76% dice che il
meta-prompt non la sta imponendo. Si confronta il **delta** tra due esecuzioni,
non il livello assoluto.

**Perché serve il commit.** Un confronto ha senso solo a parità di corpus e di
regole. Entrambi sono versionati (`eval/prompts.ts`, `app/lib/conformance.ts`),
quindi il commit identifica esattamente che cosa è stato misurato: se cambia il
corpus, i numeri precedenti **non sono più paragonabili**.

---

## Run 1 — 2026-08-27 · baseline iniziale

| | |
|---|---|
| Commit | `3dca93e` |
| Modello | `gemini-3.5-flash-lite` (fissato) |
| Modalità | flusso singolo (un formato per chiamata) |
| Corpus | 66 casi · K=3 · **198 osservazioni** · 960 controlli |
| Esito | **944/960 superati (98,3%)** |

### Tassi per regola

| Flusso | Regola | Conformi | % |
|---|---|---|---|
| chat | `chat.balanced` | 32/42 | **76%** ⚠ |
| chat | `chat.tags` · `chat.spacing` · `anon.intact` | 42/42 | 100% |
| code | `code.claudeMd` | 28/30 | **93%** ⚠ |
| code | le altre 9 regole | 30/30 | 100% |
| cowork | tutte e 4 | 24/24 | 100% |
| systemUser | tutte e 3 | 54/54 | 100% |
| gemini | `gemini.concreteCommands` | 26/30 | **87%** ⚠ |
| gemini | le altre 5 | 30/30 | 100% |
| scaffold | tutte e 3 | 18/18 | 100% |

### Reperti verificati (prove controllate una a una, non solo i numeri)

**① `chat.balanced` 76% — difetto intermittente del meta-prompt.**
In circa una generazione su quattro Gemini apre i tag e **non li chiude mai**:
`<role>` … `<context>` … senza alcun `</role>`. Sullo stesso caso, ripetizioni 1
e 3 corrette, ripetizione 2 rotta. Colpisce esattamente ciò per cui i tag XML
esistono — la delimitazione non ambigua.

**② `gemini.concreteCommands` 87% — difetto della REGOLA, non dell'output.**
Tutti e 4 i fallimenti sono casi in cui l'input **non nomina una toolchain**
(*"codice TypeScript pulito"*, *"non rompa i test"*, *"migrazioni del
database"*). La regola 4 di `FLOW_GEMINI` pretende comandi concreti, ma senza
stack dichiarato il modello può solo inventarli o restare generico. **La regola è
insoddisfacibile su quegli input** e non definisce una via d'uscita.

**③ `code.claudeMd` 93%** — 2 casi su 30 non citano `CLAUDE.md`, che la regola 9
dichiara obbligatorio leggere. Marginale.

### Nota di metodo

Il reperto ① è invisibile a chi esegue una sola ripetizione: con K=1 c'era il
**67% di probabilità di dichiarare la regola sana**. È la giustificazione
empirica di K=3.

Nella stessa run, una misura isolata (K=1, smoke test) aveva dato
`code.claudeMd` a 0/1, suggerendo una falla grave; su 30 osservazioni è al 93%.
Quel singolo dato era **rumore**.

---

## Run 2-4 — 2026-08-27 · esperimento L3 (stile dei meta-prompt)

Tre run in sequenza sullo stesso corpus e modello, per misurare la riscrittura
dei meta-prompt (audit L3 + regola 4 di `FLOW_GEMINI`).

| Metrica | Run 1 — baseline enfatica | Run 2 — de-enfasi | Run 3-4 — + salienza strutturale |
|---|---|---|---|
| `chat.balanced` | 32/42 · 76% | **41/42 · 98%** | 98% |
| `code.claudeMd` | 28/30 · 93% | 17/30 · **57%** | **30/30 · 100%** |
| `code.noPlaceholders` | 30/30 · 100% | 29/30 · 97% | **30/30 · 100%** |
| `gemini.headings` | 30/30 · 100% | 24/26 · 92% | **30/30 · 100%** |
| `gemini.noGenericPhrases` | 30/30 · 100% | 25/26 · 96% | **30/30 · 100%** |
| `gemini.concreteCommands` | 26/30 · 87% | 17/26 · 65% | 21/30 · **70%** ⚠️ |

Commit: `1c1f161` (riscrittura) · `e9df410` (ripristino portata) · run finali dopo
lo scorporo di `code.claudeMd` e `gemini.headings` in regole numerate proprie.

### Tre conclusioni, tutte misurate

**① L'enfasi non aggiungeva forza: compensava omissioni.**
`chat.balanced` è salito di 22 punti perché il meta-prompt ha finalmente **detto**
di chiudere i tag — cosa che non aveva mai chiesto, dandola per implicita.
`gemini.headings` è tornato a 100% perché ha finalmente detto **"senza tag XML"**:
prima diceva solo *cosa usare*, mai *cosa escludere*. Togliere il maiuscolo non
ha rotto niente: ha reso **visibile ciò che mancava da sempre**.

**② La salienza strutturale batte quella tipografica.**
`code.claudeMd`: 93% con `È VIETATO / OBBLIGATORIO` in coda a una regola lunga →
**57%** togliendo le maiuscole a parità di posizione → **100%** dando
all'istruzione una **regola numerata propria**, senza una sola maiuscola.
Regola operativa che ne discende: *un requisito che merita enfasi merita una
regola propria*.

**③ Una previsione falsificabile ha fatto il suo lavoro.**
Prima della run 4 avevo scritto: *"se `headings` torna a 100% ma
`concreteCommands` resta basso, la diagnosi «degrado a cascata» è sbagliata e i
due problemi sono indipendenti"*. È andata così. Sono **due problemi distinti**,
e ora è un fatto, non una supposizione.

### Aperto: `gemini.concreteCommands` a 70%

Sotto la baseline di 17 punti. `gemini-non-rompere-test` fallisce **3 volte su 3**,
e il suo input è *"un file di regole per l'AI… per evitare che rompa i test"* —
nessuna toolchain, e nessuna richiesta di comandi.

**Ipotesi da verificare: a sbagliare è il check, non l'output.** Se l'utente chiede
regole di stile, un file senza comandi di build è **corretto**. Il check dovrebbe
pretendere comandi concreti solo quando il file dichiara una sezione di comandi.
Sarebbe la seconda volta che l'harness smaschera un difetto del verificatore
invece che del prodotto (la prima: `code.noPlaceholders`, 2026-08-27).

### Nota sulle chiamate perse

La run 2 ha perso **51 chiamate in blocco** per una caduta di rete (casi 127-177),
azzerando di fatto il flusso `gemini` (3 osservazioni su 30). I flussi `chat`,
`code`, `cowork` e `scaffold` erano integri, quindi il confronto principale ha
retto. Lezione: **contare le osservazioni per flusso prima di confrontare**, e
rilanciare il solo flusso colpito con `EVAL_FLOW=<flusso>`.

---

## Come registrare una run futura

1. `npm run eval` (oppure `EVAL_MULTI=1 npm run eval` per la modalità multi-flusso)
2. Copiare qui la tabella dei tassi, con commit, modello, modalità e data
3. Annotare il **delta** rispetto alla run precedente e la modifica che l'ha causato
4. Verificare le prove delle nuove violazioni in `eval/output/latest-*.md` **prima**
   di dichiararle reperti: un tasso basso può essere un difetto del checker, non
   del meta-prompt. È già successo (falso positivo su `code.noPlaceholders`,
   corretto il 2026-08-27).
