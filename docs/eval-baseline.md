# Baseline di conformità dei meta-prompt

Registro delle esecuzioni di `npm run eval`. **È l'unica parte dell'output che
va versionata**: i report completi in `eval/output/` pesano ~220 KB a run, sono
riproducibili rilanciando l'harness, e restano gitignorati. I *tassi misurati in
una certa data con un certo codice*, invece, non sono riproducibili — e stanno in
venti righe.

> ## ✅ Decisione presa il 2026-08-30 — i 4 interpretativi sono SEPARATI
>
> Il congelamento è sciolto. I quattro check che richiedono giudizio —
> `gemini.concreteCommands`, `gemini.noGenericPhrases`, `*.noUserQuestions`,
> `sysusr.noDuplication` — **restano attivi ma sono riportati a parte** e **non
> entrano nel tasso di conformità**.
>
> | | Strutturali (20) | Interpretativi (4) |
> |---|---|---|
> | Falsi positivi prodotti | **0** | **3 su 3** |
> | Oscillazione a configurazione identica | **0 osservazioni** | fino a **4 su 30** |
>
> Non cancellati: `concreteCommands` al 70% è ciò che ha smascherato un difetto
> vero della regola 4 di `FLOW_GEMINI`. Non tenuti alla pari: mediare una misura
> che non si muove mai con una che balla di quattro punti produce un numero che
> non descrive nessuna delle due.
>
> **Da qui in avanti**: il totale di testa è la *conformità strutturale*. Uno
> scostamento di poche osservazioni fra gli indicatori **non è una regressione**.
>
> ---
>
> ## 🔒 (storico) Il verificatore era CONGELATO — decisione del 2026-08-29
>
> Nessuna modifica ai check finché non sono chiusi i punti ancora aperti
> dell'audit (L4, L5, L10). **Non si cambia il metro mentre si misura**: con uno
> strumento diverso il delta di una correzione diventerebbe indistinguibile dal
> delta dello strumento.
>
> **Riferimento congelato**: run 12 ri-valutata, commit `11f7b00` —
> **959/960, 99,9%**, unico fallimento `gemini.noGenericPhrases` (29/30).
>
> Alla fine dei lavori va deciso **se tenere il verificatore, e in che forma**.
> La questione è aperta e ha argomenti seri da entrambe le parti: ha trovato tre
> difetti reali che mesi di riletture non avevano visto, ma ha anche prodotto
> tre falsi positivi — **tutti dai 4 check "interpretativi"** (`concreteCommands`,
> `noGenericPhrases`, `noUserQuestions`, `noDuplication`), che violano il criterio
> dichiarato di questo strumento: *solo regole decidibili da un parser*. I 12
> check strutturali non ne hanno mai prodotto uno. E va considerato che, al 99,9%,
> il potere informativo residuo è ormai scarso: da qui in avanti è una rete di
> regressione, non uno strumento di scoperta.

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

## Run 13 — 2026-08-29 · verifica di L5 (segnaposto unificati)

| | |
|---|---|
| Commit misurato | `1d73162` |
| Modello | `gemini-3.5-flash-lite` (fissato) |
| Impronta | `gemini-3.5-flash-lite\|reps=3\|multi=0\|prompts=d46d184679ef` |
| Modalità | flusso singolo · a blocchi · **con ripresa da checkpoint** |
| Corpus | 66 casi · K=3 · **191 osservazioni** · 939 controlli |
| Esito | **938/939 superati (99,9%)** |

**Cosa è cambiato rispetto alla run 12**: il meta-prompt comune ha un vincolo in
più — i dati variabili vanno resi come segnaposto `{{...}}`. È l'unica modifica.

### Tassi per regola

| Flusso | Regola | Conformi | % |
|---|---|---|---|
| chat | tutte e 4 | 42/42 | **100%** |
| code | tutte e 10 | 30/30 | **100%** |
| cowork | tutte e 4 | 24/24 | **100%** |
| systemUser | tutte e 3 | 47/47 | **100%** |
| gemini | 5 su 6 | 30/30 | **100%** |
| gemini | `concreteCommands` | 29/30 | 97% |
| scaffold | tutte e 3 | 18/18 | **100%** |

