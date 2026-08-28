# Allineamento del fork alla v1.2.0 — guida passo passo

> **Per l'agente.** Questa guida porta un fork dalla **v1.1.0** alla **v1.2.0**
> producendo **codice identico** a quello dell'edizione pubblica. È organizzata
> per **massimizzare le copie e gli script** e **ridurre al minimo l'editing a
> mano**: ogni modifica fatta a mano è un'occasione di divergenza.
>
> **Regola d'oro**: se un passo non corrisponde a ciò che trovi nel repo,
> **fermati e segnala**. Non adattare, non improvvisare, non riscrivere a
> memoria.
>
> Il pacchetto contiene:
> ```
> LEGGIMI-ALLINEAMENTO-v1.2.0.md   ← questo file
> file-da-copiare/                 ← file da copiare tali e quali
> script/                          ← script che applicano le modifiche meccaniche
> ```

---

## 0. Che cosa introduce la 1.2.0

**Un verificatore di conformità**: controlla che il prompt *generato* rispetti le
regole che il suo stesso formato dichiara in `app/constants/prompts.ts`.
Sostituisce `promptLinter`, che applicava **3 regole generiche** a tutti e cinque
i formati mentre i flussi ne dichiarano una quarantina — e che li **contraddiceva**
in due punti.

Lo stesso codice serve due consumatori:
- **in app**: un badge sotto ogni variante, con le regole e la **prova** di ogni violazione;
- **offline**: `npm run eval`, che misura il tasso di conformità dei meta-prompt
  su un corpus fisso di 66 casi.

**Ambito, deliberatamente stretto**: ogni controllo è **decidibile da un parser**.
Le regole che richiedono giudizio non vengono valutate affatto — un controllo
approssimativo produce falsi positivi, ed è il difetto che rendeva inaffidabile il
linter precedente.

Insieme arrivano: la **riscrittura dei meta-prompt** (misurata, non teorica), due
**correzioni ai contenuti didattici** in-app, il **default su Flash-Lite** e la
normalizzazione dei fine-riga nel generatore dello scaffold.

### Stato di partenza atteso

| Verifica | Atteso |
|---|---|
| `package.json` | versione **1.1.0** |
| `app/lib/promptLinter.ts` e il suo test | **esistono** |
| `app/lib/conformance.ts` | **non** esiste |
| `app/components/ResultViewer.tsx` | importa `lintPrompt`, usa `LintBadge` |
| `app/lib/i18n/*.ts` (9 file) | contengono `result.lintOk`, `result.lintIssueOne`, `result.lintIssueOther`, `result.lintDetail` |
| `eval/prompts.ts` e `eval/run-eval.ts` | esistono (corpus di 20 casi) |
| `package.json` scripts | **non** ha `eval` |

Se non corrisponde, **fermati e segnala**.

**Prima di iniziare**: working tree pulito (`git status`) e Gate verde
(`npm run lint && npm test`). È la baseline con cui confronterai alla fine.

---

## PARTE A — File da copiare tali e quali

Copia dal pacchetto, rispettando i percorsi. Sono file **interi**, non frammenti.

| Dal pacchetto | Nel repo | Nota |
|---|---|---|
| `file-da-copiare/app/lib/conformance.ts` | `app/lib/conformance.ts` | nuovo |
| `file-da-copiare/app/lib/conformance.test.ts` | `app/lib/conformance.test.ts` | nuovo |
| `file-da-copiare/app/constants/prompts.ts` | `app/constants/prompts.ts` | **sostituisce** |
| `file-da-copiare/eval/prompts.ts` | `eval/prompts.ts` | **sostituisce** (corpus 20 → 66 casi) |
| `file-da-copiare/eval/run-eval.ts` | `eval/run-eval.ts` | **sostituisce** |
| `file-da-copiare/scripts/generate-scaffold-constants.mjs` | `scripts/generate-scaffold-constants.mjs` | **sostituisce** |
| `file-da-copiare/docs/eval-baseline.md` | `docs/eval-baseline.md` | nuovo, **da svuotare** (vedi Parte E) |

⚠️ **`app/constants/prompts.ts`**: se questo fork ha flussi **aggiuntivi o
diversi** dall'edizione pubblica, **non sovrascrivere**. Applica invece a mano le
trasformazioni descritte nell'**Appendice 1**, flusso per flusso, e segnala la
divergenza.

