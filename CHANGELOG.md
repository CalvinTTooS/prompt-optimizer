# Changelog

Tutte le modifiche rilevanti a Prompt Optimizer. Formato ispirato a
[Keep a Changelog](https://keepachangelog.com/it/); versioni secondo
[SemVer](https://semver.org/lang/it/).

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
