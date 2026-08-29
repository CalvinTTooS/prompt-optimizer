# Audit — aderenza alle best practice di prompt engineering

> **Data**: 2026-08-27 · **Oggetto**: il motore di analisi e ottimizzazione dei prompt di
> Prompt Optimizer (`app/constants/prompts.ts`, `usePromptOptimizer`, `promptLinter`,
> `MasterclassTips`) · **Metodo**: estrazione delle regole prescrittive dalle fonti
> **ufficiali** OpenAI, Anthropic, Google, Microsoft + catalogo DAIR.AI/learnprompting +
> paper citati; confronto puntuale col nostro codice.
>
> **Non è un documento di prodotto**: è un audit interno. Nulla è stato modificato.

---

## Verdetto in tre righe

Le **scelte di fondo sono giuste e in diversi punti sofisticate** (split System/User, XML
solo per i target Claude, few-shot condizionale, output strutturato via schema). Il
problema non è *cosa* sappiamo, è che **il prodotto contraddice sé stesso in cinque punti**
e che **lo stile dei nostri meta-prompt è esattamente l'anti-pattern che i vendor hanno
ritrattato nel 2025-2026**. C'è poi **un errore di logica di fondo**, che è metodologico
prima che tecnico: **ottimizziamo senza misurare nulla**.

---

## Parte 1 — Cosa dicono oggi le fonti (sintesi)

### 1.1 Il cambio di paradigma 2025-2026 (il dato più importante)

Tutte le fonti convergono su una direzione **controcorrente rispetto al materiale
pre-2025**: prompt **più corti**, meno ingegnerizzati, con le leve di ragionamento spostate
nei **parametri API** invece che nel testo.

| Fonte | Citazione |
|---|---|
| Google (Gemini 3) | *"Consider using `thinking_level: high` with simplified prompts instead of complex prompt engineering techniques previously needed for reasoning."* |
| Anthropic | *"Prefer general instructions over prescriptive steps. A prompt like 'think thoroughly' often produces better reasoning than a hand-written step-by-step plan."* |
| Microsoft | *"These techniques aren't recommended for reasoning models like gpt-5 and o-series models."* |
| Anthropic | *"Remove over-prompting… Instructions like 'If in doubt, use [tool]' will cause overtriggering."* |

### 1.2 Le regole trasversali su cui i quattro vendor concordano

1. **Delimita** istruzioni, contesto, esempi e input variabile. Google: *"Employ clear
   delimiters… XML-style tags or Markdown headings are effective. **Choose one format and
   use it consistently within a single prompt**."*
2. **Un solo stile per prompt.** Mai JSON come contenitore del *contesto in ingresso*
   (OpenAI: *"JSON performed particularly poorly"*).
3. **Istruzioni positive** invece di elenchi di divieti. Google: *"a list of constraints can
   clash with each other"*. I divieti restano legittimi **solo** per safety e formato rigido.
4. **Niente maiuscolo/minacce/incentivi.** OpenAI: *"It's generally not necessary to use
   all-caps or other incentives like bribes or tips."* Anthropic: *"The fix is to dial back
   any aggressive language."*
5. **Spiega il perché.** Anthropic: *"Providing context or motivation behind your
   instructions… can help Claude better understand your goals… Claude is smart enough to
   generalize from the explanation."* — **è l'unica regola dell'intero corpus senza
   controindicazioni dichiarate.**
6. **Few-shot 3–5**, formattati in modo identico, diversi tra loro; **prima prova senza**.
7. **Posizionamento**: vincoli/persona/formato in cima, contesto massivo in mezzo, domanda
   specifica in fondo (Google, Anthropic: *"up to 30 percent"* di miglioramento); OpenAI
   suggerisce di **duplicare** l'istruzione anche in coda.
8. **Output strutturato via schema API**, non descritto a parole; poi **validare la semantica**.
9. **Empirismo**: eval automatiche, test set con prompt avversari, documentazione di ogni
   tentativo, ri-test a ogni cambio di modello.

### 1.3 Ciò che è stato *ritrattato* (e ci riguarda)

