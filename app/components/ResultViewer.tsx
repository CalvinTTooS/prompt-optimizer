'use client';
import type { OptimizerResult } from '../hooks/usePromptOptimizer';
import { REFINE_MODELS, TIER_LABELS, type RefineModel } from '../lib/claudeRefine';
import type { RefineViewState, EvalViewState, RefinePairViewState } from '../hooks/useClaudeRefine';
import { type EvalVerdict } from '../lib/claudeEval';
import {
  checkChat,
  checkCowork,
  checkCode,
  checkGemini,
  checkSystemUser,
  type ConformanceResult,
} from '../lib/conformance';
import { extractPlaceholders } from '../lib/placeholders';
import { toast } from '../lib/toast';
import { useT } from '../hooks/useT';

// Provider disponibile per i pulsanti Rifinisci/Valuta — sottoinsieme di
// LlmProvider (solo id+label: le controls UI non devono conoscere `run`).
export interface ProviderInfo {
  id: string;
  label: string;
}

interface ResultViewerProps {
  result: OptimizerResult;
  variables: Record<string, string>;
  onVariableChange: (key: string, value: string) => void;
  getCleanedPrompt: (rawText: string | undefined) => string;
  downloadMarkdown: (filename: string, prefix: string, content: string) => void;
  providers: ProviderInfo[];
  refineModel: RefineModel;
  onRefineModelChange: (m: RefineModel) => void;
  // Senza providerId: baseline condivisa per variante (idle/done,
  // last-write-wins) — alimenta shownText/toggle/pannello "cosa ha
  // cambiato". Con providerId: overlay per-provider (refining/error) usato
  // dai singoli pulsanti, così il loading/errore di un provider non tocca
  // gli altri sulla stessa variante.
  refineStateFor: (variantId: string, providerId?: string) => RefineViewState;
  onRefine: (variantId: string, rawText: string, providerId: string) => void;
  onToggleRefineView: (variantId: string) => void;
  refineEvalStateFor: (variantId: string, providerId?: string) => EvalViewState;
  onEvaluate: (variantId: string, rawText: string, providerId: string) => void;
  refinePairState: (providerId?: string) => RefinePairViewState;
  onRefinePair: (s: string, u: string, providerId: string) => void;
  onToggleRefinePairView: () => void;
  evalPairState: (providerId?: string) => EvalViewState;
  onEvaluatePair: (s: string, u: string, providerId: string) => void;
}

// Componente presentazionale hoisted fuori da ResultViewer (non definito
// durante il render) per rispettare react-hooks/static-components: riceve
// tutto ciò che le serve come props invece di catturarlo via closure.
interface RefineControlsProps {
  variantId: keyof OptimizerResult;
  providers: ProviderInfo[];
  state: RefineViewState; // baseline condivisa (toggle/"cosa ha cambiato")
  perProviderState: (providerId: string) => RefineViewState; // per il singolo pulsante
  rawText: string;
  onRefine: (variantId: string, rawText: string, providerId: string) => void;
  onToggleView: (variantId: string) => void;
  evalState: EvalViewState; // baseline condivisa (pannello verdetto)
  perProviderEvalState: (providerId: string) => EvalViewState; // per il singolo pulsante
  onEvaluate: (variantId: string, rawText: string, providerId: string) => void;
}

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function verdictLabel(verdict: EvalVerdict, t: TFunc): string {
  if (verdict === 'solido') return t('result.verdictSolido');
  if (verdict === 'migliorabile') return t('result.verdictMigliorabile');
  return t('result.verdictDaRivedere');
}

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

function verdictBadge(verdict: EvalVerdict): string {
  const base = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ';
  if (verdict === 'solido') return base + 'bg-green-900 text-green-200';
  if (verdict === 'migliorabile') return base + 'bg-amber-900 text-amber-200';
  return base + 'bg-red-900 text-red-200'; // da-rivedere
}

