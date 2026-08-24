import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRefineMessage,
  parseRefineResult,
  DEFAULT_REFINE_MODEL,
  type RefineModel,
  type RefineResult,
  buildRefinePairMessage,
  parseRefinePairResult,
  type RefinePairResult,
} from '../lib/claudeRefine';
import {
  getStoredRefineModel,
  setStoredRefineModel,
} from '../lib/claudeRefineBridge';
import {
  buildEvalMessage,
  parseEvalResult,
  buildEvalPairMessage,
  type EvalResult,
} from '../lib/claudeEval';
import { accumulateUsage, EMPTY_USAGE, type CallUsage, type UsageTotals } from '../lib/claudeUsage';
import { availableProviders as computeAvailableProviders } from '../lib/providers/registry';
import type { LlmProvider } from '../lib/providers/types';

export type RefineViewState =
  | { status: 'idle' }
  | { status: 'refining' }
  | { status: 'done'; result: RefineResult; view: 'gemini' | 'claude' }
  | { status: 'error'; message: string };

const IDLE: RefineViewState = { status: 'idle' };

export type EvalViewState =
  | { status: 'idle' }
  | { status: 'evaluating' }
  | { status: 'done'; result: EvalResult }
  | { status: 'error'; message: string };

const EVAL_IDLE: EvalViewState = { status: 'idle' };

export type RefinePairViewState =
  | { status: 'idle' }
  | { status: 'refining' }
  | { status: 'done'; result: RefinePairResult; view: 'gemini' | 'claude' }
  | { status: 'error'; message: string };

const REFINE_PAIR_IDLE: RefinePairViewState = { status: 'idle' };

// Stato di una singola OPERAZIONE per un dato provider — mai 'done': il
// risultato "done" resta un'unica cosa condivisa per variantId (o per la
// coppia), aggiornata dall'ultimo provider che completa con successo
// (last-write-wins), così il toggle Gemini/Claude e il pannello "cosa ha
// cambiato" mostrano sempre "l'ultima rifinitura di un provider qualsiasi",
// mai a seconda di quale pulsante hai sotto il mouse. Solo 'refining'/'error'
// sono realmente per-provider: loading ed errore di un provider non devono
// mai toccare i pulsanti degli altri provider sulla stessa variante/coppia.
type OpStatus =
  | { status: 'idle' }
  | { status: 'refining' }
  | { status: 'error'; message: string };

const OP_IDLE: OpStatus = { status: 'idle' };

// Stessa idea per le operazioni di valutazione, ma con l'etichetta
// 'evaluating' (non 'refining'): deve restare assegnabile a EvalViewState,
// il cui stato "in corso" è letteralmente { status: 'evaluating' }.
type EvalOpStatus =
  | { status: 'idle' }
  | { status: 'evaluating' }
  | { status: 'error'; message: string };

const EVAL_OP_IDLE: EvalOpStatus = { status: 'idle' };

export interface RefineEnabled { master: boolean; anthropic: boolean; openai: boolean }
const ALL_ENABLED: RefineEnabled = { master: true, anthropic: true, openai: true };

