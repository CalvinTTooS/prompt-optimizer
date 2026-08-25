# Prompt optimization strategies

**English** · [Italiano](strategie-ottimizzazione.md)

This document explains **what** Prompt Optimizer's optimization is based on: the
methods it applies, and why. It isn't generic theory — it describes the strategies
**actually** implemented in the program's system prompts
(`app/constants/prompts.ts`). If those prompts change, this document changes too.

The core idea: **there is no "perfect prompt" in the abstract** — there is the
right prompt *for a given target*. A chat, a CLI agent, and a System+User API pair
read instructions differently. The program takes your raw prompt and rewrites it
into the format suited to the target you choose, applying the strategies below.

---

## Cross-cutting principles (all formats)

- **Explicit structure.** A well-delimited prompt (XML tags in chats, Markdown
  headings in instruction files) is more reliable than a wall of text: the model
  can tell role, context, goal and output format apart.
- **Role priming.** Declaring *who* the model is ("you are an expert in…") steers
  tone, priorities and level of detail.
- **Clarity and step-by-step.** Concrete, sequential instructions beat vague
  requests. Every line should pass the test: *"if I removed it, would the model get
  it wrong?"*.
- **Conditional few-shot.** An input→output example helps **only** tasks with a
  repeated format (tables, classification, extraction, transforms). For open-ended
  tasks (narrative, explanation, advice) examples *hurt* — better to invest in role
  and output format.
- **Positive instructions.** Saying *what to do* is more effective than a list of
  bans; negative constraints stay for the things to genuinely avoid.
- **Placement.** Context and specific data go **early**; the pointed instruction
  often reads best **at the end**.
- **Reason before acting.** For non-trivial tasks, having the model plan/list the
  steps before producing output reduces errors (chain-of-thought, plan mode).
- **Self-sufficiency.** A "production" prompt asks the user no follow-up questions:
  it contains everything needed to run as-is.

---

## Per-model differences

Most best practices hold on **both** models; the genuine differences are few:

- **Google Gemini** — responds well to explicit structure and a declared output
  format; great for structured output (JSON, tables) when the schema is clear.
- **Anthropic Claude** — responds particularly well to **XML tags** and a
  well-defined role; in chats it rewards conversational, delimited instructions.

---

## Strategies per output format

The program generates up to five variants; each has a dedicated strategy.

### 1. Claude Chat (Web UI)
Optimizes for human, conversational, iterative interaction. Uses standard **XML
tags** (`<role>`, `<context>`, `<goal>`, `<output_format>`), a natural,
step-by-step style. Few-shot **only** if the task is format-driven. A follow-up
question only for conversational/explanatory tasks, never for a closed output (a
table, a rewrite, a classification).

### 2. Claude Cowork (Workspace Agent)
Optimizes for a collaborative agent in a shared environment. Uses workspace-oriented
tags (`<system>`, `<workspace_context>`, `<primary_task>`, `<collaboration_rules>`),
defines the agent's **boundaries** (what it may and may not change) and the
**human-approval points**.

### 3. Claude Code (CLI agent, `CLAUDE.md` genre)
Optimizes for autonomous execution in the terminal. Pure Markdown (no verbose XML),
with strict rules:
- **Strict paths in backticks**, never as Markdown links; absolute consistency in
  file and folder names.
- **Clear-cut architectural choices**, no ambiguous loopholes.
- **Plan mode**: present a numbered plan and **stop for approval** before acting.
- **Separate branch** always (`git checkout -b`).
- **Dynamic generation** via native tools (no hardcoded content, no placeholders
  like `[TODO]`).
- **Dependency & virtualenv** awareness; real **deterministic verification** (e.g.
  `py_compile`, `pytest` with the tests created first).
- **Working memory**: update `WORK_LOG.md` and keep a **self-improvement loop** on
  `lessons.md` (see below). Read `CLAUDE.md` at the start, never modify it.
- Speaks **only to the agent**: no reminders aimed at the human user.

### 4. System + User (structured API)
Splits the raw prompt into a **System / User** pair per API conventions. One routing
rule for each fragment: *"would it stay identical if you re-ran the task tomorrow
with different data?"* → **yes → System** (role, constraints, format, guardrails,
reusable few-shot); **no → User** (the concrete task, this run's data, pointed
questions). The User is never empty; no duplicated content across the two fields.

### 5. Gemini instruction file (`GEMINI.md` genre)
Generates a context file for Gemini CLI, tuned to its native conventions:
- **Hierarchical awareness**: Gemini CLI concatenates files (global → project →
  subdirectory), "closest file wins"; content is tuned to the declared level.
- **Filename neutrality**: the file doesn't self-reference by name (it may be called
  `AGENTS.md`), so it works even if renamed.
- **`AGENTS.md` interoperability**: build/test commands, code style, commit/PR
  conventions.
- **Verifiable specificity**: concrete commands (e.g. `npm test`), never phrases
  like "write clean code".
- **Modularity** with `@file.md` imports for large inputs.
- **Reason-before-act** and a **self-improvement loop** on `lessons.md` (see below).
- No auto-reload assumptions; no reminders aimed at the human user.

---

## Self-improvement loop (`lessons.md`)

Some formats don't produce a throwaway prompt but **instructions for an agent that
works on the same project across many sessions** (Claude Code and Gemini, plus the
**Structured scaffold** mode). For these, the program adds one more strategy: a
**self-improvement loop**.

> After every user **correction**, the agent records a concise **rule** in
> `lessons.md` (what to avoid / do + why) and re-reads `lessons.md` at the start of
> a session. **Stable, general** lessons are promoted into the main instruction file
> (`CLAUDE.md`/`GEMINI.md`) and removed from `lessons.md`, which stays **short,
> high-signal working memory** — not an archive.

Why **only** these formats? If you're optimizing *a single prompt* (a chat, a
System+User pair), there's no next session to improve: lesson memory isn't needed
and shouldn't be imposed. It belongs where an **evolving project** exists.

---

## PII anonymization (before every send)

Because the prompt is sent to Gemini, the program **masks sensitive data on your
device** *before* the call: emails, phones, cards (Luhn-validated) and CCVs become
placeholders like `[EMAIL_1]`. The model only sees the masked text; the real values
are **restored in the output**. The placeholders are intentional: the other
strategies (refine, evaluate, few-shot) leave them **identical**, never treating
them as a defect.

---

## Supporting strategies

- **Shared few-shot examples.** The examples you provide are injected into every
  selected format as a **model to emulate** (structure, rigor, level of detail),
  never copied verbatim.
- **Refine / Evaluate.** Each variant can be refined or evaluated with Claude or
  OpenAI: refine puts constraints on top, uses direct imperatives and `{{...}}`
  placeholders, makes the goal verifiable; evaluate checks verifiable goal, explicit
  constraints, ambiguity, self-sufficiency and structure (no numeric score).
- **Structured scaffold.** From a project description, the program fills the
  "Project" section of a template and assembles the full agent-instruction set
  (`CLAUDE.md` + `GEMINI.md` + `METHOD.md` + platform profiles) — with the
  `lessons.md` loop already included.

---

## Sources

The sourced research behind each format is in
[`docs/prompt-engineering-best-practices.md`](prompt-engineering-best-practices.md).
The actual operational instructions live in `app/constants/prompts.ts`.