⚠️ **Fine-riga**: se il repo di destinazione usa LF, normalizza i file copiati
dopo l'operazione.

**Verifica immediata**:
```bash
npx vitest run app/lib/conformance.test.ts     # 41 test verdi
```

---

## PARTE B — Script da eseguire

Modifiche meccaniche su molti file: eseguirle a mano garantisce divergenze.
Lancia dalla **radice del repo**.

```bash
node script/i18n-conformance.mjs    # 4 chiavi linter → 2 chiavi conformità, in 9 lingue
node script/i18n-tips.mjs           # 3 chiavi delle schede didattiche, in 9 lingue
```

Ognuno stampa `ok: <lingua>` per tutte e nove. Se stampa `NON sostituito` o
`chiave non trovata`, **fermati e segnala**: significa che le chiavi in questo
fork hanno un formato diverso.

---

## PARTE C — Modifiche a mano

Sette file. Sono *ibridi* (il fork può averne varianti proprie), quindi vanno
editati puntualmente. I blocchi vanno inseriti **verbatim**.

### C1 · `app/lib/promptOptimizer.ts` — estrai il meta-prompt

**Perché**: la copia del `systemInstruction` dentro `eval/run-eval.ts` era
hand-copiata e **aveva già divergito** (mancava il vincolo di formattazione),
quindi l'harness misurava un prompt mai spedito. Con una fonte unica il drift
diventa impossibile per costruzione.

Inserisci **subito prima** di `export class TruncatedResponseError`:

```typescript
/**
 * Builds the meta-prompt sent to Gemini, given the per-flow instruction blocks.
 *
 * Lives here rather than inline in the hook so that production and the offline
 * eval harness share ONE definition: a hand-copied mirror had already drifted
 * (the harness was missing the formatting constraint), which meant the harness
 * measured a prompt we never actually shipped.
 */
export function buildOptimizerSystemInstruction(tasks: string[], examplesBlock = ''): string {
  return `Sei un esperto Prompt Engineer. Genera versioni ottimizzate dello stesso prompt, una per ciascun flusso richiesto.

      Applica i flussi di lavoro specificati qui sotto, ognuno con le sue regole:
      ${tasks.join('\n')}
${examplesBlock}

      Vincolo comune a tutti i flussi — segnaposto: riporta i segnaposto di anonimizzazione (es. [EMAIL_X], [TELEFONO_X]) esattamente come li ricevi. Sostituiscono dati personali dell'utente e vengono ripristinati dopo la generazione: un segnaposto alterato non è più riconoscibile e il dato originale va perso.

      Vincolo comune a tutti i flussi — leggibilità: separa con una riga vuota le sezioni di primo livello, sia i tag (es. <role>, <context>, <output_format>) sia gli heading Markdown, tenendo ogni tag sulla propria riga. Il prompt generato viene letto e modificato a mano dall'utente, quindi la spaziatura è parte del risultato.

      Nel campo "spiegazione" descrivi brevemente le migliorie apportate, riferendole ai formati richiesti.`;
}
```

⚠️ Il testo dentro il template literal va copiato **carattere per carattere**,
inclusa l'indentazione a 6 spazi: è il prompt reale che viene spedito.

### C2 · `app/hooks/usePromptOptimizer.ts` — tre modifiche

**C2a — import.** Sostituisci l'import da `../lib/promptOptimizer` con:

```typescript
import {
  buildResponseSchema,
  buildOptimizerSystemInstruction,
  parseOptimizerResponse,
  type OptimizerResult,
} from '../lib/promptOptimizer';
```

**C2b — esempi iniettati una volta sola.** Il blocco degli esempi era appeso a
**ciascun** flusso: con cinque formati selezionati gli stessi esempi finivano
**cinque volte** nella stessa richiesta. Il blocco porta già in testa *"per tutti i
formati selezionati"*: era scritto per un'iniezione sola.

Sostituisci le cinque righe `tasks.push(FLOW_X + exBlock)` con:

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

e la costruzione del prompt con:

```typescript
      let systemInstruction = buildOptimizerSystemInstruction(tasks, exBlock);
```

⚠️ Mantieni `let` (non `const`): la variabile viene riassegnata subito dopo
dall'anonimizzazione.

**C2c — niente `temperature`.** Sostituisci il `generationConfig` con:

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