| Pratica | Stato oggi |
|---|---|
| "Pensa passo dopo passo" su modelli reasoning | **Sconsigliata** — OpenAI: *"Avoid chain-of-thought prompts… unnecessary"*. Anthropic: CoT manuale = *"fallback"* solo *"when thinking is off"* |
| CoT come tecnica universale | **Ridimensionata** — Sprague et al. (ICLR 2025): guadagni concentrati su math/simbolico, ~95% del delta MMLU su domande con "="; Liu et al.: fino a **−36,3 punti** dove nuoce |
| `temperature` bassa per determinismo su Gemini 3 | **Anti-pattern** — Google: *"we recommend removing this parameter and using the Gemini 3 default of 1.0"* |
| Prompt massimalisti / linguaggio enfatico | **Controproducente** — over-triggering su Claude, over-analisi su Gemini 3 |
| Prefill dell'ultimo turno assistant (Anthropic) | **Rimosso — 400 error** su 4.6+ |
| `thinking.budget_tokens` | **400 error** su Claude 4.7+ |

---

## Parte 2 — Dove siamo aderenti (e conta dirlo)

| Scelta nostra | Riscontro nelle fonti |
|---|---|
| **Split System/User** con il criterio *"resterebbe identico domani con dati diversi?"* | Allineato a OpenAI (*"Put overall tone or role guidance in the system message; keep task-specific details and examples in user messages"*) e a Google R6. È la parte migliore del nostro motore. |
| **XML per i target Claude, Markdown puro per `CLAUDE.md`/`GEMINI.md`** | Corretto per vendor: Anthropic preferisce XML, i file-istruzioni sono Markdown per convenzione. |
| **Few-shot condizionale** in `FLOW_CHAT` (solo task format-driven) | Allineato a OpenAI E1 e a DAIR. La scheda didattica in-app sul few-shot è **corretta e aggiornata**. |
| **Output strutturato via `responseSchema`** | Google: *"we recommend using Gemini API's structured output feature"*. |
| **Anonimizzazione PII lato dispositivo** | Nessuna fonte lo prescrive, ma è coerente con la separazione dati/istruzioni ed è un differenziatore reale. |
| **Plan-then-act + branch separato** in `FLOW_CODE` | Allineato ai pattern agentici (OpenAI G1/G7, Anthropic R20). |
| **"Filename neutrality"** in `FLOW_GEMINI` | Sofisticato e corretto: il file può chiamarsi `AGENTS.md`. |
| **Nessun prefill; nessuna `temperature` sui provider Claude/OpenAI** | Ci evita due `400 error` su Sonnet 5 / Claude 4.6+. Fortunato o intenzionale, è giusto. |
| **`parseRefineResult` che estrae il primo oggetto JSON** | È esattamente la migrazione raccomandata da Anthropic in sostituzione del prefill (*"strip it in post-processing"*). |
| **ID modelli aggiornati** (`claude-opus-5`, `gpt-5`) | Allineato a OpenAI J3. |

---

## Stato dei dieci punti — aggiornato al 2026-08-29

| | Difetto | Stato |
|---|---|---|
| L1 | Ottimizziamo senza misurare | ✅ **chiuso** — harness, 66 casi, baseline versionata |
| L2 | Costo del batching multi-formato | ✅ **chiuso** — modalità a flusso singolo, misurata |
| L3 | Stile enfatico | ✅ **chiuso** — esito opposto al previsto |
| L4 | Input non delimitato + `systemInstruction` nativo | ❌ aperto — **il più promettente** |
| L5 | Due dialetti di segnaposto | ⚠️ implementato, **misurato su 3 flussi su 5** (run 13) |
| L6 | Scheda CoT in-app superata | ✅ **chiuso** |
| L7 | Linter che contraddice i flussi | ✅ **chiuso** |
| L8 | Few-shot duplicato e incondizionato | ✅ **chiuso** — iniettato una volta sola |
| L9 | `temperature: 0.5` su Gemini 3.x | ✅ **chiuso** — parametro rimosso |
| L10 | "Spiegazione" non verificabile | ❌ aperto |

**Perché L9 è ora prioritario**: non è più solo una raccomandazione di Google, è
un **problema di validità della misura**. L'harness gira **senza** `temperature`,
la produzione la impone a **0.5**: le baseline misurano una configurazione
diversa da quella spedita. Si sana in un modo dei due — o l'harness rispecchia la
produzione, o la produzione smette di imporla (che è la raccomandazione Google per
la famiglia 3.x, e renderebbe le baseline corrette retroattivamente).

**Emersi durante il lavoro, non presenti in questo audit:**
- ✅ Il `VINCOLO UNIVERSALE` sui segnaposto di anonimizzazione **non era
  verificato da nessuno**. Ora c'è `anon.intact`: 100% su tutti i formati.