**29 combinazioni regola×flusso su 30 sono al 100%. Zero regressioni.**

`systemUser` conta 47 osservazioni invece di 54: sette chiamate hanno ricevuto
**500/503 dal server di Google**, non un rifiuto di quota. Da qui l'aggiunta del
ritento sui transitori (vedi sotto).

### L'adozione dei segnaposto, misurata

La domanda vera di L5 non era "ci sono regressioni" ma "il modello applica il
vincolo, e lo applica **dove serve**". La distribuzione risponde da sola:

| Flusso | Con `{{...}}` | Perché ha senso |
|---|---|---|
| systemUser | 46/47 · **98%** | è la definizione stessa del formato: il campo User *è* il dato variabile |
| cowork | 18/24 · 75% | task su documenti e codice forniti dall'utente |
| chat | 16/42 · 38% | metà dei casi sono domande generiche, senza dati |
| gemini | 4/30 · 13% | file di istruzioni: quasi mai contengono dati |
| code | 3/30 · 10% | idem |
| scaffold | 0/18 · **0%** | istruzioni di progetto pure |
| **totale** | **87/191 · 46%** | |

Il gradiente da 98% a 0% segue la **presenza reale di dati variabili**, non un
riflesso meccanico. La clausola "se non ce ne sono, non inventarne" funziona.

### 🔴 Reperto nuovo: il meta-prompt trapela nell'output

**3 osservazioni su 191 (1,6%)** contengono non un segnaposto, ma **la regola che
lo introduce**, riscritta come direttiva da consegnare all'utente finale:

> `- Usa la sintassi {{NOME_DESCRITTIVO}} per qualsiasi dato variabile che cambia ad ogni esecuzione.`
> — `sysusr-tabella-piu-elenco`

> `Usa segnaposto nella forma {{NOME_DESCRITTIVO}} per i dati variabili e mantieni
> rigorosamente inalterati eventuali segnaposto di anonimizzazione come [EMAIL_X] o [TELEFONO_X].`
> — `sysusr-solo-json`

Il secondo caso è quello istruttivo: **trapela anche il vincolo di
anonimizzazione**, che esiste da mesi. Il difetto non è quindi il token
`{{NOME_DESCRITTIVO}}` scelto male — è che i blocchi "Vincolo comune a tutti i
flussi" possono essere riemessi come contenuto, chiunque sia il vincolo.

Causa radice: istruzioni e input arrivano al modello come **due parti dello
stesso turno** (`sendMessage([systemInstruction, input])`), quindi nulla nella
struttura distingue ciò che va eseguito da ciò che va consegnato. Si chiude con
**L4**, non ritoccando un esempio. Nessun check lo intercetta oggi.

### Modifiche all'harness (misuratore, non misurato)

Non alterano l'impronta e non invalidano nessuna baseline.

- **Ripresa da checkpoint**: il parziale viene riletto all'avvio e le
  osservazioni già acquisite sono saltate. Nasce dopo **sei interruzioni** del
  processo in background nella stessa giornata, tutte senza errori applicativi e
  senza causa individuabile dall'interno. Un'interruzione ora costa **una**
  chiamata invece dell'intero blocco.
- **Impronta della configurazione**: la ripresa avviene solo a parità di
  backend, modello, ripetizioni e **hash SHA-256 del testo dei meta-prompt**.
  Modificare un `FLOW_*` a metà blocco e riprendere fonderebbe due prompt diversi
  in un solo report, senza alcun segnale. Ora il checkpoint viene rifiutato.
- **Ritento sui transitori**: 500/502/503/504 vengono ritentati due volte con
  attesa crescente; il **429 no**, deliberatamente — dentro una run significa
  "non oggi", e insistere brucia il budget di pacing senza mai riuscire.
- **Checkpoint conservato se restano buchi**: arrivare all'ultimo caso non
  equivale a essere completi. Con fallimenti residui il checkpoint sopravvive,
  così un rilancio riempie solo le lacune.
