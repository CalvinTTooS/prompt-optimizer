# Istruzioni di allineamento — verificatore di conformità (v1.2.0)

> **Per l'agente**: questo documento descrive **esattamente** le modifiche già
> applicate nell'edizione pubblica `prompt-optimizer`. Devi **replicarle alla
> lettera** in questo repo. **Non improvvisare, non aggiungere migliorie, non
> riformulare i testi**: ogni blocco va inserito **verbatim**.
>
> **Regola d'oro**: se un passo non corrisponde a ciò che trovi nel repo,
> **fermati e segnala** invece di adattare a modo tuo.

---

## 0. Contesto e stato di partenza

**Cosa introduce questa modifica.** Un **verificatore di conformità**: controlla
che il prompt *generato* rispetti le regole che il suo stesso formato dichiara in
`app/constants/prompts.ts`. Sostituisce il vecchio `promptLinter`, che applicava
**3 regole generiche** identiche a tutti e cinque i formati mentre i flussi ne
dichiarano una quarantina, e che **contraddiceva** i flussi in due punti.

Serve **due consumatori** con lo stesso codice:
- **in-app**: un badge sotto ogni variante, con l'elenco delle regole e le prove;
- **offline**: l'harness `npm run eval`, che misura il tasso di conformità dei
  nostri meta-prompt su un corpus fisso di casi.

**Ambito, deliberatamente stretto**: ogni controllo è **decidibile da un parser**.
Le regole che richiedono giudizio non sono verificate affatto — un controllo
approssimativo produce falsi positivi, che è il difetto che rendeva inaffidabile
il linter precedente.

**Stato di partenza atteso** (verificalo prima di iniziare):
- `app/lib/promptLinter.ts` e `app/lib/promptLinter.test.ts` **esistono**
- `app/components/ResultViewer.tsx` importa `lintPrompt` e usa `LintBadge`
- `app/lib/i18n/*.ts` (9 file) contengono le 4 chiavi `result.lintOk`,
  `result.lintIssueOne`, `result.lintIssueOther`, `result.lintDetail`
- `eval/run-eval.ts` e `eval/prompts.ts` esistono
- `app/lib/conformance.ts` **non** esiste
- `package.json` non ha lo script `eval`
- versione **1.1.1**

Se lo stato non corrisponde, **fermati e segnala**.

**Prima di iniziare**: working tree pulito e Gate verde (`npm run lint && npm test`).

---

## 1. Copia i file nuovi dal pacchetto

Questo documento arriva insieme a una cartella **`file-da-copiare/`** che
contiene tutti i file da copiare verbatim, con la stessa struttura di cartelle
del progetto. Il pacchetto è **autonomo**: non serve accedere al repo pubblico.

| Nel pacchetto | Destinazione nel repo |
|---|---|
| `file-da-copiare/app/lib/conformance.ts` | `app/lib/conformance.ts` |
| `file-da-copiare/app/lib/conformance.test.ts` | `app/lib/conformance.test.ts` |
| `file-da-copiare/eval/prompts.ts` | `eval/prompts.ts` (**sovrascrive** il corpus esistente) |

Gli altri file del pacchetto servono ai passi successivi:
`eval/run-eval.ts` (passo 5), `app/constants/prompts.ts` (passo 12-quater),
`docs/eval-baseline.md` (passo 12-ter, **da svuotare dei dati**).

⚠️ **Normalizza i fine-riga a LF** dopo la copia se il repo di destinazione usa
LF: i file del pacchetto potrebbero arrivare con CRLF.

⚠️ Se un file del pacchetto manca, **fermati e segnala**: non riscriverlo a
memoria.

**Verifica**: `npx vitest run app/lib/conformance.test.ts` → **41 test verdi**.