export function useClaudeRefine(anthropicKey: string, openaiKey: string, enabled: RefineEnabled = ALL_ENABLED) {
  const [model, setModelState] = useState<RefineModel>(DEFAULT_REFINE_MODEL);
  // Baseline condivisa per variantId: solo 'idle'|'done' (mai 'refining'/
  // 'error' — quello vive in opStates, per-provider, vedi sotto).
  const [states, setStates] = useState<Record<string, RefineViewState>>({});
  // Stato per-operazione, chiave `refine:${providerId}:${variantId}`: qui
  // vivono 'refining'/'error', così ogni pulsante-provider mostra SOLO il
  // proprio stato in corso, senza contaminare gli altri provider sulla
  // stessa variante.
  const [opStates, setOpStates] = useState<Record<string, OpStatus>>({});
  // Set sincrono (non React state) di chiavi `op:providerId:variantId` con
  // un'operazione in corso: la guardia anti-doppio-click legge/scrive qui,
  // non nell'updater di setStates/setOpStates, perché React (batching
  // automatico) non garantisce che l'updater giri sincronamente prima della
  // riga successiva.
  const refiningIds = useRef<Set<string>>(new Set());
  const [evalStates, setEvalStates] = useState<Record<string, EvalViewState>>({});
  const [evalOpStates, setEvalOpStates] = useState<Record<string, EvalOpStatus>>({});
  // Ref distinto da refiningIds: valuta e rifinisci non devono bloccarsi a
  // vicenda per lo stesso variantId/providerId.
  const evaluatingIds = useRef<Set<string>>(new Set());
  // Baseline condivisa della coppia System+User (non c'è un variantId: la
  // coppia è "un'unica variante implicita"), stesso schema idle/done.
  const [refinePairSt, setRefinePairSt] = useState<RefinePairViewState>(REFINE_PAIR_IDLE);
  const [evalPairSt, setEvalPairSt] = useState<EvalViewState>(EVAL_IDLE);
  // Stato per-operazione della coppia, chiave `refinePair:${providerId}` /
  // `evaluatePair:${providerId}` (nessun variantId da comporre).
  const [pairOpStates, setPairOpStates] = useState<Record<string, OpStatus>>({});
  const [evalPairOpStates, setEvalPairOpStates] = useState<Record<string, EvalOpStatus>>({});
  // Guardie dedicate alla coppia System+User, chiave `op:providerId`:
  // distinte sia dalle guardie per-variantId sia l'una dall'altra (valuta e
  // rifinisci non si bloccano).
  const pairRefining = useRef<Set<string>>(new Set());
  const pairEvaluating = useRef<Set<string>>(new Set());
  // Consumo cumulato di sessione (in-memory, azzerato al riavvio) da ogni
  // chiamata provider (refine/valuta, singole e di coppia).
  const [usage, setUsage] = useState<UsageTotals>(EMPTY_USAGE);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await getStoredRefineModel();
      if (!active) return;
      setModelState(stored);
    })();
    return () => { active = false; };
  }, []);

  const availableProviders: LlmProvider[] = useMemo(
    () => computeAvailableProviders({
      anthropicKey: anthropicKey || null,
      openaiKey: openaiKey || null,
      masterEnabled: enabled.master,
      anthropicEnabled: enabled.anthropic,
      openaiEnabled: enabled.openai,
    }),
    [anthropicKey, openaiKey, enabled.master, enabled.anthropic, enabled.openai],
  );

  const resolveProvider = useCallback(
    (providerId: string): LlmProvider | undefined => availableProviders.find((p) => p.id === providerId),
    [availableProviders],
  );

  // Senza providerId: baseline condivisa (idle/done) per variante — usata dal
  // toggle Gemini/Claude e dal pannello "cosa ha cambiato", che devono
  // mostrare l'ultima rifinitura di QUALUNQUE provider, non di uno in
  // particolare. Con providerId: se quel provider ha un'operazione in corso
  // o fallita, quella vince (overlay); altrimenti ricade sulla baseline
  // condivisa (così un pulsante provider inattivo riflette comunque l'ultimo
  // risultato disponibile, senza risultare bloccato o in errore per colpa di
  // un altro provider).
  const stateFor = useCallback(
    (variantId: string, providerId?: string): RefineViewState => {
      if (providerId) {
        const op = opStates[`refine:${providerId}:${variantId}`];
        if (op && op.status !== 'idle') return op;
      }
      return states[variantId] ?? IDLE;
    },
    [states, opStates],
  );

  const setModel = useCallback((next: RefineModel) => {
    setModelState(next);
    void setStoredRefineModel(next);
  }, []);

  // Registra il consumo di una chiamata già estratto dal provider (null se il
  // provider non ha esposto metadati di consumo). Stabile → sicuro come dep
  // dei callback.
  const recordUsage = useCallback((call: CallUsage | null) => {
    if (call) setUsage((prev) => accumulateUsage(prev, call));
  }, []);

  const refine = useCallback(async (variantId: string, cleanedText: string, providerId: string) => {
    const guardKey = `refine:${providerId}:${variantId}`;
    if (refiningIds.current.has(guardKey)) return; // guardia doppio-click
    refiningIds.current.add(guardKey);
    setOpStates((prev) => ({ ...prev, [guardKey]: { status: 'refining' } }));
    try {
      const provider = resolveProvider(providerId);
      if (!provider) throw new Error(`Provider "${providerId}" non disponibile`);
      const { text, usage } = await provider.run(buildRefineMessage(cleanedText), model);
      recordUsage(usage);
      const result = parseRefineResult(text);
      setStates((prev) => ({ ...prev, [variantId]: { status: 'done', result, view: 'claude' } }));
      setOpStates((prev) => ({ ...prev, [guardKey]: OP_IDLE }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setOpStates((prev) => ({ ...prev, [guardKey]: { status: 'error', message } }));
    } finally {
      refiningIds.current.delete(guardKey);
    }
  }, [model, recordUsage, resolveProvider]);

  const toggleView = useCallback((variantId: string) => {
    setStates((prev) => {
      const s = prev[variantId];
      if (s?.status !== 'done') return prev;
      return { ...prev, [variantId]: { ...s, view: s.view === 'claude' ? 'gemini' : 'claude' } };
    });
  }, []);

  const evalStateFor = useCallback(
    (variantId: string, providerId?: string): EvalViewState => {
      if (providerId) {
        const op = evalOpStates[`evaluate:${providerId}:${variantId}`];
        if (op && op.status !== 'idle') return op;
      }
      return evalStates[variantId] ?? EVAL_IDLE;
    },
    [evalStates, evalOpStates],
  );

  const evaluate = useCallback(async (variantId: string, rawText: string, providerId: string) => {
    const guardKey = `evaluate:${providerId}:${variantId}`;
    if (evaluatingIds.current.has(guardKey)) return; // guardia doppio-click
    evaluatingIds.current.add(guardKey);
    setEvalOpStates((prev) => ({ ...prev, [guardKey]: { status: 'evaluating' } }));
    try {
      const provider = resolveProvider(providerId);
      if (!provider) throw new Error(`Provider "${providerId}" non disponibile`);
      const { text, usage } = await provider.run(buildEvalMessage(rawText), model);
      recordUsage(usage);
      const result = parseEvalResult(text);
      setEvalStates((prev) => ({ ...prev, [variantId]: { status: 'done', result } }));
      setEvalOpStates((prev) => ({ ...prev, [guardKey]: EVAL_OP_IDLE }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setEvalOpStates((prev) => ({ ...prev, [guardKey]: { status: 'error', message } }));
    } finally {
      evaluatingIds.current.delete(guardKey);
    }
  }, [model, recordUsage, resolveProvider]);

  const refinePairState = useCallback(
    (providerId?: string): RefinePairViewState => {
      if (providerId) {
        const op = pairOpStates[`refinePair:${providerId}`];
        if (op && op.status !== 'idle') return op;
      }
      return refinePairSt;
    },
    [refinePairSt, pairOpStates],
  );
  const evalPairState = useCallback(
    (providerId?: string): EvalViewState => {
      if (providerId) {
        const op = evalPairOpStates[`evaluatePair:${providerId}`];
        if (op && op.status !== 'idle') return op;
      }
      return evalPairSt;
    },
    [evalPairSt, evalPairOpStates],
  );

  const refinePair = useCallback(async (systemText: string, userText: string, providerId: string) => {
    const guardKey = `refinePair:${providerId}`;
    if (pairRefining.current.has(guardKey)) return; // guardia doppio-click
    pairRefining.current.add(guardKey);
    setPairOpStates((prev) => ({ ...prev, [guardKey]: { status: 'refining' } }));
    try {
      const provider = resolveProvider(providerId);
      if (!provider) throw new Error(`Provider "${providerId}" non disponibile`);
      const { text, usage } = await provider.run(buildRefinePairMessage(systemText, userText), model);
      recordUsage(usage);
      setRefinePairSt({ status: 'done', result: parseRefinePairResult(text), view: 'claude' });
      setPairOpStates((prev) => ({ ...prev, [guardKey]: OP_IDLE }));
    } catch (e) {
      setPairOpStates((prev) => ({ ...prev, [guardKey]: { status: 'error', message: e instanceof Error ? e.message : String(e) } }));
    } finally {
      pairRefining.current.delete(guardKey);
    }
  }, [model, recordUsage, resolveProvider]);

  const toggleRefinePairView = useCallback(() => {
    setRefinePairSt((s) => (s.status === 'done' ? { ...s, view: s.view === 'claude' ? 'gemini' : 'claude' } : s));
  }, []);

  const evaluatePair = useCallback(async (systemText: string, userText: string, providerId: string) => {
    const guardKey = `evaluatePair:${providerId}`;
    if (pairEvaluating.current.has(guardKey)) return; // guardia doppio-click
    pairEvaluating.current.add(guardKey);
    setEvalPairOpStates((prev) => ({ ...prev, [guardKey]: { status: 'evaluating' } }));
    try {
      const provider = resolveProvider(providerId);
      if (!provider) throw new Error(`Provider "${providerId}" non disponibile`);
      const { text, usage } = await provider.run(buildEvalPairMessage(systemText, userText), model);
      recordUsage(usage);
      setEvalPairSt({ status: 'done', result: parseEvalResult(text) });
      setEvalPairOpStates((prev) => ({ ...prev, [guardKey]: EVAL_OP_IDLE }));
    } catch (e) {
      setEvalPairOpStates((prev) => ({ ...prev, [guardKey]: { status: 'error', message: e instanceof Error ? e.message : String(e) } }));
    } finally {
      pairEvaluating.current.delete(guardKey);
    }
  }, [model, recordUsage, resolveProvider]);

  return {
    model,
    setModel,
    stateFor,
    refine,
    toggleView,
    evalStateFor,
    evaluate,
    refinePair,
    refinePairState,
    toggleRefinePairView,
    evaluatePair,
    evalPairState,
    usage,
    availableProviders,
  };
}