- **Pre-flight sulla quota**: registro locale (`_quota-<data>.json`) confrontato
  con `EVAL_DAILY_CAP` (500), uscita con codice 2 se il fabbisogno eccede,
  scavalcabile con `EVAL_IGNORE_QUOTA=1`. **È un conteggio locale, non una
  lettura di Google**: l'SDK non espone le richieste residue, e le chiamate fatte
  dall'app desktop non sono visibili qui — il numero è una stima per difetto. Il
  dato autoritativo si legge in Google AI Studio.

---

## Run 14 — 2026-08-29 · verifica di L4 (separazione dei ruoli)

| | |
|---|---|
| Commit misurato | `7ba0c21` |
| Modello | `gemini-3.5-flash-lite` (fissato) |
| Impronta | `gemini-3.5-flash-lite\|reps=3\|multi=0\|prompts=ec91bc1de1c3` |
| Corpus | 66 casi · K=3 · **198 osservazioni** · 960 controlli |
| Esito | **955/960 superati (99,5%)** |

**Cosa è cambiato**: le istruzioni viaggiano nel campo nativo `systemInstruction`
invece che come parte del turno utente, e l'input è delimitato da
`<prompt_utente>`, con le istruzioni che dichiarano cosa significa il
delimitatore. È l'unica modifica rispetto alla run 13.

### Tassi per regola

| Flusso | Regola | Conformi | % |
|---|---|---|---|
| chat | tutte e 4 | 42/42 | **100%** |
| code | tutte e 10 | 30/30 | **100%** |
| cowork | `cowork.spacing` | 23/24 | 96% |
| cowork | `tags` · `balanced` · `anon.intact` | 24/24 | 100% |
| systemUser | tutte e 3 | 54/54 | **100%** |
| gemini | **`noGenericPhrases`** | 26/30 | **87%** ⚠ |
| gemini | le altre 5 (incl. `concreteCommands`) | 30/30 | 100% |
| scaffold | tutte e 3 | 18/18 | **100%** |

### Confronto con la run 13

| Regola | Run 13 | Run 14 | |
|---|---|---|---|
| `gemini.concreteCommands` | 29/30 · 97% | **30/30 · 100%** | ⬆ |
| `cowork.spacing` | 24/24 · 100% | 23/24 · 96% | ⬇ −1 |
| **`gemini.noGenericPhrases`** | 30/30 · 100% | **26/30 · 87%** | ⬇ **−4** |
| le altre 27 | 100% | 100% | = |

### ✅ L'obiettivo di L4 è centrato

| Indicatore | Run 13 | Run 14 |
|---|---|---|
| Fughe del meta-prompt nell'output | 3 su 191 (1,6%) | **0 su 198** |
| Tag `<prompt_utente>` trapelato nel prodotto | — | **0 su 198** |

Nessuna osservazione riemette le regole ricevute. Il delimitatore, elemento nuovo
presente in ogni richiesta, non compare mai nell'output: il modello lo tratta
come struttura, non come contenuto — la separazione è stata capita, non solo
ricevuta.

### Adozione dei segnaposto — tiene

Indicatore diagnostico, **non una metrica di qualità**: il valore atteso è alto
dove il flusso comporta dati variabili e nullo dove non ce ne sono.

| Flusso | Run 13 | Run 14 |
|---|---|---|
| systemUser | 98% | 98% |
| cowork | 75% | 79% |
| chat | 38% | 50% |
| gemini | 13% | 3% |
| code | 10% | 7% |
| scaffold | 0% | 0% |

Spostare le istruzioni nel canale di sistema **non ne ha indebolito la presa**,
che era il rischio dichiarato prima della run.

### ⚠️ Aperto: `gemini.noGenericPhrases` a 87%

Quattro osservazioni perse su trenta, distribuite su **quattro casi diversi**
(`gemini-python-uv`, `gemini-web-generico`, `gemini-non-rompere-test`,
`gemini-commit-docs`), una ripetizione ciascuno — non un caso che sbanda tre
volte. Un movimento diffuso somiglia più a uno spostamento sistematico che a un
valore anomalo.