> **Nota sull'anonimizzazione** (regola trasversale, presente in tutti i formati):
> il check `anon.intact` verifica il `VINCOLO UNIVERSALE` del meta-prompt — *"NON
> modificare mai i segnaposto di anonimizzazione"*. La logica è **inversa** a
> quella che verrebbe istintiva: un segnaposto **ben formato** (`[EMAIL_1]`,
> `[TELEFONO_2]`, `[CARTA_1]`, `[CCV_1]`, `[MANUALE_3]`) è **output corretto** e
> non va **mai** segnalato — il vecchio linter lo faceva, ed era un difetto.
> Viene segnalata solo la **corruzione** (`[EMAIL 1]`, `[Email_1]`, `[EMAIL_]`),
> che rende il valore reale irrecuperabile e rompe silenziosamente la promessa di
> privacy. La forma generica `[EMAIL_X]` è ammessa perché la usa il meta-prompt
> stesso, e un prompt generato può legittimamente riprenderla.

---

## 2. `app/lib/promptOptimizer.ts` — estrai il meta-prompt

**Motivo**: la copia del `systemInstruction` dentro `eval/run-eval.ts` era
hand-copiata e **aveva già divergito** (mancava il vincolo di formattazione),
quindi l'harness misurava un prompt mai spedito. Con una fonte unica il drift
diventa impossibile per costruzione.

**Inserisci** questa funzione **subito prima** di `export class TruncatedResponseError`:

```typescript
/**
 * Builds the meta-prompt sent to Gemini, given the per-flow instruction blocks.
 *
 * Lives here rather than inline in the hook so that production and the offline
 * eval harness share ONE definition: a hand-copied mirror had already drifted
 * (the harness was missing the formatting constraint), which meant the harness
 * measured a prompt we never actually shipped.
 */
export function buildOptimizerSystemInstruction(tasks: string[]): string {
  return `Sei un esperto Prompt Engineer. Devi generare versioni ottimizzate dello stesso prompt in base ai flussi richiesti.

      Esegui ESATTAMENTE i flussi di lavoro specificati qui sotto:
      ${tasks.join('\n')}

      VINCOLO UNIVERSALE: NON modificare mai i segnaposto di anonimizzazione come [EMAIL_X], [TELEFONO_X].
      VINCOLO DI FORMATTAZIONE (leggibilità): nei prompt generati che usano tag (es. <role>, <context>, <output_format>), separa ogni tag/sezione di primo livello con UNA RIGA VUOTA e non concatenare i tag sulla stessa riga; nei formati Markdown, separa le sezioni con una riga vuota.

      Nel campo "spiegazione" fornisci una breve spiegazione delle migliorie apportate in base ai formati richiesti.`;
}
```

⚠️ Il testo dentro il template literal va copiato **carattere per carattere**,
inclusa l'indentazione a 6 spazi: è il prompt reale che viene spedito.

---

## 3. `app/hooks/usePromptOptimizer.ts` — usa la funzione estratta

**3a.** Nell'import da `../lib/promptOptimizer`, aggiungi
`buildOptimizerSystemInstruction`. L'import diventa:

```typescript
import {
  buildResponseSchema,
  buildOptimizerSystemInstruction,
  parseOptimizerResponse,
  type OptimizerResult,
} from '../lib/promptOptimizer';
```

**3b.** Sostituisci l'intero blocco che costruisce il prompt — dalla riga
`let systemInstruction = \`Sei un esperto Prompt Engineer...` fino alla riga che
termina con `...in base ai formati richiesti.\`;` — con **una sola riga**:

```typescript
      let systemInstruction = buildOptimizerSystemInstruction(tasks);
```

⚠️ Mantieni `let` (non `const`): la variabile viene riassegnata subito dopo
dall'anonimizzazione.

---

## 4. `app/hooks/usePromptOptimizer.test.ts` — mock parziale

Il mock sostituisce l'intero modulo e non espone la nuova funzione: **10 test
falliranno** se salti questo passo.

Sostituisci la riga:

```typescript
vi.mock('../lib/promptOptimizer', () => ({ buildResponseSchema, parseOptimizerResponse }));
```

con:

```typescript
// Partial mock: only the two functions this suite spies on are replaced.
// buildOptimizerSystemInstruction stays REAL so the assertions below verify the
// meta-prompt actually shipped, not a stand-in that could drift from it.
vi.mock('../lib/promptOptimizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/promptOptimizer')>()),
  buildResponseSchema,
  parseOptimizerResponse,
}));
```

---

## 5. `eval/run-eval.ts` — copia dall'edizione pubblica