### C3 · `app/hooks/usePromptOptimizer.test.ts` — tre modifiche

**C3a — mock parziale.** Senza questo, **10 test falliscono**. Sostituisci

```typescript
vi.mock('../lib/promptOptimizer', () => ({ buildResponseSchema, parseOptimizerResponse }));
```

con

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

**C3b — sostituisci il test sulla temperature.** Il test
`passa temperature 0.5 e la regola di formattazione` va rimpiazzato da **due**
test:

```typescript
  // The examples block carries its own "per tutti i formati selezionati"
  // preamble, so one copy covers every flow. Repeating it per flow wasted
  // tokens and was the most likely path to a truncated response.
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

  test('non imposta temperature e passa i vincoli comuni', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => { result.current.setInput('ottimizza questo'); });
    await act(async () => { await result.current.handleOptimize(); });

    // Asserting generationConfig EXACTLY (not objectContaining) so that
    // re-introducing `temperature` fails loudly: Google recommends the model
    // default for Gemini 3.x, and omitting it keeps production identical to the
    // eval harness — while they differ, every measured baseline is suspect.
    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: expect.anything(),
        },
      }),
    );
    // Pins the two constraints shared by every flow. Asserting the substance
    // rather than a heading keeps the test meaningful across rewordings, while
    // still failing if a constraint is dropped.
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('riga vuota le sezioni di primo livello')]),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('segnaposto di anonimizzazione')]),
    );
  });
```

### C4 · `app/hooks/useApiKeyConfig.ts` — default su Flash-Lite

La preferenza puntava a `gemini-1.5-flash-latest`, ormai vecchio. Sostituisci il
blocco `const defaultM = …` con:

```typescript
          // Default: the current Flash-Lite alias — cheapest and fastest tier,
          // and a MOVING alias so the app follows Google's current model
          // without a code change. (The eval harness pins an exact version
          // instead: there comparability across runs matters more than being
          // current.) The chain degrades gracefully because the list is fetched
          // live and its naming has changed before.
          const defaultM =
            formattedModels.find((m) => m.id === 'gemini-flash-lite-latest') ||
            formattedModels.find((m) => m.id.includes('flash-lite') && m.id.includes('latest')) ||
            formattedModels.find((m) => m.id.includes('flash-lite')) ||
            formattedModels.find((m) => m.id.includes('flash-latest')) ||
            formattedModels.find((m) => m.id.includes('flash')) ||
            formattedModels[0];
```

### C5 · `app/hooks/useApiKeyConfig.test.ts` — due test

Inseriscili **prima** del test `stays unconfigured when no key was ever stored`:

```typescript
  // The default is the Flash-Lite alias: cheapest tier, and moving, so the app
  // follows Google's current model without a code change. Pinning it here means
  // a future reshuffle of the preference chain has to be deliberate.
  test('preferisce Flash-Lite come modello di default quando è disponibile', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-3.5-pro', displayName: 'Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-flash-latest', displayName: 'Flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-flash-lite-latest', displayName: 'Flash Lite', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      }),
    );

    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));

    expect(result.current.selectedModel).toBe('gemini-flash-lite-latest');
  });

  // Google has renamed model families before, so the chain must degrade instead
  // of falling through to whatever happens to be first in the list.
  test('ripiega su un Flash-Lite versionato se manca l\'alias', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-3.5-pro', displayName: 'Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.5-flash-lite', displayName: 'Flash Lite 3.5', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      }),
    );

    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));

    expect(result.current.selectedModel).toBe('gemini-3.5-flash-lite');
  });
```

⚠️ Se in questo fork il test esistente asserisce
`selectedModel === 'gemini-1.5-flash-latest'`, quel valore resta corretto: in
quella lista Flash-Lite non c'è, quindi la catena ripiega comunque su di lui.

### C6 · `app/components/ResultViewer.tsx` — cinque modifiche

**C6a — import.** Sostituisci

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

**C6b — componente.** Sostituisci **l'intera funzione `LintBadge`** con:

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

**C6c — `PairControlsProps`.** Sostituisci `lintResult: LintResult;` con
`conformance: ConformanceResult;`.