Esempio: `Esegui i test con il comando concreto del progetto, ad esempio:
npm test (assumo npm; sostituisci se il progetto usa un altro gestore)`. Il
modello si cautela invece di decidere.

Ipotesi non verificata: dichiarando che il testo dell'utente è *materiale e non
istruzioni*, gli si toglie parte dell'autorità con cui prima ne assumeva i
dettagli — l'ombra della stessa modifica che ha eliminato le fughe. Si falsifica
ripetendo il solo blocco `gemini` (30 chiamate), non ragionandoci.

### Nota operativa: le chiavi API

Un pomeriggio perso su un difetto di **osservabilità**, non di logica:
`loadApiKey()` preferisce `process.env.GEMINI_API_KEY` al file `.env.local` — che
è la precedenza giusta — ma lo faceva **in silenzio**. Una variabile d'ambiente
permanente a livello utente Windows ombreggiava il file, quindi rinominare
`.env.local` per cambiare account non cambiava nulla e ogni run continuava a
spendere lo stesso budget, fino al 429 a quota combinata ~500.

Ora la prima riga di ogni run stampa `Chiave: <digest> · da <fonte>`, e quel
digest è lo stesso che nomina il file del registro quota: le due cose sono
confrontabili a colpo d'occhio. La chiave in chiaro non viene mai stampata né
scritta.

---

## Run 16 — 2026-08-30 · verifica di L10 (spiegazione ancorata) · ⭐ chiude l'audit

| | |
|---|---|
| Commit misurato | `cf2ec18` |
| Modello | `gemini-3.5-flash-lite` (fissato) |
| Corpus | 66 casi · K=3 · **198 osservazioni** · 1320 controlli · **0 errori** |
| Esito | **1317/1320 superati (99,8%)** |

Prima run completata **al primo tentativo**, senza interruzioni: la catena dei sei
blocchi è andata in fondo da sola.

**Cosa è cambiato**: il campo `spiegazione` da prosa libera a lista di migliorie
ancorate (`regola`, `dove` verbatim, `cosa`), più due check nuovi. I controlli per
osservazione salgono da ~5 a ~6-12, quindi il **totale** non è confrontabile con
le run precedenti: si confrontano le singole regole.

### Tassi per regola

| Flusso | Regola | Conformi | % |
|---|---|---|---|
| chat | tutte e 4 + `spiegazione.present` + `grounded` | 42/42 | **100%** |
| code | **`code.contextFirst`** | 29/30 | 97% |
| code | **`spiegazione.grounded`** | 29/30 | 97% |
| code | le altre 10 | 30/30 | 100% |
| cowork | tutte e 4 + le due di spiegazione | 24/24 | **100%** |
| systemUser | tutte e 3 + le due di spiegazione | 54/54 | **100%** |
| gemini | **`noGenericPhrases`** | 29/30 | 97% |
| gemini | le altre 5 + le due di spiegazione | 30/30 | **100%** |
| scaffold | tutte e 3 | 18/18 | **100%** |

### ✅ Le citazioni sono ancorate: 179 su 180

`spiegazione.grounded` — **99,4%**. Un solo fallimento in tutta la run, e non è
un'invenzione:

| | |
|---|---|
| Input (`code-genera-docs`) | *"…dai docstring del modulo **services/** e salvala in **docs/api.md**."* |
| Citato | `"services/ e docs/api.md"` |

Il modello ha **fuso due frammenti veri** in una stringa che nel prompt non
esisteva. Entrambi i pezzi ci sono; quella sequenza no.

**Previsione sbagliata, registrata come tale**: prima della run avevo scritto di
aspettarmi parafrasi diffuse e un tasso mediocre. Il modello copia verbatim 179
volte su 180.

### ⚠️ Cosa questo numero NON dice

`grounded` verifica che la citazione **esista**, non che sia **pertinente**. Un
modello che citasse sempre la prima frase del prompt otterrebbe comunque il 100%.
Il check chiude la porta alla fabbricazione, non alla banalità.