function RefineControls({ variantId, providers, state: s, perProviderState, rawText, onRefine, onToggleView, evalState, perProviderEvalState, onEvaluate }: RefineControlsProps) {
  const { t } = useT();
  if (providers.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {providers.flatMap((p) => {
          const ps = perProviderState(p.id);
          const pe = perProviderEvalState(p.id);
          return [
            <button
              key={`refine-${p.id}`}
              onClick={() => onRefine(variantId, rawText, p.id)}
              disabled={ps.status === 'refining'}
              className="bg-purple-900 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed text-purple-100 px-4 py-2 rounded-lg text-[11px] font-bold uppercase border border-purple-700"
            >
              {ps.status === 'refining' ? t('result.refining') : t('result.refineWith', { label: p.label })}
            </button>,
            <button
              key={`evaluate-${p.id}`}
              onClick={() => onEvaluate(variantId, rawText, p.id)}
              disabled={pe.status === 'evaluating'}
              className="bg-sky-900 hover:bg-sky-800 disabled:opacity-40 disabled:cursor-not-allowed text-sky-100 px-4 py-2 rounded-lg text-[11px] font-bold uppercase border border-sky-700"
            >
              {pe.status === 'evaluating' ? t('result.evaluating') : t('result.evaluateWith', { label: p.label })}
            </button>,
          ];
        })}
        {s.status === 'done' && (
          <button
            onClick={() => onToggleView(variantId)}
            className="text-[11px] font-bold uppercase text-gray-400 hover:text-gray-200 underline"
          >
            {s.view === 'claude' ? t('result.showGemini') : t('result.showClaude')}
          </button>
        )}
      </div>
      {providers.map((p) => {
        const ps = perProviderState(p.id);
        return ps.status === 'error' ? (
          <p key={`refine-err-${p.id}`} className="text-red-400 text-xs">{t('result.refineFailed', { label: p.label, message: ps.message })}</p>
        ) : null;
      })}
      {s.status === 'done' && s.view === 'claude' && s.result.changes && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer">{t('result.whatChanged')}</summary>
          <p className="mt-1 whitespace-pre-wrap">{s.result.changes}</p>
        </details>
      )}
      {providers.map((p) => {
        const pe = perProviderEvalState(p.id);
        return pe.status === 'error' ? (
          <p key={`eval-err-${p.id}`} className="text-red-400 text-xs">{t('result.evaluateFailed', { label: p.label, message: pe.message })}</p>
        ) : null;
      })}
      {evalState.status === 'done' && (
        <div className="text-xs flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={verdictBadge(evalState.result.verdict)}>{verdictLabel(evalState.result.verdict, t)}</span>
            {evalState.result.suggestion && <span className="text-gray-400">{evalState.result.suggestion}</span>}
          </div>
          {evalState.result.items.length > 0 && (
            <details className="text-gray-400">
              <summary className="cursor-pointer">{t('result.evaluationDetail')}</summary>
              <ul className="mt-1 space-y-0.5">
                {evalState.result.items.map((it, i) => (
                  <li key={i}>{it.ok ? '✓' : '⚠'} <b>{it.criterion}</b>{it.note ? ` — ${it.note}` : ''}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

interface PairControlsProps {
  providers: ProviderInfo[];
  refineState: RefinePairViewState; // baseline condivisa (toggle/"cosa ha cambiato")
  perProviderRefineState: (providerId: string) => RefinePairViewState;
  evalState: EvalViewState; // baseline condivisa (pannello verdetto)
  perProviderEvalState: (providerId: string) => EvalViewState;
  systemRaw: string;
  userRaw: string;
  conformance: ConformanceResult;
  onRefinePair: (s: string, u: string, providerId: string) => void;
  onToggleView: () => void;
  onEvaluatePair: (s: string, u: string, providerId: string) => void;
}

function PairControls({ providers, refineState: r, perProviderRefineState, evalState: ev, perProviderEvalState, systemRaw, userRaw, conformance, onRefinePair, onToggleView, onEvaluatePair }: PairControlsProps) {
  const { t } = useT();
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-gray-800 pt-3">
      <p className="text-gray-500 text-[10px] uppercase tracking-widest">{t('result.pairNote')}</p>
      {providers.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {providers.flatMap((p) => {
            const rs = perProviderRefineState(p.id);
            const es = perProviderEvalState(p.id);
            return [
              <button key={`refine-${p.id}`} onClick={() => onRefinePair(systemRaw, userRaw, p.id)} disabled={rs.status === 'refining'}
                className="bg-purple-900 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed text-purple-100 px-4 py-2 rounded-lg text-[11px] font-bold uppercase border border-purple-700">
                {rs.status === 'refining' ? t('result.refining') : t('result.refineWith', { label: p.label })}
              </button>,
              <button key={`evaluate-${p.id}`} onClick={() => onEvaluatePair(systemRaw, userRaw, p.id)} disabled={es.status === 'evaluating'}
                className="bg-sky-900 hover:bg-sky-800 disabled:opacity-40 disabled:cursor-not-allowed text-sky-100 px-4 py-2 rounded-lg text-[11px] font-bold uppercase border border-sky-700">
                {es.status === 'evaluating' ? t('result.evaluating') : t('result.evaluateWith', { label: p.label })}
              </button>,
            ];
          })}
          {r.status === 'done' && (
            <button onClick={onToggleView} className="text-[11px] font-bold uppercase text-gray-400 hover:text-gray-200 underline">
              {r.view === 'claude' ? t('result.showGemini') : t('result.showClaude')}
            </button>
          )}
        </div>
      )}
      {providers.map((p) => {
        const rs = perProviderRefineState(p.id);
        return rs.status === 'error' ? (
          <p key={`refine-err-${p.id}`} className="text-red-400 text-xs">{t('result.refineFailed', { label: p.label, message: rs.message })}</p>
        ) : null;
      })}
      {r.status === 'done' && r.view === 'claude' && r.result.changes && (
        <details className="text-xs text-gray-400"><summary className="cursor-pointer">{t('result.whatChanged')}</summary>
          <p className="mt-1 whitespace-pre-wrap">{r.result.changes}</p></details>
      )}
      {providers.map((p) => {
        const es = perProviderEvalState(p.id);
        return es.status === 'error' ? (
          <p key={`eval-err-${p.id}`} className="text-red-400 text-xs">{t('result.evaluateFailed', { label: p.label, message: es.message })}</p>
        ) : null;
      })}
      {ev.status === 'done' && (
        <div className="text-xs flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={verdictBadge(ev.result.verdict)}>{verdictLabel(ev.result.verdict, t)}</span>
            {ev.result.suggestion && <span className="text-gray-400">{ev.result.suggestion}</span>}
          </div>
          {ev.result.items.length > 0 && (
            <details className="text-gray-400"><summary className="cursor-pointer">{t('result.evaluationDetail')}</summary>
              <ul className="mt-1 space-y-0.5">{ev.result.items.map((it, i) => (<li key={i}>{it.ok ? '✓' : '⚠'} <b>{it.criterion}</b>{it.note ? ` — ${it.note}` : ''}</li>))}</ul>
            </details>
          )}
        </div>
      )}
      <ConformanceBadge result={conformance} />
    </div>
  );
}

export function ResultViewer({
  result,
  variables,
  onVariableChange,
  getCleanedPrompt,
  downloadMarkdown,
  providers,
  refineModel,
  onRefineModelChange,
  refineStateFor,
  onRefine,
  onToggleRefineView,
  refineEvalStateFor,
  onEvaluate,
  refinePairState,
  onRefinePair,
  onToggleRefinePairView,
  evalPairState,
  onEvaluatePair,
}: ResultViewerProps) {
  const { t } = useT();
  const shownText = (variantId: keyof OptimizerResult, original: string | undefined) => {
    const s = refineStateFor(variantId);
    // Claude riceve sempre il testo RAW (con segnaposto intatti, vedi
    // RefineControls più sotto) e li preserva nell'output rifinito, quindi
    // vanno de-anonimizzati qui prima di mostrarli/copiarli/scaricarli,
    // esattamente come il ramo Gemini.
    return s.status === 'done' && s.view === 'claude'
      ? getCleanedPrompt(s.result.refined)
      : getCleanedPrompt(original);
  };

  // Fill-in fields are derived from the RAW texts, originals and refined alike,
  // not from the displayed ones: `shownText` has already substituted whatever the
  // user typed, so deriving from it would make a field vanish the moment it was
  // filled. Including the refined variants is the point — refining rewrites the
  // prompt, and its placeholders used to be unreachable from this form.
  const rawVariantTexts = (['promptChat', 'promptCowork', 'promptCode', 'promptGemini'] as const).flatMap(
    (id) => {
      const s = refineStateFor(id);
      return [result[id], s.status === 'done' ? s.result.refined : undefined];
    },
  );
  const pair = refinePairState();
  const rawPairTexts =
    pair.status === 'done'
      ? [pair.result.refinedSystem, pair.result.refinedUser]
      : [];
  const variableKeys = extractPlaceholders([
    ...rawVariantTexts,
    result.promptSystem,
    result.promptUser,
    ...rawPairTexts,
  ]);

  const shownSystem = () => pair.status === 'done' && pair.view === 'claude'
    ? getCleanedPrompt(pair.result.refinedSystem) : getCleanedPrompt(result.promptSystem);
  const shownUser = () => pair.status === 'done' && pair.view === 'claude'
    ? getCleanedPrompt(pair.result.refinedUser) : getCleanedPrompt(result.promptUser);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-lg">
        <h2 className="text-xs font-black text-blue-600 uppercase mb-3 tracking-widest">{t('result.technicalAnalysis')}</h2>
        <p className="text-gray-700 italic leading-relaxed">&quot;{result.spiegazione}&quot;</p>
      </div>

      {variableKeys.length > 0 && (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <h2 className="font-black text-gray-900 mb-6 text-sm uppercase tracking-widest">{t('result.fillVariables')}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {variableKeys.map((key) => (
              <div key={key}>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{key}</label>
                <input type="text" className="w-full p-3 border-2 border-gray-50 rounded-xl bg-gray-50 focus:border-blue-400 outline-none text-sm" value={variables[key] ?? ''} onChange={(e) => onVariableChange(key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-950 p-10 rounded-[2.5rem] relative shadow-2xl border-4 border-gray-900">
        <h2 className="text-gray-500 text-xs font-black uppercase tracking-[0.3em] mb-6">{t('result.outputGenerated')}</h2>

        {providers.length > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{t('result.refineModelLabel')}</label>
            <select
              value={refineModel}
              onChange={(e) => onRefineModelChange(e.target.value as RefineModel)}
              className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2 py-1 border border-gray-700"
            >
              {REFINE_MODELS.map((m) => (
                <option key={m} value={m}>{TIER_LABELS[m]}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-8">
          {result.promptChat && (
            <div>
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionChat')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownText('promptChat', result.promptChat)}</pre>
              <RefineControls
                variantId="promptChat"
                providers={providers}
                state={refineStateFor('promptChat')}
                perProviderState={(providerId) => refineStateFor('promptChat', providerId)}
                rawText={result.promptChat}
                onRefine={onRefine}
                onToggleView={onToggleRefineView}
                evalState={refineEvalStateFor('promptChat')}
                perProviderEvalState={(providerId) => refineEvalStateFor('promptChat', providerId)}
                onEvaluate={onEvaluate}
              />
              <ConformanceBadge result={checkChat(shownText('promptChat', result.promptChat))} />
            </div>
          )}
          {result.promptCowork && (
            <div>
              <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionCowork')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownText('promptCowork', result.promptCowork)}</pre>
              <RefineControls
                variantId="promptCowork"
                providers={providers}
                state={refineStateFor('promptCowork')}
                perProviderState={(providerId) => refineStateFor('promptCowork', providerId)}
                rawText={result.promptCowork}
                onRefine={onRefine}
                onToggleView={onToggleRefineView}
                evalState={refineEvalStateFor('promptCowork')}
                perProviderEvalState={(providerId) => refineEvalStateFor('promptCowork', providerId)}
                onEvaluate={onEvaluate}
              />
              <ConformanceBadge result={checkCowork(shownText('promptCowork', result.promptCowork))} />
            </div>
          )}
          {result.promptCode && (
            <div>
              <h3 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionCode')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownText('promptCode', result.promptCode)}</pre>
              <RefineControls
                variantId="promptCode"
                providers={providers}
                state={refineStateFor('promptCode')}
                perProviderState={(providerId) => refineStateFor('promptCode', providerId)}
                rawText={result.promptCode}
                onRefine={onRefine}
                onToggleView={onToggleRefineView}
                evalState={refineEvalStateFor('promptCode')}
                perProviderEvalState={(providerId) => refineEvalStateFor('promptCode', providerId)}
                onEvaluate={onEvaluate}
              />
              <ConformanceBadge result={checkCode(shownText('promptCode', result.promptCode))} />
            </div>
          )}
          {result.promptSystem && (
            <div>
              <h3 className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionSystem')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownSystem()}</pre>
            </div>
          )}
          {result.promptUser && (
            <div>
              <h3 className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionUser')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownUser()}</pre>
            </div>
          )}
          {result.promptSystem && result.promptUser && (
            <PairControls
              providers={providers}
              refineState={pair}
              perProviderRefineState={refinePairState}
              evalState={evalPairState()}
              perProviderEvalState={evalPairState}
              systemRaw={result.promptSystem}
              userRaw={result.promptUser}
              conformance={checkSystemUser(shownSystem(), shownUser())}
              onRefinePair={onRefinePair}
              onToggleView={onToggleRefinePairView}
              onEvaluatePair={onEvaluatePair}
            />
          )}
          {result.promptGemini && (
            <div>
              <h3 className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">{t('result.sectionGemini')}</h3>
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">{shownText('promptGemini', result.promptGemini)}</pre>
              <RefineControls
                variantId="promptGemini"
                providers={providers}
                state={refineStateFor('promptGemini')}
                perProviderState={(providerId) => refineStateFor('promptGemini', providerId)}
                rawText={result.promptGemini}
                onRefine={onRefine}
                onToggleView={onToggleRefineView}
                evalState={refineEvalStateFor('promptGemini')}
                perProviderEvalState={(providerId) => refineEvalStateFor('promptGemini', providerId)}
                onEvaluate={onEvaluate}
              />
              <ConformanceBadge result={checkGemini(shownText('promptGemini', result.promptGemini))} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 pt-8 mt-8 border-t border-gray-800">
          {result.promptChat && (
            <button onClick={() => { navigator.clipboard.writeText(shownText('promptChat', result.promptChat)); toast.success(t('result.toastChatCopied')); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 uppercase">{t('result.copyChat')}</button>
          )}
          {result.promptCowork && (
            <button onClick={() => downloadMarkdown('cowork-instructions.md', t('result.coworkFileHeader'), shownText('promptCowork', result.promptCowork))} className="flex-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-indigo-700 uppercase">{t('result.downloadCowork')}</button>
          )}
          {result.promptCode && (
            <button onClick={() => downloadMarkdown('task.md', t('result.codeFileHeader'), shownText('promptCode', result.promptCode))} className="flex-1 bg-orange-900 hover:bg-orange-800 text-orange-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-orange-700 uppercase">{t('result.downloadCode')}</button>
          )}
          {result.promptSystem && (
            <>
              <button onClick={() => { navigator.clipboard.writeText(shownSystem()); toast.success(t('result.toastSystemCopied')); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 uppercase">{t('result.copySystem')}</button>
              <button onClick={() => downloadMarkdown('system-prompt.md', t('result.systemFileHeader'), shownSystem())} className="flex-1 bg-teal-900 hover:bg-teal-800 text-teal-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-teal-700 uppercase">{t('result.downloadSystem')}</button>
            </>
          )}
          {result.promptUser && (
            <>
              <button onClick={() => { navigator.clipboard.writeText(shownUser()); toast.success(t('result.toastUserCopied')); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 uppercase">{t('result.copyUser')}</button>
              <button onClick={() => downloadMarkdown('user-prompt.md', t('result.userFileHeader'), shownUser())} className="flex-1 bg-teal-900 hover:bg-teal-800 text-teal-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-teal-700 uppercase">{t('result.downloadUser')}</button>
            </>
          )}
          {result.promptGemini && (
            <>
              <button onClick={() => { navigator.clipboard.writeText(shownText('promptGemini', result.promptGemini)); toast.success(t('result.toastGeminiCopied')); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 uppercase">{t('result.copyGemini')}</button>
              <button onClick={() => downloadMarkdown('GEMINI.md', '', shownText('promptGemini', result.promptGemini))} className="flex-1 bg-green-900 hover:bg-green-800 text-green-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-green-700 uppercase">{t('result.downloadGemini')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