- ✅ La copia del `systemInstruction` nell'harness **era già divergente** e
  misurava un prompt mai spedito. Ora è una funzione sola.
- ⚠️ `gemini.concreteCommands` al 70%: sospetto difetto **del check**, che
  pretende comandi di build anche quando l'utente ha chiesto sole regole di stile.

---

## Parte 3 — Errori di logica, in ordine di gravità

### 🔴 L1 — Ottimizziamo senza misurare (l'errore di fondo)

**Il difetto**: generiamo varianti "ottimizzate" e non verifichiamo **mai** che siano
migliori. Nessuna esecuzione del prompt, nessun confronto, nessuna metrica. Anche
"Valuta con Claude" giudica **il testo del prompt** contro criteri astratti — non il
**comportamento** che quel prompt produce.

**Perché è un errore di logica e non una feature mancante**: l'intero corpus definisce il
prompt engineering come disciplina **empirica**. OpenAI: *"AI engineering is inherently an
empirical discipline… we advise building informative evals and iterating often."* Google:
*"rely on automated tests and evaluation procedures to understand how well your prompt
generalizes."* Microsoft: *"even when you use prompt engineering effectively, you still
need to validate the responses."*

Senza un ciclo di misura, **"ottimizzato" è un'affermazione non falsificabile**. Stiamo
applicando regole plausibili e chiamando il risultato un miglioramento.

**Aggravante**: le regole che applichiamo sono in parte **superate** (vedi L6) — e senza
misura non abbiamo modo di accorgercene.

---

### 🔴 L2 — Istruzioni contraddittorie nella stessa chiamata

