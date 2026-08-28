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

## Run 12 — 2026-08-28 · ⭐ baseline di riferimento (la prima pienamente valida)

**È la prima run in cui produzione e harness usano la stessa identica
configurazione.** Fino a L9 la produzione imponeva `temperature: 0.5` mentre
l'harness non la impostava: ogni numero precedente descriveva un sistema
leggermente diverso da quello spedito, e portava un asterisco. Da qui in poi no.

| | |
|---|---|
| Commit | `80d09e1` |
| Modello | `gemini-3.5-flash-lite` (fissato) |
| Modalità | flusso singolo · eseguita **a blocchi**, un flusso per volta |
| Corpus | 66 casi · K=3 · **198 osservazioni** · 960 controlli · **0 errori** |
| Esito | **949/960 superati (98,9%)** — baseline iniziale: 98,3% |

### Tassi per regola

| Flusso | Regola | Conformi | % |
|---|---|---|---|
| chat | tutte e 4 (incl. `chat.balanced`) | 42/42 | **100%** |
| code | tutte e 10 | 30/30 | **100%** |
| cowork | tutte e 4 | 24/24 | **100%** |
| systemUser | tutte e 3 | 54/54 | **100%** |
| gemini | `noSelfReference` · `headings` · `noUserQuestions` · `anon.intact` | 30/30 | 100% |
| gemini | `noGenericPhrases` | 29/30 | 97% |
| gemini | **`concreteCommands`** | 20/30 | **67%** ⚠ |
| scaffold | tutte e 3 | 18/18 | **100%** |

**28 combinazioni regola×flusso su 30 sono al 100%.**

### Confronto con lo stato precedente

| Metrica | Prima | Ora | |
|---|---|---|---|
| `chat.balanced` | 41/42 · 98% | **42/42 · 100%** | ⬆ |
| `code` — tutte e 10 | 100% | **100%** | = |
| `gemini.headings` | 100% | **100%** | = |
| `gemini.noGenericPhrases` | 100% | 29/30 · 97% | −1 oss. |
| `gemini.concreteCommands` | 21/30 · 70% | 20/30 · 67% | −1 oss. |

### Conclusione: L9 è confermato

**Rimuovere `temperature` non ha avuto effetti collaterali.** Le due variazioni
sono di **una singola osservazione su 30** — rumore, non segnale. Tutto il resto
ha tenuto, e `chat.balanced` è arrivato al 100%.

