# Changelog

Tutte le modifiche rilevanti a Prompt Optimizer. Formato ispirato a
[Keep a Changelog](https://keepachangelog.com/it/); versioni secondo
[SemVer](https://semver.org/lang/it/).

## [1.2.0] — 2026-08-27

### Aggiunto
- **Verificatore di conformità per formato** (`app/lib/conformance.ts`): controlla
  che il prompt generato rispetti le regole che il suo formato dichiara in
  `app/constants/prompts.ts`. In app compare come badge sotto ogni variante, con
  l'elenco delle regole e **la prova** di ogni violazione. Verifica **solo regole
  decidibili da un parser**: quelle che richiedono giudizio non vengono valutate,
  per non produrre falsi positivi.
- **Harness di regressione sui prompt** (`npm run eval`): esegue un corpus fisso
  di **66 casi** attraverso i meta-prompt reali e riporta il **tasso di conformità
  per regola**. Modello **fissato** (`gemini-3.5-flash-lite`) e **3 ripetizioni**
  per caso, perché la generazione non è deterministica. È uno strumento di
  sviluppo: non gira mai nell'app né consuma la quota dell'utente.

### Modificato
- `buildOptimizerSystemInstruction` estratta in `app/lib/promptOptimizer.ts` e
  condivisa da produzione e harness: la copia dentro l'harness era **già
  divergente**, quindi misurava un prompt che non abbiamo mai spedito.
- Badge di conformità in posizione **uniforme** su tutte le varianti (prima era
  sopra i pulsanti nella coppia System+User e sotto nelle altre).

### Rimosso
- `app/lib/promptLinter.ts`: applicava **3 regole generiche** identiche a tutti e
  cinque i formati — mentre i flussi ne dichiarano una quarantina — e
  **contraddiceva** i flussi in due punti (segnalava le domande di follow-up che
  `FLOW_CHAT` prevede, e i segnaposto `{{...}}` che la rifinitura impone).

## [1.1.1] — 2026-08-26

### Corretto
- Il generatore delle costanti dello scaffold
  (`scripts/generate-scaffold-constants.mjs`) ora **normalizza i fine-riga a LF**.
  Legge i `.md` dal working tree, che su Windows (`core.autocrlf=true`) contiene
  CRLF: quei `\r\n` finivano **dentro le stringhe** del file generato come
  contenuto — dove git non può normalizzarli — rendendo l'output dipendente dalla
  piattaforma, sporcando il repo a ogni build e incidendo CRLF negli scaffold
  generati per gli utenti. L'output è ora deterministico e idempotente.

## [1.1.0] — 2026-08-25

### Aggiunto
- **Loop di auto-miglioramento (`lessons.md`)** negli output pensati per lo
  sviluppo software iterativo: i flussi **Claude Code** (`FLOW_CODE`) e **Gemini**
  (`FLOW_GEMINI`) e la modalità **Scaffold strutturato** ora includono
  l'istruzione di mantenere un `lessons.md` — annota una regola dopo ogni
  correzione, rileggi a inizio sessione, promuovi le lezioni stabili nel file di
  istruzioni principale. **Escluso** dai flussi "usa-e-getta" (Chat, System+User,
  Cowork), dove non serve.
- **Documento delle strategie di ottimizzazione**
  ([`docs/strategie-ottimizzazione.md`](docs/strategie-ottimizzazione.md) + EN
  [`docs/optimization-strategies.md`](docs/optimization-strategies.md)), linkato
  dal README: spiega, per ogni formato, la strategia realmente applicata dal
  programma (basata sui prompt reali in `app/constants/prompts.ts`).
- Script di sviluppo **`npm run sync:standards`** per allineare in sicurezza i
  file di metodo tra i fork.

### Modificato
- Metodologia (`docs/METHOD.md` + template dello scaffold) portata a **v0.5**:
  aggiunti il principio del loop di auto-miglioramento e un checkpoint di
  "eleganza" (con guardia YAGNI) nel workflow.
- Allineati per contenuto e versione `docs/METHOD.md` e
  `app/scaffold-template/METHOD.md`. Nota: restano **due rendering per design** —
  `docs/` usa riferimenti concreti (es. "→ CLAUDE.md"), il template usa segnaposto
  ("→ PARTE 2") perché destinato a progetti ancora da creare. **Non vanno resi
  identici byte-per-byte.**

## [1.0.0] — 2026-08-24

- Primo rilascio pubblico — edizione solo-API (Google Gemini): anonimizzazione PII
  (email, telefono, carte con validazione Luhn) lato dispositivo, 5 formati di
  ottimizzazione del prompt (Claude Chat, Cowork, Claude Code, System+User,
  `GEMINI.md`), rifinitura/valutazione con Claude o OpenAI, e modalità **Scaffold
  strutturato**.

[1.1.0]: https://github.com/CalvinTTooS/prompt-optimizer/releases/tag/v1.1.0
[1.0.0]: https://github.com/CalvinTTooS/prompt-optimizer/releases/tag/v1.0.0
