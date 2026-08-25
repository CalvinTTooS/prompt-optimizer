# Proposta di modifica al metodo — integrazione selettiva di un ruleset di riferimento

> **Stato: APPLICATO nel repo canonico (2026-08-25).** Punti 3 e 5 integrati;
> `METHOD.md` e `CLAUDE.md` (root + template) portati a **v0.5**; `lessons.md`
> creato; drift interno di `METHOD.md` riconciliato. Resta da **propagare ai fork**
> (Pro, mobile) con `npm run sync:standards`. Questo documento vale ora come
> **registro delle modifiche + procedura** per i fork.
>
> Fonte del confronto: gap analysis tra il nostro metodo (`docs/METHOD.md` +
> `CLAUDE.md`) e un ruleset operativo di riferimento per agenti di coding.

## Decisioni

| # | Punto | Esito | Dove |
|---|-------|-------|------|
| 3 | Self-improvement loop (`lessons.md`) | ✅ **integrare** | METHOD.md (principio) + CLAUDE.md (trigger) + file starter `lessons.md` |
| 5 | Demand elegance (bilanciata) | ✅ **integrare** | CLAUDE.md (un bullet nel Workflow) |
| 2 | Subagent strategy | ❌ **escluso** | — (condizionato al tool, rischia di intralciare il processo) |
| 6 | Autonomous bug fixing | ❌ **escluso** | — (in conflitto con l'approccio approval-first) |

---

## Punto 3 — Self-improvement loop (`lessons.md`)

**Perché.** `WORK_LOG` è un *diario* (cosa è successo); manca un *ruleset*
(cosa fare diversamente). Nel vibe coding tra sessioni è il punto che più riduce
il "l'AI ripete lo stesso errore": ogni correzione diventa una regola durevole.

**Testo proposto — in `METHOD.md`** (nuovo capoverso nella sezione "workflow
AI-assistito", dopo "Contesto come artefatto"):

> **Loop di auto-miglioramento.** Dopo ogni correzione dell'utente, annota in
> `lessons.md` una **regola** (non un racconto): *cosa evitare / cosa fare*, in
> una riga, col perché. A inizio sessione rileggi le lezioni pertinenti al task.
> Tieni `lessons.md` corto e ad alto segnale: quando una lezione è stabile e
> generale, **promuovila** in `CLAUDE.md` (se operativa) o `METHOD.md` (se di
> metodo) e rimuovila da `lessons.md`. È memoria di lavoro, non un archivio.

**Testo proposto — in `CLAUDE.md`** (un bullet nel "Workflow — a ogni modifica"):

> - Dopo una **correzione**: aggiungi la regola in `lessons.md` (una riga +
>   perché). Rileggi `lessons.md` pertinente a **inizio sessione**.

**File starter `lessons.md`** — creato **in questo repo** (dogfooding, visibile e
pronto all'uso). Nei **progetti generati** dallo scaffold non si spedisce un file
fisico: `CLAUDE.md`/`METHOD.md` lo **referenziano** e il progetto lo crea alla
prima lezione, esattamente come `WORK_LOG` (wiring nel generatore = eventuale
follow-up, non necessario ora). Contenuto dello starter:

> ```markdown
> # lessons.md — regole apprese dalle correzioni
> #
> # Una riga per lezione: REGOLA — perché. Tieni il file corto (~30 righe max).
> # Quando una lezione è stabile e generale, promuovila in CLAUDE.md o METHOD.md
> # e rimuovila da qui. È memoria di lavoro, non un archivio.
>
> (nessuna lezione ancora)
> ```

**Guardia anti-bloat:** tetto ~30 righe + regola di promozione già citata. Senza,
`lessons.md` marcisce come ogni doc. Va aggiunto all'elenco file canonici in
`CLAUDE.md` (sezione Documentazione).

---

## Punto 5 — Demand elegance (bilanciata)

**Perché.** Manca solo il *checkpoint esplicito* sulle modifiche non banali;
tenuto bilanciato o diventa over-engineering (l'opposto di impatto-minimo/YAGNI).

**Testo proposto — in `CLAUDE.md`** (un bullet nel "Workflow — a ogni modifica"):

> - Per modifiche **non banali**: prima di consolidare, chiediti *"c'è un modo
>   più semplice/elegante?"*; se la soluzione è una pezza, rifalla pulita.
>   **Salta per i fix banali** — YAGNI vince, niente gold-plating.

---

## Esclusi

- **Punto 2 — Subagent strategy**: utile solo se il runtime li supporta e, come
  fai notare, rischia di intralciare più che aiutare. Fuori.
- **Punto 6 — Autonomous bug fixing**: in conflitto con l'approccio
  **approval-first** (piano → STOP → conferma), che resta la nostra scelta.

---

## Strategia di allineamento dei fork

Obiettivo: tenere i file di metodo **identici** su tutti i fork. C'è una finezza
che rende il "rimpiazzo i .md a mano" non del tutto banale: **i file non sono
tutti uguali per natura.**

**Tre categorie di file:**
1. **Pienamente condivisi** (identici ovunque) → si possono **sostituire in
   blocco**: `METHOD.md`, `AGENTS.md`, `profiles/*.md`.
2. **Parzialmente condivisi** → `CLAUDE.md`: la parte **operativa** (sopra il
   marcatore `# Progetto`) è condivisa; la sezione **Progetto** sotto è
   *specifica del fork*. **NON** si può rimpiazzare in blocco, o cancelli il
   contesto di ogni progetto.
3. **Per-progetto** (mai sincronizzare): `lessons.md`, `WORK_LOG`, e la sezione
   "Progetto" di `CLAUDE.md`.

**Opzioni:**

- **A — Copia manuale** (la tua idea "rimpiazzo i .md"): semplice, zero infra;
  ma devi ricordartene, ed è pericolosa su `CLAUDE.md` (sovrascriverebbe la
  sezione Progetto del fork).
- **B — Script di sync (consigliato):** un solo comando `sync-standards
  <cartella-fork>` che: (1) copia in blocco `METHOD.md`/`AGENTS.md`/`profiles/*`;
  (2) per `CLAUDE.md` **innesta** la parte operativa canonica *sopra* il
  marcatore `# Progetto`, **preservando** la sezione Progetto del fork (riusa lo
  stesso marcatore già usato da `scaffoldBuilder.ts`); (3) non tocca mai
  `lessons.md`/`WORK_LOG`. Fonte di verità unica: `app/scaffold-template/`.
  Cattura la tua idea ("rimpiazzare i file"), ma in modo sicuro e in un comando.
- **C — git subtree/submodule:** standard condivisi in un repo dedicato, incluso
  in ogni fork. È il DRY "corretto", ma pesante e ostico per un uso solista.

**Realizzato:** `scripts/sync-standards.mjs` (`npm run sync:standards`) — è
l'opzione A automatizzata in sicurezza (== opzione B): copia in blocco i file
condivisi, splice del preambolo di `CLAUDE.md` sul marcatore `## Contesto del
progetto`, e `generate:scaffold` nel fork. Uso: `npm run sync:standards -- "prompt
optimizer pro"`.

## Propagazione e versione

- Fonte di verità = `app/scaffold-template/`; dopo le modifiche, rigenerare le
  costanti (`npm run generate:scaffold`). **Fatto** in questo repo.
- I due `METHOD.md` restano **due rendering** dello stesso metodo: differiscono
  **per design** nello stile dei riferimenti — `docs/METHOD.md` usa pointer
  concreti ("→ CLAUDE.md"), `app/scaffold-template/METHOD.md` usa segnaposto
  ("→ PARTE 2") perché spedito a progetti ancora da creare. **Non** vanno resi
  identici byte-per-byte; si allineano per **contenuto** e **versione**.
- Versione allineata a **v0.5** su: `docs/METHOD.md` (era v0.3.1),
  `app/scaffold-template/METHOD.md` (era v0.4), `app/scaffold-template/CLAUDE.md`
  (era v0.4). Modifiche **solo additive**.
- Fork: propagare con `npm run sync:standards` su `prompt optimizer pro` e
  `prompt optimizer mobile`.

## Cosa NON cambia

- Impostazione **approval-first** invariata.
- Nessuna regola esistente riscritta: la proposta è **solo additiva**.

## Prossimo passo

Fatto nel repo canonico. Resta da:
1. Propagare ai fork: `npm run sync:standards -- "prompt optimizer pro"` e idem per
   `"prompt optimizer mobile"`; poi in ciascun fork `npm run lint && npm test` e
   commit.
2. (Opzionale) Wiring di `lessons.md` come file fisico nei progetti generati
   (generatore + builder + packager + test) — non necessario ora.