La raccomandazione di Google per la famiglia Gemini 3.x (*"we strongly recommend
keeping them at their default values"*) **vale anche sul nostro caso**, e in più
allinea la misura al sistema reale. Nessun motivo di tornare indietro.

### ✅ Chiusa il 2026-08-28 — era un difetto del CHECK (il terzo)

`gemini.concreteCommands` era al 67%. **Tutti e dieci i fallimenti erano falsi
positivi.** Il file "non conforme" conteneva:

```
## Build & Test Commands
- Build: cargo build --release
- Test: cargo test
- Lint: cargo clippy --all-targets --all-features -- -D warnings
```

Comandi concreti ed eseguibili — semplicemente **non racchiusi in backtick**, che
il check pretendeva. Ma la regola dice *"dai il comando concreto ed eseguibile
(es. `npm test`)"*: **i backtick sono nell'esempio, non nel requisito.** Il check
misurava la conformità a una regola mai scritta — lo stesso errore diagnosticato
in L3, commesso stavolta dal verificatore.

**Ri-valutato l'archivio della run 12 col check corretto: 30/30, 100%.** Nessuna
chiamata all'API: generazione e valutazione sono separate, quindi correggere il
valutatore e riapplicarlo alle generazioni archiviate è deterministico e gratuito.

**Nuovo totale della run 12: 959/960 — 99,9%.** Resta un solo fallimento
(`gemini.noGenericPhrases`, 29/30, una osservazione).

> ⚠️ **Conclusione da ritirare.** La sonda cross-modello (run 8) aveva concluso
> *"il problema è la regola, non il modello"*. **Era sbagliata anch'essa**: il
> problema era il **check**. Claude sembrava migliore (91% contro 79%) solo
> perché usa i backtick più spesso — non perché desse comandi migliori. Due
> analisi consecutive su questa metrica hanno accusato l'oggetto sbagliato prima
> che qualcuno leggesse il testo generato.

### Storico della metrica, ora chiusa

`gemini.concreteCommands` resta al **67%**, stabile fra le run (70% → 67%,
differenza di una osservazione). La sonda cross-modello ha già indicato che il
problema è **la regola, non il modello**: pretende comandi di build anche su
input che chiedono sole regole di stile.

**Prossimo passo**: rendere il check condizionale — comandi concreti richiesti
solo se il file dichiara una sezione di comandi. È una modifica allo **strumento
di misura**, quindi la baseline di questa metrica andrà ripresa da zero dopo il
cambio; tutte le altre restano valide.

### Nota operativa: eseguire a blocchi

Questa run è stata lanciata **un flusso per volta** (`EVAL_FLOW=<flusso>` in
sequenza) dopo che tre run intere erano andate perse: due per la sospensione
automatica del computer, che disattiva la scheda di rete. Ogni blocco dura 4-12
minuti e **scrive il proprio report appena finisce**, quindi un'interruzione
costa al massimo il segmento in corso. Stesso consumo di quota, molta più
robustezza. **È il modo raccomandato di eseguire una run completa.**

---

## Come registrare una run futura

1. Eseguire **a blocchi**, un flusso per volta (`EVAL_FLOW=<flusso>` in sequenza):
   ogni segmento dura 4-12 minuti e scrive il proprio report appena finisce, quindi
   un'interruzione costa al massimo il segmento in corso. Tre run intere sono
   andate perse prima di adottare questa abitudine.
2. Copiare qui la tabella dei tassi, con commit, modello, modalità e data
3. Annotare il **delta** rispetto alla run precedente e la modifica che l'ha causato
4. **Leggere il testo generato prima di dichiarare un reperto.** Non le
   percentuali: il testo. Un tasso basso è stato **tre volte su tre** un difetto
   del *verificatore*, non del prodotto:
   - `code.noPlaceholders` — segnalava i segnaposto **citati per vietarli**
   - `anon.intact` — il vecchio linter segnalava i segnaposto di anonimizzazione,
     che sono output **corretto**
   - `gemini.concreteCommands` — pretendeva i backtick, che la regola non chiede

   Il costo di leggere tre output è di due minuti. Il costo di non leggerli è
   "correggere" un meta-prompt sano, e nel caso di `concreteCommands` sono state
   **due analisi consecutive** ad accusare l'oggetto sbagliato — inclusa una sonda
   cross-modello da trenta chiamate.

5. **Verificare che il check corrisponda alla regola COME È SCRITTA**, non
   all'intenzione che gli attribuiamo. Se la regola dice *"comando concreto (es.
   `npm test`)"*, l'esempio non è il requisito: pretendere i backtick significa
   misurare una regola che non esiste. Se li vogliamo davvero, si scrivono nella
   regola — è la lezione di L3 applicata al verificatore.

6. **Controllare COME si distribuiscono le osservazioni mancanti**, non solo
   quante sono. Chiamate fallite, troncamenti e risposte fuori contratto non sono
   rumore uniforme: se si concentrano sui casi difficili, il tasso che resta è
   **gonfiato** e il confronto è invalido anche se i numeri sembrano sani. È già
   successo due volte — 51 chiamate perse in blocco su un solo flusso, e 7
   risposte fuori contratto tutte sui casi ostici. Quando accade, ricalcolare
   **sul sottoinsieme comune** invece di confrontare i totali.

7. **Un cambiamento al verificatore invalida la baseline della metrica toccata**,
   non delle altre. Registrarlo esplicitamente: con lo strumento nuovo il numero
   vecchio non è più confrontabile. Se serve il nuovo valore subito, **ri-valutare
   gli output archiviati** in `eval/output/` invece di rigenerarli: generazione e
   valutazione sono separate, quindi correggere il check e riapplicarlo
   all'archivio è deterministico e **non consuma quota**.