> ## ⚠️ RIFORMULATO il 2026-08-27 — la citazione qui sotto era applicata male
>
> Avevo citato Google (*"Choose one format and use it consistently within a
> single prompt"*) come prova di una contraddizione. **Quella regola parla di
> come strutturi il TUO prompt** — non mescolare tag XML e heading Markdown come
> impalcatura — **non dei formati che chiedi in output.** Le nostre istruzioni
> per-flusso non si contraddicono: sono *scopate* dalle intestazioni
> `=== FLUSSO N ===`.
>
> **Il problema reale che resta** è la **pressione sui token** → troncamento,
> documentato dal nostro stesso `TruncatedResponseError`, il cui messaggio
> suggerisce all'utente di *"selezionare meno formati"*: scarichiamo su di lui un
> limite nostro. Aggravato da L8 (esempi few-shot duplicati per ogni flusso).
>
> **Raggio d'azione più piccolo del previsto**: il default dell'app è
> `genChat: true` e tutti gli altri `false`, quindi il percorso più battuto è
> **già a flusso singolo**.
>
> **Da misurare, non da dedurre**: `EVAL_MULTI=1 npm run eval` genera i cinque
> formati in una chiamata e confronta la conformità con la run a flusso singolo.
> Tre esiti possibili, tutti utili — uguale (L2 si chiude), peggiore (lo split è
> giustificato, e sappiamo di quanto), migliore (L2 andava capovolto).


**Il difetto**: una sola richiesta a Gemini contiene fino a **5 specifiche di formato
divergenti**. Nella stessa `systemInstruction` convivono letteralmente:

- `FLOW_CHAT`: *"Usa tag XML standard (`<role>`, `<context>`…)"*
- `FLOW_CODE`: *"Markdown puro e strutturato (**NIENTE tag XML verbosi**)"*

**Perché è grave**: Google prescrive l'esatto contrario — *"Choose one format and use it
consistently within a single prompt"*. E OpenAI documenta che il costo è **superiore sui
modelli moderni**: *"poorly-constructed prompts containing contradictory or vague
instructions can be more damaging to GPT-5 than to other models… It expends reasoning
tokens searching for a way to reconcile the contradictions."*

**Conseguenze già visibili nel codice**: la pressione sui token è tale che abbiamo dovuto
introdurre `TruncatedResponseError`. Il rimedio suggerito da tutte le fonti è la
**scomposizione** (Microsoft: *"LLMs often perform better if the task is broken down"*),
cioè una chiamata per formato — che eliminerebbe insieme contraddizione e troncamento.

---

### 🟠 L3 — Il nostro stile di meta-prompt è un anti-pattern ritrattato

> ## ✅ CHIUSO il 2026-08-27 — con esito diverso da quello previsto
>
> Misurato su 4 run (vedi [`eval-baseline.md`](eval-baseline.md)). La diagnosi
> qui sotto era **giusta a metà**, e la parte sbagliata è istruttiva:
>
> - **«Sii esplicito» → confermato in pieno.** `chat.balanced` **76% → 98%**
>   perché il meta-prompt ha finalmente *detto* di chiudere i tag;
>   `gemini.headings` recuperato a 100% perché ha finalmente detto *"senza tag
>   XML"*. Entrambe le regole erano **implicite**, e l'enfasi le stava
>   compensando.
> - **«Togli l'enfasi» → smentito, se preso da solo.** `code.claudeMd`
>   **93% → 57%** togliendo le maiuscole a parità di posizione. Il maiuscolo non
>   stava facendo *intensità*: stava facendo **salienza**, su un'istruzione
>   sepolta in coda a una regola lunga.
> - **La cura giusta è strutturale, non tipografica.** Dando all'istruzione una
>   **regola numerata propria**: **57% → 100%**, meglio dell'originale enfatico,
>   senza una sola maiuscola.
>
> **Regola operativa che ne esce**: *un requisito che merita enfasi merita una
> regola propria.* E, prima ancora: *se una regola ha bisogno del maiuscolo per
> reggere, di solito è perché non dice tutto quello che serve.*
>
> **Attenzione — tre assi, non uno** (errore commesso e corretto in corso d'opera):
> il **modo imperativo** resta raccomandato, l'**intensità** va tolta, la
> **portata** (*sempre*, *ogni*, *ciascun*) va **rafforzata**, non ridotta.


**Il difetto**: `prompts.ts` contiene **4 "TASSATIVE"**, **3 "VIETATO"**, **3
"OBBLIGATORIO"**, *"pena il fallimento e la regressione del prompt"*, *"Pena: fallimento
generazione"*, 7 "MAI", 17 "NON", più maiuscolo enfatico diffuso. E **non spieghiamo quasi
mai il perché** di una regola.

**Le fonti, tutte e quattro**:
- OpenAI: *"not necessary to use all-caps or other incentives like bribes or tips."*
- Anthropic: *"dial back any aggressive language"* → causa **over-triggering**.
- Google (WP): *"a list of constraints can clash with each other"*; positivo > vincolo.
- Google (Gemini 3): *"Avoid unnecessary or overly persuasive language"*; le tecniche
  verbose ereditate rischiano di essere **over-analizzate**.

**Il rovescio della medaglia**: la regola con il miglior rapporto costo/beneficio — l'unica
senza controindicazioni — è quella che ignoriamo. Motivare *"non usare i link Markdown
**perché** l'agente li interpreterebbe come URL remoti"* funziona meglio di *"È
ASSOLUTAMENTE VIETATO… Pena: fallimento generazione"*.

**Nota di dominio**: i divieti restano legittimi per **safety** e **formato rigido**
(Microsoft li elenca fra le *top performing techniques* proprio per la safety). Alcune
nostre regole tassative sono di formato — quelle possono restare. Il problema è la
**forma minacciosa** e l'uso indiscriminato.

---

### 🟠 L4 — L'input dell'utente non è delimitato

**Il difetto**:

```js
chat.sendMessage([systemInstruction, finalInputForAI])
```

Il prompt da ottimizzare arriva **senza alcun confine**. Inoltre non usiamo il campo
**`systemInstruction` nativo** di Gemini: il meta-prompt viaggia come primo pezzo del
turno utente.

**Perché per *questo* prodotto è più grave che altrove**: il nostro input è **per
definizione sempre un insieme di istruzioni**. Il modello deve indovinare quali eseguire e
quali trasformare. È l'ambiguità strutturale più profonda che abbiamo, ed è esattamente il
caso che i delimitatori esistono per risolvere (OpenAI: *"use ### or `\"\"\"` to separate
the instruction and context"*; Google: *"Employ clear delimiters"*; Anthropic: *"Wrapping
each type of content in its own tag… reduces misinterpretation"*).

**La prova che sappiamo già farlo**: `buildRefineMessage` delimita
(`--- PROMPT DA RIFINIRE ---`). Il percorso "Rifinisci" è protetto, quello principale no.

**Corollario sul posizionamento**: con input lunghi il nostro ordine è invertito rispetto
alla raccomandazione (Google: contesto prima, **domanda in fondo**, con frase-ancora;
Anthropic quantifica fino al **+30%**).

---

### 🟡 L5 — Due dialetti di segnaposto che non si parlano

| Origine | Convenzione | Raccolta in UI | Sostituita |
|---|---|---|---|
| Output Gemini | `[QUADRE]` | ✅ `computeInitialVariables` | ✅ |
| Output "Rifinisci" | `{{GRAFFE}}` | ❌ mai | ❌ mai |

`CLAUDE_REFINE_INSTRUCTIONS` **ordina** di usare `{{...}}`; `computeInitialVariables`
raccoglie solo `[...]`; `promptLinter` **segnala come warning** i `{{...}}`. Dopo
"Rifinisci", l'utente riceve un avviso *"Segnaposto non risolti"* che **non può eliminare
dall'interfaccia**, per aver ottenuto esattamente ciò che avevamo chiesto.

**Aggravante**: la feature "Compila le variabili" si regge su **comportamento emergente** —
nessuna istruzione dice a Gemini di produrre `[VARIABILE]`, e `FLOW_CODE` addirittura
**vieta** i segnaposto tra quadre. Funziona per caso, in modo diverso da formato a formato.

---

### 🟡 L6 — Insegniamo agli utenti una regola superata

La scheda in-app **Chain of Thought** dice: *"Chiedi al modello di «pensare passo dopo
passo prima di rispondere»… **Utile su entrambi i modelli**."*

È scorretto su tre fonti indipendenti (OpenAI *"Avoid chain-of-thought prompts"*; Anthropic
CoT manuale = fallback; Sprague/Liu sui limiti e sui danni). Proprio *"utile su entrambi i
modelli"* è la parte insostenibile: **Claude e Gemini hanno entrambi il thinking nativo**.

---

### 🟡 L7 — Il linter contraddice i flussi

| Caso | Il flusso dice | Il linter fa |
|---|---|---|
| Domanda di follow-up | `FLOW_CHAT`: **prevista** per i task conversazionali | segnala qualunque riga finale con "?" |
| Segnaposto `{{}}` | `CLAUDE_REFINE`: **obbligatori** | segnala come "non risolti" |

Tre politiche diverse (generazione, rifinitura, lint) applicate allo stesso artefatto senza
una gerarchia dichiarata.

---

### 🟡 L8 — La logica del few-shot è invertita rispetto alla nostra stessa dottrina

`FLOW_CHAT` afferma correttamente che il few-shot va usato **solo** sui task format-driven.
Ma l'applicazione inietta gli esempi dell'utente in **tutti** i formati selezionati,
**incondizionatamente** — e li **duplica**: `exBlock` è appeso a ciascun flusso, quindi con
5 formati gli stessi esempi compaiono **5 volte** nella stessa richiesta.

Mancano inoltre le guardie prescritte: formattazione omogenea (Google: esempi disomogenei
producono *"responses with undesired formats"*), mescolamento delle classi in
classificazione, e coerenza esempi↔regole (OpenAI: *"ensure that any important behavior
demonstrated in your examples are also cited in your rules"*).

---

### 🟡 L9 — `temperature: 0.5` fissa, contro la raccomandazione per Gemini 3

Impostiamo `temperature: 0.5` per qualunque modello l'utente scelga dall'elenco dinamico.
Google, per Gemini 3.x: *"we strongly recommend keeping them at their default values"* e
*"If your existing code explicitly sets temperature… we recommend removing this parameter
and using the Gemini 3 default of 1.0"*, avvertendo che valori bassi possono causare
**looping o degrado**.

Più in generale non ri-tariamo nulla al cambio di modello, mentre Google prescrive:
*"When you change a model or model configuration, go back and keep experimenting."*

---

### ⚪ L10 — La "spiegazione tecnica" non è verificabile

Il campo `spiegazione` è prosa libera: dichiara migliorie senza doverle ancorare a nulla.
Microsoft documenta che le **citazioni inline** riducono la fabbricazione (*"the model must
make two errors every time"*). Chiedere che ogni miglioria citi la regola applicata e il
punto del prompt su cui agisce la renderebbe controllabile a costo quasi nullo.

---

## Parte 4 — Margini di miglioramento, per rapporto valore/costo

| # | Intervento | Risolve | Costo |
|---|---|---|---|
| 1 | **Delimitare l'input** (`<prompt_da_ottimizzare>`) e usare il campo `systemInstruction` nativo | L4 | basso |
| 2 | **Riscrivere lo stile dei meta-prompt**: togliere maiuscolo/minacce, convertire i divieti in istruzioni positive, **aggiungere il perché** alle regole chiave | L3 | medio |
| 3 | **Unificare i segnaposto** su una sola convenzione e allineare linter + estrattore variabili | L5, L7 | basso |
| 4 | **Correggere la scheda CoT** in-app (tutte le lingue) | L6 | basso |
| 5 | **Iniettare gli esempi una volta sola**, e solo nei formati che li ammettono | L8 | basso |
| 6 | **Una chiamata per formato** invece di una con 5 specifiche | L2 (e troncamento) | medio |
| 7 | **Non forzare `temperature`** sui modelli Gemini 3.x | L9 | basso |
| 8 | **Chiedere una `spiegazione` ancorata** (regola applicata + punto del prompt) | L10 | basso |
| 9 | **Un ciclo di valutazione reale**: eseguire il prompt prima/dopo su casi di prova e confrontare | **L1** | alto |

Il punto **9** è l'unico che cambia la natura del prodotto: trasformerebbe Prompt Optimizer
da *generatore di varianti plausibili* a *strumento che dimostra il miglioramento*. È anche
l'unico differenziatore che nessuno dei tool concorrenti censiti finora offre.

---

## Parte 5 — Da affrontare dopo i dieci punti

Questioni emerse durante l'implementazione, deliberatamente rimandate a dopo la
chiusura dei punti L. Non sono difetti dell'audit: sono domande che l'audit non
si era poste.

### P1 — La superficie di esposizione dei dati, oltre l'anonimizzazione

**Cosa è già coperto** (verificato nel codice, non presunto): "Rifinisci" e
"Valuta" ricevono il testo **RAW**, con i segnaposto di anonimizzazione intatti
— `ResultViewer.tsx:372` passa `result.promptChat`, non `shownText(...)`. La
de-anonimizzazione avviene **solo in locale**, al momento di mostrare, copiare o
scaricare (`ResultViewer.tsx:284-293`). Nessun dato mascherato raggiunge il
secondo provider.

**Cosa resta scoperto**, ed è il punto vero:

1. **L'anonimizzazione copre ciò che i regex riconoscono** — email, telefoni,
   carte, CCV — più le selezioni manuali. Nomi di persona, indirizzi, ragioni
   sociali, dettagli di progetto **non sono mascherati** e partono verso Gemini,
   e poi verso il provider di rifinitura.
2. **Il ripristino dipende dalla fedeltà del secondo provider**: se rifinendo il
   modello altera un segnaposto, il dato originale non è più recuperabile.
   `anon.intact` verifica questo sugli output Gemini; sugli output **rifiniti**
   la verifica non è altrettanto stretta.
3. **Due fornitori invece di uno**: anche perfettamente anonimizzato, il
   contenuto del prompt attraversa un secondo servizio. Le condizioni d'uso
   delle API a pagamento sono più protettive dei piani gratuiti, ma è una
   garanzia contrattuale, non tecnica.

**Perché non si risolve con un regex in più**: il punto 1 è un problema di
categoria, non di copertura. Un rilevatore di nomi propri produce falsi positivi
su ogni testo tecnico. Le direzioni sensate sono altre — dichiarare la superficie
in modo esplicito all'utente prima dell'invio, oppure rendere la rifinitura
un'operazione che l'utente sceglie consapevolmente per prompt, non una funzione
sempre disponibile allo stesso costo di privacy.

**Priorità**: dopo i punti L. Richiede una decisione di prodotto, non una
correzione.

### P2 — La fuga del meta-prompt nell'output

Osservato in run 13, `code-config-toml`, 1 osservazione su 30: il modello ha
copiato il token d'esempio `{{NOME_DESCRITTIVO}}` **e** ha riscritto la regola
che lo introduceva come se fosse una direttiva da consegnare all'utente.

Due rimedi indipendenti: rendere l'esempio non copiabile (ancorandolo a un dato
concreto) e — la causa radice — separare i ruoli, che è **L4**.

---

## Nota di metodo

Le citazioni provengono dalle pagine **attive** al 2026-08-27. Due avvertenze:

- La documentazione Anthropic è stata **consolidata**: le pagine per-tecnica
  (`use-xml-tags`, `chain-of-thought`, `system-prompts`, `prefill…`) ora **redirigono tutte**
  a *Prompting best practices*, affiancata da pagine per-modello.
- La frase *"There are no canonical 'best' XML tags"* esiste solo nella **pagina legacy**:
  resta vera (non è stata sostituita da un vocabolario canonico) ma non è più affermata da
  una pagina attiva. Va citata come storica.