Sostituisci **l'intero file** con quello di
`C:\GitHubRepo\Projects\Prompt optimizer\eval\run-eval.ts`.

Cosa cambia rispetto al precedente:
- modello **fissato** a `gemini-3.5-flash-lite` (prima `gemini-flash-latest`, un
  **alias mobile** che invalida silenziosamente i confronti storici);
- **K=3 ripetizioni** per caso (Gemini non è deterministico: con K=1 si misura rumore);
- esegue il **verificatore** su ogni prompt generato e riporta il **tasso di
  conformità per regola**, con le prove delle violazioni;
- importa `buildOptimizerSystemInstruction` invece della copia divergente.

---

## 6. `package.json` — script `eval`

Aggiungi, subito dopo la riga dello script `sync:standards` (o dopo
`generate:scaffold` se `sync:standards` non esiste in questo repo):

```json
    "eval": "tsx eval/run-eval.ts",
```

---

## 7. `app/lib/i18n/*.ts` — sostituisci 4 chiavi con 2, in tutte e 9 le lingue

In **ognuno** dei 9 file (`it, en, es, fr, de, pt, ja, zh, zh-Hant`), rimuovi le
quattro righe contigue `result.lintOk`, `result.lintIssueOne`,
`result.lintIssueOther`, `result.lintDetail` e inseriscine due al loro posto:

| Lingua | `result.conformance` | `result.conformanceDetail` |
|---|---|---|
| it | `'{passed}/{total} regole del formato rispettate'` | `'Dettaglio regole'` |
| en | `'{passed}/{total} format rules satisfied'` | `'Rule detail'` |
| es | `'{passed}/{total} reglas del formato cumplidas'` | `'Detalle de reglas'` |
| fr | `'{passed}/{total} règles du format respectées'` | `'Détail des règles'` |
| de | `'{passed}/{total} Formatregeln erfüllt'` | `'Regeldetails'` |
| pt | `'{passed}/{total} regras do formato cumpridas'` | `'Detalhe das regras'` |
| ja | `'書式ルール {passed}/{total} 準拠'` | `'ルールの詳細'` |
| zh | `'符合 {passed}/{total} 项格式规则'` | `'规则详情'` |
| zh-Hant | `'符合 {passed}/{total} 項格式規則'` | `'規則詳情'` |

Formato di ciascuna riga: `  'result.conformance': <valore>,`

---

## 8. `app/components/ResultViewer.tsx` — cinque modifiche

**8a. Import.** Sostituisci

```typescript
import { lintPrompt, type LintResult } from '../lib/promptLinter';
```

con

```typescript
import {
  checkChat,
  checkCowork,
  checkCode,
  checkGemini,
  checkSystemUser,
  type ConformanceResult,
} from '../lib/conformance';
```

**8b. Componente.** Sostituisci **l'intera funzione `LintBadge`** con:

```tsx
// Reports how many of the rules THIS format declares are actually satisfied by
// the generated prompt. Deliberately narrow: it says nothing about whether the
// prompt is good, only whether it obeys the best practices we claim to apply.
// Rule labels stay Italian, mirroring the FLOW_* rules they check in
// app/constants/prompts.ts (translating them is a separate, optional task).
function ConformanceBadge({ result }: { result: ConformanceResult }) {
  const { t } = useT();
  const failed = result.total - result.passed;
  return (
    <div className="mt-1 text-xs">
      <span className={failed === 0 ? 'text-green-500' : 'text-amber-500'}>
        {failed === 0 ? '✓' : '⚠'} {t('result.conformance', { passed: result.passed, total: result.total })}
      </span>
      <details className="text-gray-400 mt-0.5">
        <summary className="cursor-pointer">{t('result.conformanceDetail')}</summary>
        <ul className="mt-1 space-y-0.5">
          {result.checks.map((c) => (
            <li key={c.id} className={c.passed ? '' : 'text-amber-400'}>
              {c.passed ? '✓' : '⚠'} {c.label}
              {c.evidence && <span className="text-gray-500"> — {c.evidence}</span>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

**8c. `PairControlsProps`.** Sostituisci `lintResult: LintResult;` con
`conformance: ConformanceResult;`.

**8d. `PairControls`.** Nella firma, sostituisci `lintResult` con `conformance`.
Poi **sposta il badge**: rimuovi `<LintBadge result={lintResult} />` da **sopra**
i pulsanti e aggiungi `<ConformanceBadge result={conformance} />` come **ultimo
elemento** prima della chiusura `</div>` della funzione. *(Motivo: nelle altre
varianti il badge sta sotto i pulsanti; così la posizione è uniforme.)*

**8e. I cinque punti di chiamata.** Sostituzioni una a una:

| Da | A |
|---|---|
| `<LintBadge result={lintPrompt(shownText('promptChat', result.promptChat))} />` | `<ConformanceBadge result={checkChat(shownText('promptChat', result.promptChat))} />` |
| `<LintBadge result={lintPrompt(shownText('promptCowork', result.promptCowork))} />` | `<ConformanceBadge result={checkCowork(shownText('promptCowork', result.promptCowork))} />` |
| `<LintBadge result={lintPrompt(shownText('promptCode', result.promptCode))} />` | `<ConformanceBadge result={checkCode(shownText('promptCode', result.promptCode))} />` |
| `<LintBadge result={lintPrompt(shownText('promptGemini', result.promptGemini))} />` | `<ConformanceBadge result={checkGemini(shownText('promptGemini', result.promptGemini))} />` |
| `lintResult={lintPrompt(\`${shownSystem()}\n\n${shownUser()}\`)}` | `conformance={checkSystemUser(shownSystem(), shownUser())}` |

⚠️ Il verificatore gira su `shownText(...)`, cioè **ciò che l'utente vede**
(quindi la versione rifinita, se ha usato "Rifinisci"). È voluto: si verifica
l'artefatto consegnato, non un intermedio.

---

## 9. Rimuovi il vecchio linter

Ora è orfano; la regola d'igiene vieta il codice morto:

```
app/lib/promptLinter.ts
app/lib/promptLinter.test.ts
```

**Verifica**: una ricerca di `promptLinter`, `lintPrompt`, `LintBadge`,
`result.lint` in `app/` ed `eval/` non deve restituire **nulla**.

---

## 10. Bump di versione 1.1.1 → 1.2.0

È una **feature** (+MINOR). Tre file allineati:

1. `package.json` → `"version": "1.2.0"`
2. `src-tauri/Cargo.toml` → sezione `[package]`, `version = "1.2.0"`
3. `src-tauri/Cargo.lock` → l'entry **immediatamente sotto** `name = "app"`

⚠️ In `Cargo.lock` esistono altri pacchetti a `1.1.1`/`1.0.0`: modifica **solo**
quello sotto `name = "app"`.

Aggiungi anche la voce in `CHANGELOG.md` (se il repo ne ha uno).

---

## 11. Gate e verifiche

```bash
npm run lint
npm test
npx tsc --noEmit
```

Attesi: lint pulito · **tutti i test verdi** (il conteggio sale di ~33 dai nuovi
test e scende di ~7 per il linter rimosso) · typecheck pulito.

**Verifica funzionale dell'harness senza spendere quota**, una sola chiamata:

```bash
EVAL_ONLY=code-genera-docs EVAL_REPS=1 EVAL_SLEEP_MS=0 npx tsx eval/run-eval.ts
```

Deve stampare una tabella di conformità per il flusso `code` e scrivere
`eval/output/latest.md`. Richiede `GEMINI_API_KEY` in `.env.local`.

---

## 12. Commit

Su `master` (branch di questo repo), **senza push**:

```
feat(conformance): verificatore per formato + harness di regressione sui prompt

- Nuovo app/lib/conformance.ts: un checker per formato (chat, cowork, code,
  system+user, gemini, scaffold) che verifica SOLO regole decidibili da un
  parser. Sostituisce promptLinter, che applicava 3 regole generiche a tutti i
  formati e contraddiceva i flussi su follow-up e segnaposto.
- eval/: corpus portato a 66 casi (da 20), pesati sul numero di regole per
  flusso; run-eval.ts diventa un misuratore, con modello fissato
  gemini-3.5-flash-lite, K=3 ripetizioni e tasso di conformità per regola.
- promptOptimizer.ts: estratto buildOptimizerSystemInstruction, condiviso da
  produzione e harness — la copia nell'harness era già divergente.
- ResultViewer: badge di conformità per variante, posizione uniforme, con le
  prove delle violazioni; i18n aggiornata in 9 lingue.
- Rimosso app/lib/promptLinter.ts (orfano).
- Bump 1.1.1 -> 1.2.0.
```

**NON** fare `git push` né creare release/tag senza conferma esplicita dell'utente.

---

## 12-bis. Modalità multi-flusso dell'harness

Già inclusa se hai copiato `eval/run-eval.ts` al passo 5. Serve a misurare il
costo del batching: la run di default esegue **un formato per chiamata** (il caso
migliore), mentre la produzione ne genera fino a cinque insieme.

```bash
npm run eval                 # un formato per chiamata
EVAL_MULTI=1 npm run eval    # cinque formati in una chiamata, come la produzione
```

I due report finiscono in file distinti (`latest-single.md` / `latest-multi.md`):
confonderli invaliderebbe il confronto.

---

## 12-ter. Registro della baseline

Copia `docs/eval-baseline.md` dall'edizione pubblica **come modello**, poi
**svuotalo dei dati**: i tassi lì dentro appartengono a quel repo e a quel
commit. Esegui la tua run e registra i **tuoi** numeri.

⚠️ `eval/output/` resta **gitignorata**: i report completi pesano ~220 KB a run e
sono riproducibili. Si versiona solo il record sintetico.

---

## 12-quater. Riscrittura dei meta-prompt (stile e regola 4 di Gemini)

Copia **verbatim** dall'edizione pubblica:

| Sorgente | Destinazione |
|---|---|
| `app/constants/prompts.ts` | `app/constants/prompts.ts` |
| la funzione `buildOptimizerSystemInstruction` in `app/lib/promptOptimizer.ts` | idem |

⚠️ **Se questo repo ha flussi aggiuntivi o modificati** rispetto all'edizione
pubblica, **non sovrascrivere il file**: applica invece le tre trasformazioni
descritte sotto, flusso per flusso. **Fermati e segnala** se non è chiaro.

> ⚠️ **Distinzione critica: tre assi, e solo uno va ridotto.** È l'errore più
> facile da commettere replicando questa modifica — l'ho commesso io stesso, e
> l'ha intercettato l'utente.
>
> | Asse | Esempio | Direzione |
> |---|---|---|
> | **Modo** imperativo | *"Scrivi X"* vs *"Potresti scrivere X?"* | ✅ **invariato**, resta imperativo |
> | **Intensità** | `ASSOLUTAMENTE VIETATO`, `pena il fallimento`, maiuscolo | ⬇️ **azzerare** |
> | **Portata** | *sempre*, *ogni*, *ciascun*, *tutti* | ⬆️ **rafforzare**, non ridurre |
>
> L'imperativo **non** è stato ritrattato: Anthropic lo raccomanda tuttora —
> *"If you say 'can you suggest some changes,' Claude will sometimes provide
> suggestions rather than implementing them"*. E la portata va resa **più**
> esplicita, non meno: i modelli recenti *"do not silently generalize an
> instruction from one item to another"* (esempio ufficiale: *"Apply this
> formatting to every section, **not just the first one**"*).
>
> In italiano i due assi si esprimono con parole simili — `SEMPRE` urlato e
> `sempre` quantificatore — ma fanno lavori opposti. **Verifica dopo la
> riscrittura**: i marcatori di intensità devono essere a **zero**, i
> quantificatori di portata devono essere **ancora presenti** (nel repo pubblico:
> 14 occorrenze fra *sempre*, *ogni*, *ciascun*, *tutti*).

**Cosa cambia — contenuto normativo invariato, cambia il tono:**

1. **Via minacce e maiuscolo enfatico.** `Regole TASSATIVE (pena il fallimento e
   la regressione del prompt)` → `Regole del formato`. Eliminati
   `ASSOLUTAMENTE VIETATO`, `Pena: fallimento generazione`, `OBBLIGATORIO`,
   `ESCLUSIVAMENTE`. Fonte: OpenAI (*"not necessary to use all-caps or other
   incentives like bribes or tips"*) e Anthropic (*"dial back any aggressive
   language"*, causa **over-triggering** sui modelli recenti).
2. **Divieti → istruzioni positive col perché.** Esempio, regola 1 di
   `FLOW_CODE`: da *"È ASSOLUTAMENTE VIETATO formattare i file locali come link
   Markdown. Pena: fallimento generazione"* a *"Scrivi i percorsi in backtick,
   perché l'agente li usa come percorsi reali; un link Markdown lo porterebbe a
   cercare una risorsa remota inesistente"*. Fonte: Anthropic — motivare
   un'istruzione è l'unica regola del corpus **senza controindicazioni**.
3. **Vie d'uscita dove la regola non è sempre soddisfacibile.** La regola 4 di
   `FLOW_GEMINI` pretendeva comandi concreti anche quando l'input non dichiara
   una toolchain: misurato **87%** di conformità, con tutti i fallimenti su
   input senza stack. Ora chiede di scegliere la convenzione più diffusa,
   **dichiarare l'assunzione** e dare comunque i comandi. Stessa aggiunta alla
   regola 7 di `FLOW_CODE`.

**Due correzioni mirate incluse**, entrambe della stessa natura — una regola che
davamo per implicita:
- `FLOW_CHAT` ora chiede **esplicitamente di chiudere i tag** (`</role>`,
  `</context>`, …). Misurato: in circa **una generazione su quattro** Gemini li
  lasciava aperti.
- `FLOW_GEMINI` ora dice **esplicitamente "senza tag XML"** (prima diceva solo
  *"Markdown puro"*, cioè *cosa usare* e mai *cosa escludere*). Senza quella
  frase l'output degenerava in formato Chat, con `<role>`/`<context>` al posto
  degli heading.

> ### ⭐ La lezione più importante di questa modifica (misurata, non teorica)
>
> **Un requisito che merita enfasi merita una regola propria.**
>
> Togliendo il maiuscolo da `È VIETATO MODIFICARE 'CLAUDE.md', ma è OBBLIGATORIO
> LEGGERLO`, la conformità è **crollata dal 93% al 57%**. Il maiuscolo non stava
> facendo *intensità*: stava facendo **salienza**, perché l'istruzione era
> sepolta in coda a una regola lunga.
>
> La cura **non** è rimettere le maiuscole. È **scorporare l'istruzione in una
> regola numerata propria**: così è risalita al **100%** — meglio dell'originale
> enfatico, senza una sola maiuscola.
>
> **Applica lo stesso criterio replicando**: se in questo repo una regola porta
> in coda un requisito importante, scorporalo invece di limitarti ad
> ammorbidirne il tono. Altrimenti riproduci il crollo, non il miglioramento.

**Risultati misurati nel repo pubblico** (4 run, stesso corpus e modello):

| Metrica | Baseline enfatica | Solo de-enfasi | + salienza strutturale |
|---|---|---|---|
| `chat.balanced` | 76% | **98%** | 98% |
| `code.claudeMd` | 93% | **57%** 🔴 | **100%** ✅ |
| `gemini.headings` | 100% | 92% 🔴 | **100%** ✅ |
| `gemini.noGenericPhrases` | 100% | 96% 🔴 | **100%** ✅ |
| `gemini.concreteCommands` | 87% | 65% | 70% ⚠️ ancora aperto |

**Test da aggiornare.** In `app/hooks/usePromptOptimizer.test.ts`, il test
`passa temperature 0.5 e la regola di formattazione` asserisce
`stringContaining('VINCOLO DI FORMATTAZIONE')`, stringa che non esiste più.
Sostituisci quell'asserzione con:

```typescript
    // Pins the two constraints shared by every flow. Asserting the substance
    // rather than a heading keeps the test meaningful across rewordings, while
    // still failing if a constraint is dropped.
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('riga vuota le sezioni di primo livello')]),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('segnaposto di anonimizzazione')]),
    );
```

⚠️ **Questa modifica va misurata, non data per buona.** Esegui l'harness prima e
dopo, e confronta. Se la conformità scende, `git revert` e annotalo nel registro:
le fonti valgono per i loro modelli, non necessariamente per Gemini Flash-Lite
attraverso un meta-prompt in italiano.

**Se durante una run cade la rete**: l'harness cattura l'errore, lo registra fra
le chiamate fallite e prosegue — non serve rilanciare tutto. Conta però le
osservazioni per flusso prima di confrontare: un blocco contiguo di fallimenti
può azzerare un intero flusso e rendere quel confronto privo di significato.
Rilancia il solo flusso colpito:

```bash
EVAL_FLOW=gemini npm run eval    # 10 casi × 3 = 30 chiamate, ~7 minuti
```

È già successo (2026-08-27: 51 chiamate perse in blocco, il flusso `gemini`
ridotto a 3 osservazioni su 30).

---

## 12-quinquies. L8 — esempi few-shot iniettati una volta sola

**Il difetto**: `exBlock` era appeso a **ciascun** flusso, quindi con cinque
formati selezionati gli stessi esempi finivano **cinque volte** nella stessa
richiesta. Il blocco porta già in testa *"per tutti i formati selezionati"*: era
scritto per **un'iniezione sola**, e la duplicazione contraddiceva il suo stesso
testo. È il percorso più probabile verso una risposta troncata.

**In `app/lib/promptOptimizer.ts`**, aggiungi il secondo parametro alla funzione:

```typescript
export function buildOptimizerSystemInstruction(tasks: string[], examplesBlock = ''): string {
```

e inserisci `${examplesBlock}` su una riga propria **subito dopo**
`${tasks.join('\n')}`.

**In `app/hooks/usePromptOptimizer.ts`**, togli `+ exBlock` da tutte e cinque le
righe `tasks.push(...)` e passalo invece alla funzione:

```typescript
      // The examples block is appended ONCE, not per flow: its own preamble
      // already reads "per tutti i formati selezionati", so repeating it per
      // flow duplicated the same text up to five times in a single request —
      // wasted tokens and the most likely path to a truncated response.
      const exBlock = buildExamplesBlock(examples);
      const tasks: string[] = [];
      if (genChat) tasks.push(FLOW_CHAT_INSTRUCTIONS);
      if (genCowork) tasks.push(FLOW_COWORK_INSTRUCTIONS);
      if (genCode) tasks.push(FLOW_CODE_INSTRUCTIONS);
      if (genSystemUser) tasks.push(FLOW_SYSTEM_USER_INSTRUCTIONS);
      if (genGemini) tasks.push(FLOW_GEMINI_INSTRUCTIONS);
```

```typescript
      let systemInstruction = buildOptimizerSystemInstruction(tasks, exBlock);
```

**Test di regressione da aggiungere** in `usePromptOptimizer.test.ts` (senza di
esso la duplicazione può tornare inosservata):

```typescript
  test('inietta il blocco di esempi UNA sola volta anche con più flussi', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenCowork(true);
      result.current.setGenCode(true);
      result.current.setGenSystemUser(true);
      result.current.setGenGemini(true);
    });
    await act(async () => {
      await result.current.handleOptimize([{ content: 'ESEMPIO UNICO' }]);
    });

    const sent = sendMessage.mock.calls[0][0] as string[];
    const occurrences = sent.join('\n').split('ESEMPIO UNICO').length - 1;
    expect(occurrences).toBe(1);
  });
```

---

## 12-sexies. L9 — non imporre `temperature`

**Il difetto**: `generationConfig` imponeva `temperature: 0.5` a **qualunque**
modello l'utente scegliesse. Google, per la famiglia Gemini 3.x: *"we **strongly
recommend** keeping them at their default values"* e *"If your existing code
explicitly sets temperature (especially to low values for deterministic outputs),
we recommend **removing this parameter**"* — con l'avvertenza che valori bassi
possono causare **looping o degrado** su task complessi.

**Il motivo che lo rende urgente è però interno**: l'harness **non** imposta
`temperature`, la produzione sì. Finché differiscono, ogni baseline misurata
descrive una configurazione diversa da quella spedita — e porta un asterisco.

**In `app/hooks/usePromptOptimizer.ts`**, sostituisci il `generationConfig` con:

```typescript
        // No `temperature`: Google recommends leaving sampling at the model
        // default for the Gemini 3.x family — "If your existing code explicitly
        // sets temperature (especially to low values for deterministic
        // outputs), we recommend removing this parameter" — warning that low
        // values can cause looping or degradation on complex tasks. Dropping it
        // also makes production match the eval harness, which never set it: as
        // long as they differ, every measured baseline carries an asterisk.
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
```

**Test da aggiornare**: quello che asseriva `temperature: 0.5` deve ora asserire
`generationConfig` **in modo esatto**, così che una reintroduzione fallisca:

```typescript
    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: expect.anything(),
        },
      }),
    );
```

⚠️ **Valutazione da fare nel fork**: se il tuo repo permette di scegliere anche
modelli Gemini 2.x, quelli useranno il proprio default invece di 0.5. La
raccomandazione di Google è specifica per la famiglia 3.x; il whitepaper 2024
suggeriva valori bassi per i modelli precedenti. Decisione presa nel repo
pubblico: **rimuovere**, perché la lista modelli è caricata live e l'utente
sceglierà modelli recenti.

---

## 13. Checklist finale

- [ ] `app/lib/conformance.ts` + test copiati — 33 test verdi
- [ ] `eval/prompts.ts` sostituito — 66 casi
- [ ] `buildOptimizerSystemInstruction` estratta e usata dall'hook
- [ ] Mock parziale nel test dell'hook — 19 test verdi
- [ ] `eval/run-eval.ts` sostituito
- [ ] Script `eval` in `package.json`
- [ ] i18n: 4 chiavi → 2, in tutte e 9 le lingue
- [ ] `ResultViewer`: import, componente, prop della coppia, 5 punti di chiamata
- [ ] `promptLinter.ts` e il suo test rimossi, nessun riferimento residuo
- [ ] Modalità multi-flusso disponibile (`EVAL_MULTI=1`)
- [ ] `docs/eval-baseline.md` creato **vuoto dei dati altrui**
- [ ] `prompts.ts` e `buildOptimizerSystemInstruction` riscritti (stile + regola 4)
- [ ] Test del meta-prompt aggiornato alle nuove stringhe
- [ ] Versione 1.2.0 nei tre file
- [ ] `npm run lint && npm test && npx tsc --noEmit` puliti
- [ ] Smoke test dell'harness eseguito
- [ ] **Run di baseline eseguita e registrata** — prima e dopo la riscrittura
- [ ] Commit fatto, **nessun push**

---

## 14. Cosa NON fare

- ❌ **Non** aggiungere controlli euristici o "indicativi": solo regole decidibili
  da un parser. Un falso positivo distrugge la fiducia nello strumento — è
  esattamente il difetto del linter che stiamo rimuovendo.
- ❌ **Non** usare `gemini-flash-latest` o un altro alias mobile nell'harness: i
  confronti storici perderebbero significato.
- ❌ **Non** ridurre K sotto 3 senza motivo: con K=1 si misura il rumore.
- ❌ **Non** trasformare il tasso di conformità in un punteggio di qualità 0-100
  da mostrare all'utente. Serve a **falsificare** una regola, non a certificarla —
  e un punteggio LLM-like ci ha già ingannati in passato (87 → 72).
- ❌ **Non** modificare i testi dei flussi in `app/constants/prompts.ts` in questa
  modifica: prima si misura, poi si corregge.
- ❌ **Non** pushare, taggare o pubblicare release senza conferma.

---

## 15. Nota sul significato dei numeri

Va tenuto presente, ed è scritto anche nel report generato:

> I numeri servono a **falsificare** una regola, non a certificarla. Una regola
> al 100% su ~10 casi dice poco; una regola al 60% dice che il meta-prompt non la
> sta imponendo. Si confronta il **delta** tra due esecuzioni — prima e dopo una
> modifica ai meta-prompt — non il livello assoluto.

Alla prima esecuzione reale, l'harness ha trovato che il prompt generato per il
flusso `code` **non citava mai `CLAUDE.md`**, mentre la regola 9 di `FLOW_CODE`
dichiara *"è OBBLIGATORIO LEGGERLO all'inizio"*. È il tipo di difetto che questo
strumento esiste per scoprire.
