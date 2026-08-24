# Prompt engineering — best practice di riferimento

> Documento di ricerca versionato per `prompt-optimizer`. Raccoglie principi da
> fonti ufficiali/autorevoli per le 4 casistiche rilevanti per l'app, con
> l'obiettivo di informare (in blocchi di lavoro successivi) sia il
> refinement dei 3 flussi esistenti (Chat, Cowork, Code) sia il design del
> nuovo 4° flusso (System Prompt + User Prompt).
>
> Metodologia: 4 ricerche indipendenti condotte in parallelo, una per
> casistica, con priorità assoluta alla documentazione ufficiale dei vendor
> (Anthropic, Google; OpenAI come riferimento incrociato secondario). Fonti
> non verificabili (blog, opinioni non ufficiali) escluse; dove una fonte è
> stata usata solo come riferimento comparativo o non è stata verificata con
> fetch diretto, è segnalato esplicitamente nella nota di confidenza della
> sezione.
>
> Spec di origine: [`docs/superpowers/specs/2026-07-14-prompt-engineering-research-design.md`](superpowers/specs/2026-07-14-prompt-engineering-research-design.md).

---

## Chatbot conversazionale

### Principi chiave
1. **Structure prompts with XML tags** — Sia Anthropic che Google raccomandano ufficialmente di racchiudere le diverse componenti del prompt (contesto, istruzioni, esempi, input) in tag XML descrittivi come `<context>`, `<instructions>`, `<output_format>` per ridurre ambiguità di parsing. Fonte: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Gemini 3 prompting guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/gemini-3-prompting-guide)
2. **Give the model a role** — Impostare un ruolo (system prompt o inizio del messaggio) focalizza tono e comportamento del modello; anche una singola frase fa la differenza ed è utile per calibrare formalità/expertise. Fonte: [Prompting best practices — "Give Claude a role"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Gemini 3 prompting guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/gemini-3-prompting-guide)
3. **Be clear and direct** — Le istruzioni esplicite e specifiche battono quelle vaghe; il modello va trattato come "a brilliant but new employee" senza contesto implicito sulle convenzioni dell'utente. Fonte: [Prompting best practices — "Be clear and direct"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
4. **Add context/motivation behind instructions** — Spiegare il "perché" di una richiesta (non solo il "cosa") aiuta il modello a generalizzare correttamente il comportamento desiderato. Fonte: [Prompting best practices — "Add context to improve performance"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
5. **Use few-shot examples** — Entrambi i vendor raccomandano di includere esempi concreti (3–5 per Claude; Google dichiara che i prompt senza few-shot examples sono "likely to be less effective" per Gemini), racchiusi in tag dedicati come `<example>`. Fonte: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
6. **Tell the model what to do, not what not to do** — Per controllare formato/stile dell'output è più efficace dare istruzioni positive ("scrivi in prosa scorrevole") che negative ("non usare markdown"). Fonte: [Prompting best practices — "Control the format of responses"](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
7. **Conversational tone must be requested explicitly** — Gemini 3 per default produce risposte dirette ed efficienti; per ottenere un tono più discorsivo/dettagliato bisogna richiederlo esplicitamente nelle istruzioni. Fonte: [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
8. **Prioritize critical instructions at the top** — Ruolo, vincoli comportamentali essenziali e requisiti di formato vanno collocati in cima al system prompt o all'inizio del messaggio. Fonte: [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
9. **Language clarity checklist** — Google raccomanda di controllare ortografia di termini chiave, evitare frasi ambigue/frammentate, punteggiatura scorretta e acronimi non definiti. Fonte: [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
10. **System message defines role, tone and fallback behavior** *(cross-reference secondario, OpenAI, non verificato con fetch diretto)* — Il messaggio di sistema dovrebbe definire ruolo/confini dell'assistente, tono, formato di output, e comportamento di fallback esplicito quando mancano informazioni. Fonte: [Prompt engineering | OpenAI API](https://developers.openai.com/api/docs/guides/prompt-engineering)

### Esempi
**Structure prompts with XML tags**
- ✅ Do: `<context>L'utente è un principiante di Python.</context><task>Spiega le list comprehension con un esempio.</task>`
- ❌ Don't: Un unico blocco di testo che mescola contesto, compito e formato senza delimitatori.

**Give the model a role**
- ✅ Do: "You are a helpful coding assistant specializing in Python." prima della domanda.
- ❌ Don't: Nessun ruolo definito, sperando che il modello indovini il registro desiderato.

**Tell the model what to do, not what not to do**
- ✅ Do: "Rispondi con paragrafi discorsivi e naturali, come in una conversazione."
- ❌ Don't: "Non essere robotico" / "Non essere troppo formale".

**Conversational tone must be requested explicitly (Gemini)**
- ✅ Do: "Fornisci una risposta conversazionale e dettagliata, come se stessi discutendo il problema con un collega."
- ❌ Don't: Assumere che il modello sarà naturalmente discorsivo senza istruzioni esplicite.

### Applicabilità a prompt-optimizer
- Il template attuale usa già `<role>`, `<context>`, `<goal>`, `<output_format>` — allineato con la raccomandazione di entrambi i vendor. Nota: sia Anthropic che Google usano più spesso `<task>` invece di `<goal>` negli esempi ufficiali (i nomi restano flessibili, ma valuta l'allineamento).
- **Manca** qualsiasi menzione di **few-shot examples** (`<example>`) — entrambi i vendor la raccomandano fortemente, Google la considera quasi indispensabile per Gemini.
- Manca un'istruzione esplicita che forzi il tono discorsivo su Gemini (che di default è diretto/efficiente, a differenza di Claude) — rilevante perché questo flusso serve entrambe le web UI.
- Mancano "Add context/motivation behind instructions" e "tell the model what to do, not what not to do" come principi espliciti nel prompt di sistema del flusso.

### Fonti consultate
- [Prompting best practices — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — guida ufficiale Anthropic: clarity, XML tags, role prompting, few-shot, formato output.
- [Prompt design strategies — Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/prompting-strategies) — guida ufficiale Google: istruzioni chiare, few-shot, formato output, tono, checklist di chiarezza.
- [Gemini 3 prompting guide — Google Cloud Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/gemini-3-prompting-guide) — tag XML-style/Markdown, posizionamento ruolo/vincoli a inizio prompt.
- [Design chat prompts — Google Cloud Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/chat/chat-prompts) — prompt di chat multi-turno (fetch parziale, trattare come indicazione di massima).
- [Prompt engineering | OpenAI API](https://developers.openai.com/api/docs/guides/prompt-engineering) — cross-reference secondario, non verificato con fetch diretto.

**Confidenza**: alta per Anthropic e Google (`ai.google.dev`), moderata per le pagine Google Cloud specifiche (fetch parziale), bassa/da verificare per OpenAI.

---

## File di istruzioni per agenti (genere CLAUDE.md)

### Principi chiave
1. **Right altitude (né troppo prescrittivo né troppo vago)** — Le istruzioni devono essere abbastanza specifiche da guidare il comportamento in modo verificabile, ma abbastanza flessibili da non creare logica fragile che si rompe al primo caso non previsto. Fonte: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
2. **Minimalismo ad alto segnale** — Il set minimo di informazioni che descrive interamente il comportamento atteso; "minimo" non significa "corto", ma privo di rumore. Test: "se rimuovessi questa riga, l'agente sbaglierebbe?". Fonte: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) / [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
3. **Dimensione: sotto le 200 righe** — I file CLAUDE.md vengono caricati per intero a ogni sessione; oltre le ~200 righe consumano più contesto e l'aderenza alle regole cala. Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
4. **Specificità verificabile** — Preferire regole concrete e testabili ("Use 2-space indentation", "Run `npm test` before committing") a enunciati generici ("Format code properly"). Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
5. **Struttura con markdown headers e bullet** — Sezioni organizzate con `##` e liste puntate sono seguite meglio di paragrafi densi. Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
6. **Consistenza interna** — Regole contraddittorie tra sezioni (o tra più file CLAUDE.md annidati) fanno sì che l'agente scelga arbitrariamente quale seguire; vanno riviste e potate periodicamente. Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
7. **Explore → Plan → Implement → Commit** — Separare esplorazione/pianificazione dall'implementazione evita di risolvere il problema sbagliato; il piano va presentato e approvato prima di procedere. Fonte: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
8. **Dare all'agente un modo per verificare il proprio lavoro** — Un test, una build, uno screenshot da confrontare: senza un segnale pass/fail, "sembra finito" è l'unico criterio disponibile. Fonte: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
9. **CLAUDE.md ≠ enforcement** — Il file è contesto/istruzione, non è imposto a livello di sistema: non garantisce compliance stretta. Per esecuzione realmente vincolante servono gli hook, non il file di istruzioni. Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
10. **Interoperabilità con AGENTS.md** — Se un progetto usa già AGENTS.md (standard multi-vendor: Codex, Gemini, Copilot, Cursor), CLAUDE.md dovrebbe importarlo con `@AGENTS.md` invece di duplicarne il contenuto. Fonte: [How Claude remembers your project](https://code.claude.com/docs/en/memory) (pratica ufficiale Anthropic); convenzione del formato da [AGENTS.md](https://agents.md/) (secondario/comparativo).

### Esempi
**Specificità verificabile**
- ✅ Do: "API handlers live in `src/api/handlers/`"
- ❌ Don't: "Keep files organized"

**Right altitude / minimalismo**
- ✅ Do: elencare solo comandi bash non indovinabili, convenzioni di stile che divergono dai default, gotcha non ovvi
- ❌ Don't: descrizioni file-by-file della codebase o pratiche autoevidenti ("scrivi codice pulito")

**Dare un modo per verificare**
- ✅ Do: "write a validateEmail function. example test cases: user@example.com is true, invalid is false. run the tests after implementing"
- ❌ Don't: "implement a function that validates email addresses" (nessun criterio di successo verificabile)

**Explore → Plan → Implement**
- ✅ Do: leggere ed esporre un piano numerato, fermarsi per approvazione, poi implementare e verificare contro il piano
- ❌ Don't: passare direttamente all'implementazione su un task multi-file senza piano esplicito

### Applicabilità a prompt-optimizer
- **Fortemente allineato**: le regole "Plan Mode Mechanics" (piano numerato + STOP) e "Deterministic Verification" (test prima di eseguirli) del flusso "Code" ricalcano quasi esattamente il workflow ufficiale Explore→Plan→Implement→Commit.
- **Manca un vincolo di dimensione**: nessuna delle regole TASSATIVE menziona un limite di lunghezza. La guida ufficiale è esplicita: sotto le 200 righe, altrimenti l'aderenza cala. Da valutare una regola "Conciseness & Signal Density".
- **Divergenza consapevole da segnalare**: il divieto assoluto "non modificare mai CLAUDE.md" diverge dalla guida ufficiale, che tratta il file come "living documentation" da proporre di aggiornare. Probabile scelta di sicurezza intenzionale (evitare auto-modifica incontrollata) — da confermare come deviazione voluta, non omissione.
- **Assente il pattern AGENTS.md**: nessuna istruzione su come comportarsi se nel progetto esiste già un AGENTS.md (import via `@AGENTS.md`), rilevante perché Gemini CLI supporta nativamente AGENTS.md.
- Le regole "STRICT Paths" (niente link Markdown per i path) e "Architectural Clarity" sono scelte stilistiche proprietarie di prompt-optimizer senza corrispettivo diretto nelle fonti ufficiali — non in contraddizione, ma da non presentare come "regola ufficiale".

> **Nota trasversale** (emersa dalla ricerca, non azione di questo blocco): la
> soglia delle ~200 righe si applica anche al `CLAUDE.md` reale del progetto
> (quello promosso da `CLAUDE_new.md`), che oggi è molto più lungo. Da tenere
> presente per un'eventuale revisione futura, separata da questo flusso.

### Fonti consultate
- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — doc ufficiale su CLAUDE.md: posizionamento, caricamento, regole di scrittura efficace, import `@path`, interazione con AGENTS.md.
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) — pattern efficaci: verifica del lavoro, workflow explore→plan→implement→commit, tabella "include vs exclude".
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — "right altitude", minimalismo ad alto segnale, struttura XML/markdown.
- [AGENTS.md](https://agents.md/) — fonte secondaria/comparativa: specifica aperta multi-vendor.

**Confidenza**: alta — le prime tre fonti sono documentazione ufficiale Anthropic di prima mano. AGENTS.md è ufficiale del proprio standard ma resta comparativa, non Anthropic.

---

## Agenti collaborativi in workspace (Claude Cowork)

> Verificato: **"Claude Cowork" è un prodotto Anthropic reale e ufficialmente
> documentato** (claude.com/product/cowork, support.claude.com), non un nome
> informale — l'incertezza iniziale è stata risolta con fonti dirette.

### Principi chiave
1. **Accesso a whitelist, non a blacklist** — Cowork accede solo a cartelle e strumenti esplicitamente connessi dall'utente; il resto è irraggiungibile per default. Fonte: [Claude Cowork | Claude by Anthropic](https://claude.com/product/cowork)
2. **Modalità di approvazione graduate** — Tre modalità: *Manually Approve*, *Automatically Approve* (con controlli di sicurezza automatici), *Skip All Approvals*. Anche in Auto restano bloccate azioni sensibili come accesso a nuove cartelle. Fonte: [Get started with Claude Cowork](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
3. **Gating esplicito sulle azioni irreversibili** — L'eliminazione permanente di file richiede sempre approvazione esplicita, indipendentemente dalla modalità impostata. Fonte: [Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)
4. **Isolamento tecnico dei confini (sandboxing)** — Le sessioni remote girano in sandbox isolato senza accesso di rete privata di default; le sessioni locali limitano l'accesso file alle sole cartelle connesse. I confini sono vincoli architetturali, non solo istruzioni testuali. Fonte: [Claude Cowork architecture overview](https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview)
5. **Scope minimo per default** — Raccomandato creare cartelle di lavoro dedicate invece di concedere accesso ampio; evitare di esporre documenti finanziari/credenziali salvo necessità. Fonte: [Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)
6. **Monitoraggio dello scope-creep** — L'utente è invitato a sorvegliare se l'agente accede a risorse non menzionate o se il task si espande oltre il richiesto. Fonte: [Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)
7. **Trasparenza del piano prima dell'esecuzione** — La UX mostra il piano dell'agente e attende approvazione prima di azioni significative. Fonte: [Claude Cowork | Claude by Anthropic](https://claude.com/product/cowork); [Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents)
8. **Istruzioni orientate all'obiettivo, non al processo** — "Tell Claude what you need, not how": specificare il risultato desiderato lasciando che l'agente strutturi i passi. Fonte: [Claude Cowork | Claude by Anthropic](https://claude.com/product/cowork)
9. **Autonomia proporzionale all'affidabilità dimostrata** *(principio generale)* — autonomia crescente solo dopo affidabilità dimostrata; l'agente va istruito a segnalare all'umano i trade-off complessi. Fonte: [Lessons from Anthropic on building effective human-agent teams](https://claude.com/blog/building-effective-human-agent-teams)
10. **Checkpoint di feedback umano nei workflow multi-step** *(principio generale)* — pause deliberate per feedback a checkpoint o su blocchi, con condizioni di stop (es. max iterazioni). Fonte: [Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents)

### Esempi
**Accesso a whitelist, non a blacklist**
- ✅ Do: elencare esplicitamente le cartelle/risorse su cui l'agente può operare
- ❌ Don't: accesso genericamente ampio, sperando in autolimitazione per buon senso

**Gating sulle azioni irreversibili**
- ✅ Do: conferma esplicita sempre richiesta per cancellazioni, invii esterni, sovrascritture non recuperabili
- ❌ Don't: stessa soglia di approvazione per azioni reversibili e irreversibili

**Trasparenza del piano / istruzioni orientate all'obiettivo**
- ✅ Do: chiedere di esporre il piano prima di eseguire; formulare il task come risultato desiderato
- ❌ Don't: micromanagement dei singoli step operativi nel prompt iniziale

### Applicabilità a prompt-optimizer
- **Già allineato**: "Definisci i confini dell'agente" rispecchia whitelist esplicita e scope minimo — ma andrebbe reso più prescrittivo: il prompt dovrebbe istruire il modello a *far elencare esplicitamente* cosa è dentro/fuori scope, non solo menzionare l'esistenza di confini.
- **Da approfondire**: "istruzioni su quando chiedere feedback umano" manca la distinzione cruciale reversibile/irreversibile — proposta: "distingui esplicitamente azioni reversibili da irreversibili/distruttive e richiedi conferma umana sempre per queste ultime".
- **Mancante**: nessuna menzione della trasparenza del piano prima dell'esecuzione né dell'orientamento "obiettivo, non processo" — entrambi centrali nell'UX reale di Cowork. Proposta: tag `<plan_before_acting>` e formulare `<primary_task>` come outcome desiderato.
- **Mancante**: nessuna gestione dello scope-creep né dell'autonomia graduata — proposta: istruzione in `<collaboration_rules>` affinché l'agente segnali quando un task esce dal perimetro concordato.

### Fonti consultate
- [Claude Cowork | Claude by Anthropic](https://claude.com/product/cowork) — pagina prodotto ufficiale.
- [Get started with Claude Cowork](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork) — modalità di approvazione.
- [Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely) — linee guida di sicurezza.
- [Claude Cowork architecture overview](https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview) — isolamento tecnico.
- [The Claude Cowork product guide](https://claude.com/blog/the-claude-cowork-product-guide) — design collaborativo human-in-the-loop.
- [Building Effective AI Agents | Anthropic](https://www.anthropic.com/research/building-effective-agents) — guida generale su agenti.
- [Lessons from Anthropic on building effective human-agent teams](https://claude.com/blog/building-effective-human-agent-teams) — autonomia graduata.

**Confidenza**: alta — tutte le fonti da domini ufficiali Anthropic/Claude. I punti #9 e #10 sono principi generali (non specifici a Cowork), etichettati come tali.

---

## Separazione System Prompt / User Prompt strutturata

### Principi chiave
1. **Il system prompt è per ciò che è stabile, lo user prompt è per ciò che varia** — Analogia OpenAI: system/developer come definizione di funzione (regole, logica), user message come argomenti passati. Fonte: [Text generation – OpenAI API](https://developers.openai.com/api/docs/guides/text)
2. **Il ruolo/persona va nel system prompt** — Anthropic raccomanda di impostare un ruolo nel campo `system`; anche una singola frase ha impatto misurabile. Fonte: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
3. **Il developer message ha quattro componenti canoniche**: Identity, Instructions, Examples, Context. Fonte: [Text generation – OpenAI API](https://developers.openai.com/api/docs/guides/text)
4. **Vincoli di output e formato appartengono al system prompt** — Formato (Markdown/YAML/JSON), verbosità, formalità, livello di lettura target, per mantenerli costanti su tutte le richieste. Fonte: [Use system instructions – Firebase AI Logic](https://firebase.google.com/docs/ai-logic/system-instructions)
5. **`systemInstruction` di Gemini è un "preambolo"** applicato prima di ogni turno utente, separato dal contenuto utente: persona/ruolo, obiettivi/regole del task, contesto aggiuntivo, lingua di risposta. Fonte: [Use system instructions – Firebase AI Logic](https://firebase.google.com/docs/ai-logic/system-instructions)
6. **I dati variabili per-richiesta vanno sempre nello user turn, mai nel system** — L'API Messages di Anthropic è stateless; un messaggio system non può nemmeno essere il primo elemento dell'array `messages`, esiste apposta il campo top-level `system`. Fonte: [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
7. **Gerarchia di autorità: system/developer > user** — Priorità più alta in caso di conflitto, secondo il Model Spec OpenAI — luogo giusto per guardrail non sovrascrivibili dall'utente. Fonte: [OpenAI Developer Community](https://community.openai.com/t/system-and-developer-roles-in-messages-and-instructions-in-responses-create/1370516)
8. **Il system prompt NON garantisce sicurezza contro jailbreak o leak** — Google avverte che le system instructions guidano ma non impediscono jailbreak/divulgazioni; per dati sensibili servono meccanismi dedicati (response schema, safety settings). Fonte: [Use system instructions – Firebase AI Logic](https://firebase.google.com/docs/ai-logic/system-instructions)
9. **Documenti lunghi vanno nello user turn, ma posizionati per primi** — Anthropic raccomanda documenti lunghi (20k+ token) all'inizio del prompt utente, sopra la query; query alla fine può migliorare la qualità fino al 30%. Fonte: [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
10. **Implicazioni di caching: il contenuto stabile va all'inizio** — Anthropic (cache esplicito con `cache_control`) e Google (cache implicito su Gemini 2.5+) concordano: contenuto identico tra richieste va all'inizio e beneficia della cache; contenuto variabile va alla fine. Fonti: [Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Gemini 2.5 implicit caching](https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/)

### Esempi
**Function/arguments analogy (OpenAI)**
- ✅ Do: System = "Sei un assistente che riassume documenti legali in max 3 bullet point, tono neutro, in italiano." / User = "Riassumi questo contratto: [testo]"
- ❌ Don't: System = "Riassumi questo contratto: [testo]" (dato variabile infilato nel system prompt — non riutilizzabile, non cacheable, priorità di autorità sbagliata)

**Documenti lunghi (Anthropic)**
- ✅ Do: User turn = `<documents>...testo lungo...</documents>` seguito dalla domanda alla fine
- ❌ Don't: Documento di riferimento dentro il campo `system`, trattato come istruzione persistente invece che input per-richiesta

**Sicurezza (Google)**
- ✅ Do: System prompt per persona/formato/stile; meccanismi dedicati (response schema, safety settings) per dati sensibili
- ❌ Don't: Segreti o vincoli di sicurezza critici solo nel system prompt, aspettandosi che siano inviolabili

### Applicabilità a prompt-optimizer
- Il system prompt che istruirà Gemini a fare lo split dovrebbe applicare una regola binaria per ogni istruzione del prompt raw: **"Questa istruzione resterebbe identica se l'utente rieseguisse il task domani con dati diversi?"** Sì → System Prompt risultante (ruolo, persona, vincoli di formato/tono, guardrail, few-shot generici). No → User Prompt risultante.
- Verso **System**: ruolo/persona, constraint di stile/tono/lunghezza, formato di output, regole di sicurezza, esempi few-shot riutilizzabili.
- Verso **User**: la richiesta/task concreto, dati/documenti per questa esecuzione (anche se lunghi — comunque nello user turn, posizionati all'inizio se voluminosi), domande puntuali.
- Essendo un flow one-shot (non conversazione persistente), il caching non è direttamente rilevante in esecuzione, ma resta un buon euristico di design: se incerto se un frammento sia stabile o variabile, chiedersi se l'utente finale riuserebbe lo stesso System per richieste diverse — stesso criterio della cache-ability lato Anthropic/Google.
- Il system prompt del flow dovrebbe istruire Gemini a **non lasciare vuoto lo User Prompt** risultante e a **non duplicare contenuto identico in entrambi**, gestendo esplicitamente il caso di frasi che mescolano istruzioni persistenti e dati di richiesta.

### Fonti consultate
- [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) — struttura API, campo `system` vs array `messages`, natura stateless.
- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — role prompting, gestione documenti lunghi.
- [Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — cosa cachare vs cosa no, posizionamento del breakpoint.
- [Text generation – OpenAI API](https://developers.openai.com/api/docs/guides/text) — analogia funzione/argomenti, struttura Identity/Instructions/Examples/Context.
- [OpenAI Developer Community — system/developer roles](https://community.openai.com/t/system-and-developer-roles-in-messages-and-instructions-in-responses-create/1370516) — gerarchia di autorità.
- [Use system instructions – Firebase AI Logic (Google)](https://firebase.google.com/docs/ai-logic/system-instructions) — casi d'uso `systemInstruction`, avvertenze sicurezza.
- [Gemini 2.5 implicit caching – Google Developers Blog](https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/) — caching implicito automatico.

**Confidenza**: alta — fonti Anthropic e OpenAI di prima mano. La pagina Gemini `ai.google.dev/system-instructions` ha reso poco contenuto al fetch diretto; integrata con Firebase AI Logic (stesso team/API Google), comunque fonte primaria.

---

## File di istruzioni per Gemini (genere GEMINI.md)

### Principi chiave

1. **Hierarchical loading & concatenation** — Gemini CLI non legge un solo file: cerca `GEMINI.md` a livello globale (`~/.gemini/GEMINI.md`), a livello di progetto e nelle sottodirectory, poi *concatena* tutti i file trovati e li invia al modello a ogni prompt. Un file di progetto vive quindi dentro uno stack, non da solo. Fonte: [Provide context with GEMINI.md files](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)

2. **Closest file wins / specificità crescente** — Le istruzioni più vicine al file modificato hanno la precedenza: le regole generali stanno in alto nella gerarchia, quelle specifiche di componente nelle sottodirectory. Fonte: [Manage context and memory](https://geminicli.com/docs/cli/tutorials/memory-management/) / [AGENTS.md](https://agents.md/)

3. **Configurable filename (`context.fileName`)** — Il nome `GEMINI.md` è solo il default: in `settings.json` la chiave `context.fileName` accetta una stringa o un array (es. `["GEMINI.md", "AGENTS.md"]`). Un file ben scritto non deve dipendere dal proprio nome fisico. Fonte: [Gemini CLI Configuration Reference](https://geminicli.com/docs/reference/configuration)

4. **Modularità tramite import (`@file.md`)** — I file grandi si spezzano in componenti importati con la sintassi `@path/to/file.md`. Favorisce riuso e manutenzione invece di un unico file monolitico. Fonte: [GEMINI.md context files](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)

5. **Contesto, non enforcement (verificabilità via `/memory show` e `/memory list`)** — Il contenuto è puro contesto istruzionale anteposto al prompt; l'utente ispeziona esattamente cosa riceve il modello con `/memory show`. Scrivere per essere leggibili sotto ispezione. Fonte: [CLI Commands Reference](https://geminicli.com/docs/reference/commands)

6. **Refresh esplicito (`/memory refresh`)** — Le modifiche a un `GEMINI.md` durante una sessione non vengono rilevate automaticamente: serve `/memory refresh`. Le istruzioni devono essere stabili e non presupporre riletture continue. Fonte: [Manage context and memory](https://geminicli.com/docs/cli/tutorials/memory-management/)

7. **Contenuto ad alto segnale (persona, stile, comandi build/test)** — I file danno istruzioni project-specific, definiscono una persona e forniscono guide di stile per risposte più accurate. Solo ciò che alza la qualità dell'output. Fonte: [GEMINI.md context files](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)

8. **Reason-before-act (guida di prompting ufficiale Google)** — Istruzioni chiare e dirette, pianificare e ragionare prima di agire, fornire il contesto prima e l'istruzione specifica alla fine, strutturare con heading Markdown o tag XML-style. Fonte: [Gemini API — Prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)

9. **Interoperabilità con AGENTS.md** — `AGENTS.md` è uno standard aperto cross-tool (Agentic AI Foundation / Linux Foundation) che Gemini CLI supporta via `context.fileName`. In un monorepo "il file più vicino al file modificato vince". Fonte: [AGENTS.md](https://agents.md/)

10. **Few-shot ed esempi di formato** — Google segnala che i prompt senza esempi few-shot tendono a essere meno efficaci; includere esempi che mostrino il formato e le convenzioni desiderate. Fonte: [Gemini API — Prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)

### Esempi

**Modularità tramite import**
- ✅ Do: `@./docs/style-guide.md` per importare la guida di stile in un file principale snello.
- ❌ Don't: incollare 400 righe di regole di stile inline in un unico `GEMINI.md`.

**Closest file wins / gerarchia**
- ✅ Do: regole globali di progetto nel `GEMINI.md` root; convenzioni del pacchetto in `packages/api/GEMINI.md`.
- ❌ Don't: duplicare le regole del backend nel file root sperando che il modello capisca a quale cartella si applicano.

**Contenuto ad alto segnale**
- ✅ Do: "Build: `pnpm build`. Test: `pnpm test`. Usa import ESM, mai CommonJS."
- ❌ Don't: "Questo è un ottimo progetto costruito con cura; per favore scrivi sempre codice pulito."

**Reason-before-act + formato**
- ✅ Do: "Prima di modificare, elenca i file che cambierai e attendi conferma. Rispondi in italiano."
- ❌ Don't: lasciare implicito l'ordine delle operazioni e il formato dell'output.

### Applicabilità a prompt-optimizer

- Il meta-prompt che istruisce Gemini a *generare* un `GEMINI.md` deve rendere il file consapevole della gerarchia: produrre contenuto adatto al livello dichiarato (globale `~/.gemini/`, root di progetto, o sottodirectory) e non ripetere regole di un livello superiore — grande differenziatore rispetto al flow "Claude Code", dove `CLAUDE.md` è concepito più come singolo file con import di `@AGENTS.md`, mentre qui la concatenazione multi-livello e il "closest wins" sono nativi del tool.
- Codificare la *neutralità rispetto al nome file*: poiché `context.fileName` è configurabile e può includere `AGENTS.md`, il contenuto non deve auto-referenziarsi come "questo GEMINI.md"; deve funzionare anche se rinominato/aliasato. Idealmente compatibile con lo standard AGENTS.md (build/test, code style, commit/PR).
- Favorire la modularità: con input lungo, suggerire (o generare) uno scheletro con `@import` verso sotto-file tematici invece di un blob monolitico — a differenza del default CLAUDE.md, dove l'import è tipicamente un solo `@AGENTS.md`.
- Ottimizzare per verificabilità e stabilità: heading Markdown + bullet ad alto segnale, comandi build/test verificabili, istruzioni "reason-before-act", niente contenuti che presuppongano ricariche automatiche (l'utente fa `/memory refresh` a mano). Conciso e non ridondante come per CLAUDE.md.

### Fonti consultate
- [Provide context with GEMINI.md files — gemini-cli docs (GitHub)](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md) — scopo, gerarchia di caricamento, concatenazione, import `@file.md`.
- [Manage context and memory — Gemini CLI tutorial](https://geminicli.com/docs/cli/tutorials/memory-management/) — caricamento gerarchico e comandi `/memory`.
- [CLI Commands Reference — Gemini CLI](https://geminicli.com/docs/reference/commands) — `/memory list`, `/memory refresh`, `/memory show`.
- [Configuration Reference — Gemini CLI](https://geminicli.com/docs/reference/configuration) — chiavi `settings.json`: `context.fileName`, `context.importFormat`, ecc.
- [AGENTS.md — standard aperto](https://agents.md/) — standard, contenuti consigliati, "closest file wins", supporto Gemini CLI.
- [Gemini API — Prompting strategies (ai.google.dev)](https://ai.google.dev/gemini-api/docs/prompting-strategies) — istruzioni chiare, contesto-prima, few-shot, reason-before-act.

**Confidenza**: alta — fonti in larga parte ufficiali (repo `google-gemini/gemini-cli`, mirror `geminicli.com`, `agents.md`, `ai.google.dev`), concordi tra loro. Gap: alcune pagine `docs/get-started/` su GitHub davano 404, sopperite col mirror `geminicli.com` (che rispecchia il repo ufficiale).

---

## Osservazioni trasversali

Temi ricorrenti in più di una casistica, utili per il blocco 2 (nuovo flusso) e 3 (refactor):

- **Trasparenza del piano prima di agire** compare sia nel genere CLAUDE.md (Explore→Plan→Implement, già presente nel flusso Code) sia in Cowork (mostrare il piano, attendere approvazione) — un principio condiviso che vale la pena rendere esplicito anche nel flusso Cowork, dove oggi manca.
- **Distinguere stabile da variabile** è il criterio decisionale centrale sia per System vs User prompt sia, indirettamente, per cosa va o non va cachato — utile come euristica unica da riusare nel design del 4° flusso.
- **Verificabilità concreta** (un test, un criterio pass/fail) ricorre sia nel genere CLAUDE.md ("dare un modo per verificare il lavoro") sia implicitamente nell'approccio corretto agli esempi few-shot per il flusso Chat.
- **Confini espliciti e whitelist, non blacklist** è centrale in Cowork ed è un principio applicabile anche a come formuliamo i vincoli nel flusso Code (scope dei file modificabili).
