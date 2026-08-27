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

## Come registrare una run futura

1. `npm run eval` (oppure `EVAL_MULTI=1 npm run eval` per la modalità multi-flusso)
2. Copiare qui la tabella dei tassi, con commit, modello, modalità e data
3. Annotare il **delta** rispetto alla run precedente e la modifica che l'ha causato
4. Verificare le prove delle nuove violazioni in `eval/output/latest-*.md` **prima**
   di dichiararle reperti: un tasso basso può essere un difetto del checker, non
   del meta-prompt. È già successo (falso positivo su `code.noPlaceholders`,
   corretto il 2026-08-27).