**C6d — `PairControls`.** Nella firma sostituisci `lintResult` con
`conformance`. Poi **sposta il badge**: togli `<LintBadge result={lintResult} />`
da **sopra** i pulsanti e metti `<ConformanceBadge result={conformance} />` come
**ultimo elemento** prima della `</div>` di chiusura della funzione. *(Motivo:
nelle altre varianti il badge sta sotto i pulsanti; così la posizione è
uniforme.)*

**C6e — i cinque punti di chiamata.**

| Da | A |
|---|---|
| `<LintBadge result={lintPrompt(shownText('promptChat', result.promptChat))} />` | `<ConformanceBadge result={checkChat(shownText('promptChat', result.promptChat))} />` |
| `<LintBadge result={lintPrompt(shownText('promptCowork', result.promptCowork))} />` | `<ConformanceBadge result={checkCowork(shownText('promptCowork', result.promptCowork))} />` |
| `<LintBadge result={lintPrompt(shownText('promptCode', result.promptCode))} />` | `<ConformanceBadge result={checkCode(shownText('promptCode', result.promptCode))} />` |
| `<LintBadge result={lintPrompt(shownText('promptGemini', result.promptGemini))} />` | `<ConformanceBadge result={checkGemini(shownText('promptGemini', result.promptGemini))} />` |
| `lintResult={lintPrompt(...)}` (nella coppia) | `conformance={checkSystemUser(shownSystem(), shownUser())}` |

⚠️ Il verificatore gira su `shownText(...)`, cioè **ciò che l'utente vede**
(quindi la versione rifinita, se ha usato "Rifinisci"). È voluto: si verifica
l'artefatto consegnato, non un intermedio.

### C7 · `package.json` — script e versione

Aggiungi lo script (subito dopo `generate:scaffold`):

```json
    "eval": "tsx eval/run-eval.ts",
```

e porta `"version"` a `"1.2.0"`.

---

## PARTE D — Da eliminare

`promptLinter` è ora orfano, e la regola d'igiene vieta il codice morto:

```
app/lib/promptLinter.ts
app/lib/promptLinter.test.ts
```

**Verifica**: una ricerca di `promptLinter`, `lintPrompt`, `LintBadge`,
`result.lint` in `app/` ed `eval/` non deve restituire **nulla**.

---

## PARTE E — Versione, changelog, baseline

1. **Versione 1.2.0** in tre file, tenuti allineati:
   - `package.json` (già fatto in C7)
   - `src-tauri/Cargo.toml`, sezione `[package]`
   - `src-tauri/Cargo.lock`, l'entry **immediatamente sotto** `name = "app"`
   ⚠️ In `Cargo.lock` esistono altri pacchetti alla stessa versione: modifica
   **solo** quello sotto `name = "app"`.

2. **`CHANGELOG.md`**: aggiungi una voce `[1.2.0]` che riassuma verificatore,
   harness, riscrittura dei meta-prompt, schede didattiche e default Flash-Lite.

3. **`docs/eval-baseline.md`**: il file copiato è un **modello**. **Svuotalo dei
   dati**: i tassi lì dentro appartengono all'edizione pubblica, a quel commit e a
   quel corpus. Tieni struttura, note di metodo e procedura; cancella le run.
   Registrerai i **tuoi** numeri dopo la tua prima esecuzione.

---

## PARTE F — Verifica

```bash
npm run lint
npm test
npx tsc --noEmit
```

Attesi: lint pulito · **tutti i test verdi** (~+41 dai nuovi test di conformità,
+2 dai test sul modello, −7 dal linter rimosso) · typecheck pulito.

**Verifica funzionale dell'harness**, una sola chiamata:

```bash
EVAL_ONLY=code-genera-docs EVAL_REPS=1 EVAL_SLEEP_MS=0 npx tsx eval/run-eval.ts
```

Deve stampare una tabella di conformità e scrivere `eval/output/latest-*.md`.
Richiede `GEMINI_API_KEY` in `.env.local`.