L'affermazione difendibile è quindi: *il modello non inventa punti*. Se le
migliorie dichiarate siano davvero quelle applicate è fuori dalla portata di un
parser, e ricadrebbe fra i check interpretativi — quelli che oscillano.

### Gli altri due scarti

- `gemini.noGenericPhrases` 29/30: dentro la banda di rumore misurata il
  2026-08-30 (26-30 su configurazioni identiche). **Non interpretabile.**
- `code.contextFirst` 29/30: era stabile al 100%. Una sola osservazione su una
  regola strutturale — da riguardare alla prossima run, non da correggere ora.

### Stato dell'audit

**Tutti e dieci i punti sono chiusi**: L1 · L2 · L3 · L4 · L5 · L6 · L7 · L8 ·
L9 · L10.

### 🔲 La misura che manca ancora

La modalità **multi-flusso** (`EVAL_MULTI=1`) — cinque formati richiesti in
**una sola chiamata**, che è ciò che accade quando l'utente spunta più caselle —
è stata misurata **una volta sola, il 2026-08-27**, su un solo flusso e con i
meta-prompt di allora: prima della riscrittura L3, prima di L4, L5, L9 e L10.
Quel dato è obsoleto.

È l'unico caso d'uso reale che non abbiamo mai verificato sul codice attuale, ed
è anche quello più esposto al troncamento (`TruncatedResponseError` esiste
proprio per questo). Le run 1-16 misurano tutte il **caso migliore**: un formato
per chiamata.

---

## Come registrare una run futura

1. Eseguire **a blocchi**, un flusso per volta (`EVAL_FLOW=<flusso>` in sequenza).
   Resta la forma consigliata, ma il motivo è cambiato: non più la fragilità —
   dalla run 14 l'harness **riprende dal checkpoint**, quindi un'interruzione
   costa una chiamata, non un blocco — bensì la leggibilità, perché ogni segmento
   scrive il proprio report appena finisce. Se una run viene interrotta, basta
   rilanciare lo stesso comando: le osservazioni già acquisite non si rifanno.
2. **Controllare la prima riga**: `Chiave: <digest> · da <fonte>`. Una variabile
   d'ambiente ombreggia `.env.local` in silenzio, e il digest è l'unico modo di
   sapere quale budget si sta spendendo. Deve corrispondere al file
   `eval/output/_quota-<data>-<digest>.json`.
3. Copiare qui la tabella dei tassi, con commit, modello, modalità e data
4. Annotare il **delta** rispetto alla run precedente e la modifica che l'ha causato
5. **Leggere il testo generato prima di dichiarare un reperto.** Non le
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

6. **Verificare che il check corrisponda alla regola COME È SCRITTA**, non
   all'intenzione che gli attribuiamo. Se la regola dice *"comando concreto (es.
   `npm test`)"*, l'esempio non è il requisito: pretendere i backtick significa
   misurare una regola che non esiste. Se li vogliamo davvero, si scrivono nella
   regola — è la lezione di L3 applicata al verificatore.

7. **Controllare COME si distribuiscono le osservazioni mancanti**, non solo
   quante sono. Chiamate fallite, troncamenti e risposte fuori contratto non sono
   rumore uniforme: se si concentrano sui casi difficili, il tasso che resta è
   **gonfiato** e il confronto è invalido anche se i numeri sembrano sani. È già
   successo due volte — 51 chiamate perse in blocco su un solo flusso, e 7
   risposte fuori contratto tutte sui casi ostici. Quando accade, ricalcolare
   **sul sottoinsieme comune** invece di confrontare i totali.

8. **Un cambiamento al verificatore invalida la baseline della metrica toccata**,
   non delle altre. Registrarlo esplicitamente: con lo strumento nuovo il numero
   vecchio non è più confrontabile. Se serve il nuovo valore subito, **ri-valutare
   gli output archiviati** in `eval/output/` invece di rigenerarli: generazione e
   valutazione sono separate, quindi correggere il check e riapplicarlo
   all'archivio è deterministico e **non consuma quota**.