**Commit** (nessun push senza conferma esplicita dell'utente):

```
feat: verificatore di conformità, harness di regressione sui prompt, meta-prompt riscritti (1.2.0)
```

---

## Appendice 1 — La riscrittura dei meta-prompt, se devi applicarla a mano

Serve **solo** se non hai potuto sovrascrivere `app/constants/prompts.ts` (fork
con flussi propri). Contenuto normativo invariato: cambiano il tono e la
formulazione.

> ### ⚠️ Tre assi, e solo uno va ridotto
>
> È l'errore più facile da commettere. L'ho commesso io e l'ha intercettato
> l'utente.
>
> | Asse | Esempio | Direzione |
> |---|---|---|
> | **Modo** imperativo | *"Scrivi X"* vs *"Potresti scrivere X?"* | ✅ **invariato** |
> | **Intensità** | `ASSOLUTAMENTE VIETATO`, `pena il fallimento`, maiuscolo | ⬇️ **azzerare** |
> | **Portata** | *sempre*, *ogni*, *ciascun*, *tutti* | ⬆️ **rafforzare** |
>
> L'imperativo **non** è stato ritrattato: Anthropic lo raccomanda tuttora —
> *"If you say 'can you suggest some changes,' Claude will sometimes provide
> suggestions rather than implementing them"*. E la portata va resa **più**
> esplicita: i modelli recenti *"do not silently generalize an instruction from
> one item to another"*.
>
> **Verifica dopo la riscrittura**: marcatori di intensità a **zero**,
> quantificatori di portata **ancora presenti** (nel repo pubblico: 14 fra
> *sempre*, *ogni*, *ciascun*, *tutti*).

**Le tre mosse:**

1. **Via minacce e maiuscolo enfatico.** `Regole TASSATIVE (pena il fallimento e
   la regressione del prompt)` → `Regole del formato`. Eliminati
   `ASSOLUTAMENTE VIETATO`, `Pena: fallimento generazione`, `OBBLIGATORIO`,
   `ESCLUSIVAMENTE`.
2. **Divieti → istruzioni positive col perché.** Esempio, regola 1 di
   `FLOW_CODE`: da *"È ASSOLUTAMENTE VIETATO formattare i file locali come link
   Markdown. Pena: fallimento generazione"* a *"Scrivi i percorsi in backtick,
   perché l'agente li usa come percorsi reali; un link Markdown lo porterebbe a
   cercare una risorsa remota inesistente"*.
3. **Vie d'uscita** dove la regola non è sempre soddisfacibile: se l'input non
   dichiara la toolchain, **dichiarare l'assunzione** invece di pretendere
   l'impossibile.

**Due correzioni mirate**, entrambe della stessa natura — una regola data per
implicita:
- `FLOW_CHAT` ora chiede **esplicitamente di chiudere i tag**. Misurato: in circa
  **una generazione su quattro** restavano aperti.
- `FLOW_GEMINI` ora dice **esplicitamente "senza tag XML"** (prima diceva solo
  *"Markdown puro"*: cosa usare, mai cosa escludere) ed è diventata la **regola 1
  numerata**. Senza, l'output degenerava in formato Chat.

> ### ⭐ La lezione più importante, misurata
>
> **Un requisito che merita enfasi merita una regola propria.**
>
> Togliendo il maiuscolo da `È VIETATO MODIFICARE 'CLAUDE.md', ma è OBBLIGATORIO
> LEGGERLO`, la conformità è **crollata dal 93% al 57%**: il maiuscolo non faceva
> *intensità*, faceva **salienza**, su un'istruzione sepolta in coda a una regola
> lunga. La cura non è rimettere le maiuscole ma **scorporare l'istruzione in una
> regola numerata**: così è risalita al **100%**, meglio dell'originale enfatico.
>
> Se in questo fork una regola porta in coda un requisito importante,
> **scorporalo** invece di limitarti ad ammorbidirne il tono. Altrimenti riproduci
> il crollo, non il miglioramento.

| Metrica | Baseline enfatica | Solo de-enfasi | + salienza strutturale |
|---|---|---|---|
| `chat.balanced` | 76% | **98%** | 98% |
| `code.claudeMd` | 93% | **57%** 🔴 | **100%** ✅ |
| `gemini.headings` | 100% | 92% 🔴 | **100%** ✅ |
| `gemini.noGenericPhrases` | 100% | 96% 🔴 | **100%** ✅ |

---

## Appendice 2 — L'harness: uso, costi e trappole

```bash
npm run eval                          # 66 casi, un formato per chiamata
EVAL_MULTI=1 npm run eval             # cinque formati in una chiamata (come la produzione)
EVAL_FLOW=code npm run eval           # un solo flusso
EVAL_BACKEND=claude npm run eval      # genera con il CLI claude invece di Gemini
```

**Quota**: il free tier Gemini è **500 richieste al giorno**. Una run completa ne
consuma **198**, cioè il 40% — al massimo due run piene al giorno.

**Verificare la quota**: guarda il **contatore reale** su
[ai.dev/rate-limit](https://ai.dev/rate-limit), **non** una chiamata di prova. Una
chiamata riuscita dimostra solo *"ce n'era almeno una"* — e la consuma.

**Se cade la rete o si esaurisce la quota**: l'harness registra l'errore e
prosegue. Conta le osservazioni **per flusso** prima di confrontare: un blocco
contiguo di fallimenti può azzerare un intero flusso e rendere quel confronto
privo di significato. Rilancia il solo flusso colpito con `EVAL_FLOW=<flusso>`.

> ### ⛔ Il backend Claude è confinato — non rimuovere il confinamento
>
> Il CLI è un **agente di coding completo**, non un endpoint di testo. Il
> 2026-08-28, invocato senza restrizioni nella directory del repo, ha preso tre
> input del corpus alla lettera e li ha **eseguiti**: ha creato `docs/TESTING.md`,
> l'ha registrato in `CLAUDE.md` e ha riscritto `CONTRIBUTING.md` — dentro il
> repository che avrebbe dovuto misurare. Quelle risposte comparivano poi come
> *"JSON malformato"*, perché l'agente era andato a lavorare invece di rispondere.
>
> **Un banco di prova non deve poter modificare il sistema che misura.** Tre
> livelli, in ordine crescente di affidabilità: `--restricted`,
> `--disallowed-tools`, e soprattutto un **cwd temporaneo usa-e-getta** — ciò che
> sopravvive ai primi due può raggiungere solo una cartella vuota.

---

## Appendice 3 — Note di lettura dei numeri

I tassi servono a **falsificare** una regola, non a certificarla: una regola al
100% su ~10 casi dice poco, una al 60% dice che il meta-prompt non la sta
imponendo. Si confronta il **delta** fra due esecuzioni, non il livello.

**Non trasformarli in un punteggio di qualità 0-100 da mostrare all'utente.** Un
punteggio LLM-like ci ha già ingannati: in un esperimento di luglio un judge-loop
è passato da 87 a 72 amplificando rumore.

**K=3 non è pedanteria**: il difetto più grave trovato (tag non chiusi nel 24% dei
casi) era invisibile con K=1 — c'era il **67% di probabilità di dichiarare la
regola sana**.

**Prima di dichiarare un reperto, guarda le prove.** È già successo due volte che
un tasso basso fosse un difetto del *verificatore* e non del prodotto.

---

## Checklist finale

- [ ] **A** — 7 file copiati; `conformance.test.ts` → 41 test verdi
- [ ] **B** — due script eseguiti, `ok` su tutte e 9 le lingue
- [ ] **C1** — `buildOptimizerSystemInstruction` estratta
- [ ] **C2** — import, esempi una volta sola, niente `temperature`
- [ ] **C3** — mock parziale + due test nuovi
- [ ] **C4/C5** — default Flash-Lite + due test
- [ ] **C6** — `ResultViewer`: import, componente, prop della coppia, 5 chiamate
- [ ] **C7** — script `eval` e versione in `package.json`
- [ ] **D** — `promptLinter` rimosso, nessun riferimento residuo
- [ ] **E** — versione 1.2.0 nei tre file, CHANGELOG, baseline **svuotata**
- [ ] **F** — lint, test, typecheck puliti; smoke test dell'harness eseguito
- [ ] Commit fatto, **nessun push**

---

## Cosa NON fare

- ❌ **Non** aggiungere controlli euristici al verificatore: solo regole decidibili
  da un parser. Un falso positivo distrugge la fiducia nello strumento — è
  esattamente il difetto del linter che stiamo rimuovendo.
- ❌ **Non** usare un alias mobile nell'harness (`gemini-flash-latest`): i confronti
  storici perderebbero significato. L'**app** usa un alias mobile, l'**harness**
  resta pinnato: sono esigenze opposte e vanno tenute separate.
- ❌ **Non** ridurre K sotto 3 senza motivo.
- ❌ **Non** rimuovere il confinamento del backend Claude.
- ❌ **Non** modificare i testi dei flussi in questa migrazione: prima si misura,
  poi si corregge.
- ❌ **Non** pushare, taggare o pubblicare release senza conferma esplicita.
