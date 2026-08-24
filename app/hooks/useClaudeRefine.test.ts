import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/claudeRefineBridge', () => ({
  getStoredRefineModel: vi.fn(),
  setStoredRefineModel: vi.fn(),
}));

const mockRun = vi.fn();
const PROVIDER = 'test-provider';
const OTHER_PROVIDER = 'other-provider';

vi.mock('../lib/providers/registry', () => ({
  availableProviders: vi.fn(() => [
    { id: PROVIDER, label: 'Test Provider', run: mockRun },
    { id: OTHER_PROVIDER, label: 'Other Provider', run: mockRun },
  ]),
}));

import {
  getStoredRefineModel,
  setStoredRefineModel,
} from '../lib/claudeRefineBridge';
import { availableProviders as computeAvailableProviders } from '../lib/providers/registry';
import { useClaudeRefine } from './useClaudeRefine';

beforeEach(() => {
  vi.mocked(getStoredRefineModel).mockResolvedValue('sonnet');
  vi.mocked(setStoredRefineModel).mockResolvedValue();
  mockRun.mockReset();
});

describe('useClaudeRefine', () => {
  it('espone availableProviders (id+label) dal registry', async () => {
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    expect(result.current.availableProviders.map((p) => p.id)).toEqual([PROVIDER, OTHER_PROVIDER]);
  });

  it('idle → refining → done con vista claude', async () => {
    let resolve!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    let p!: Promise<void>;
    act(() => { p = result.current.refine('promptChat', 'TESTO', PROVIDER); });
    await waitFor(() => expect(result.current.stateFor('promptChat', PROVIDER).status).toBe('refining'));

    await act(async () => { resolve({ text: '{"refined":"R","changes":"C"}', usage: null }); await p; });
    // Baseline condivisa (senza providerId) e lettura per-provider (op ormai
    // idle → ricade sulla baseline) devono combaciare: è il "last-write-wins"
    // che alimenta il toggle Gemini/Claude.
    const s = result.current.stateFor('promptChat');
    expect(s).toMatchObject({ status: 'done', view: 'claude', result: { refined: 'R', changes: 'C' } });
    expect(result.current.stateFor('promptChat', PROVIDER)).toMatchObject({ status: 'done', result: { refined: 'R' } });
  });

  it('non ri-parte se una refine per lo stesso variantId/providerId è già in corso', async () => {
    let resolve!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.refine('promptChat', 'TESTO', PROVIDER); });
    await waitFor(() => expect(result.current.stateFor('promptChat', PROVIDER).status).toBe('refining'));

    let p2!: Promise<void>;
    act(() => { p2 = result.current.refine('promptChat', 'TESTO', PROVIDER); });
    await p2;

    expect(mockRun).toHaveBeenCalledTimes(1);

    await act(async () => { resolve({ text: '{"refined":"R","changes":"C"}', usage: null }); await p1; });
  });

  it('providerId diversi per lo stesso variantId non si bloccano a vicenda', async () => {
    mockRun.mockResolvedValue({ text: '{"refined":"R","changes":"C"}', usage: null });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    await act(async () => {
      await Promise.all([
        result.current.refine('promptChat', 'TESTO', PROVIDER),
        result.current.refine('promptChat', 'TESTO', OTHER_PROVIDER),
      ]);
    });

    expect(mockRun).toHaveBeenCalledTimes(2);
  });

  it('loading indipendente: solo il provider in corso risulta "refining", non gli altri sulla stessa variante', async () => {
    let resolveP!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolveP = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    let p!: Promise<void>;
    act(() => { p = result.current.refine('promptChat', 'TESTO', PROVIDER); });
    await waitFor(() => expect(result.current.stateFor('promptChat', PROVIDER).status).toBe('refining'));

    // OTHER_PROVIDER non ha alcuna operazione in corso per questa variante:
    // deve restare idle, non "refining" — il pulsante dell'altro provider
    // resta cliccabile mentre PROVIDER sta rifinendo.
    expect(result.current.stateFor('promptChat', OTHER_PROVIDER).status).toBe('idle');

    await act(async () => { resolveP({ text: '{"refined":"R","changes":"C"}', usage: null }); await p; });
    expect(result.current.stateFor('promptChat', PROVIDER).status).toBe('done');
  });

  it('errore indipendente: se PROVIDER fallisce, OTHER_PROVIDER sulla stessa variante non risulta in errore', async () => {
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    mockRun.mockRejectedValueOnce(new Error('boom-provider'));
    await act(async () => { await result.current.refine('promptChat', 'TESTO', PROVIDER); });

    expect(result.current.stateFor('promptChat', PROVIDER)).toMatchObject({ status: 'error', message: 'boom-provider' });
    // OTHER_PROVIDER non ha mai fallito nulla per questa variante: deve
    // restare idle, non contaminato dall'errore di PROVIDER.
    expect(result.current.stateFor('promptChat', OTHER_PROVIDER).status).toBe('idle');

    // E se ora OTHER_PROVIDER ha successo, il baseline condiviso (usato dal
    // toggle) mostra il SUO risultato, mentre PROVIDER continua a mostrare
    // il proprio errore sul proprio pulsante.
    mockRun.mockResolvedValueOnce({ text: '{"refined":"R2","changes":"C2"}', usage: null });
    await act(async () => { await result.current.refine('promptChat', 'TESTO', OTHER_PROVIDER); });
    expect(result.current.stateFor('promptChat', OTHER_PROVIDER)).toMatchObject({ status: 'done', result: { refined: 'R2' } });
    expect(result.current.stateFor('promptChat', PROVIDER)).toMatchObject({ status: 'error', message: 'boom-provider' });
    expect(result.current.stateFor('promptChat')).toMatchObject({ status: 'done', result: { refined: 'R2' } });
  });

  it('imposta error se il providerId non risolve a nessun provider disponibile', async () => {
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refine('promptCode', 'X', 'sconosciuto'); });
    expect(result.current.stateFor('promptCode', 'sconosciuto')).toMatchObject({ status: 'error' });
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('imposta error se la rifinitura fallisce', async () => {
    mockRun.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refine('promptCode', 'X', PROVIDER); });
    expect(result.current.stateFor('promptCode', PROVIDER)).toMatchObject({ status: 'error', message: 'timeout' });
  });

  it('toggleView alterna claude ⇄ gemini dopo done', async () => {
    mockRun.mockResolvedValue({ text: '{"refined":"R","changes":"C"}', usage: null });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refine('promptChat', 'X', PROVIDER); });
    act(() => result.current.toggleView('promptChat'));
    expect(result.current.stateFor('promptChat')).toMatchObject({ view: 'gemini' });
  });

  it('setModel persiste la scelta', async () => {
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    act(() => result.current.setModel('opus'));
    expect(result.current.model).toBe('opus');
    expect(setStoredRefineModel).toHaveBeenCalledWith('opus');
  });
});

describe('useClaudeRefine — valuta', () => {
  it('idle → evaluating → done con verdetto', async () => {
    mockRun.mockResolvedValue({
      text: JSON.stringify({ verdict: 'solido', suggestion: 's', items: [] }),
      usage: null,
    });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.evaluate('promptChat', 'RAW', PROVIDER); });
    expect(result.current.evalStateFor('promptChat')).toMatchObject({
      status: 'done', result: { verdict: 'solido' },
    });
  });

  it('imposta error se la valutazione fallisce', async () => {
    mockRun.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.evaluate('promptCode', 'RAW', PROVIDER); });
    expect(result.current.evalStateFor('promptCode', PROVIDER)).toMatchObject({ status: 'error', message: 'boom' });
  });

  it('non ri-parte se una valutazione è già in corso', async () => {
    let resolve!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    let p!: Promise<void>;
    act(() => { p = result.current.evaluate('promptChat', 'RAW', PROVIDER); });
    await waitFor(() => expect(result.current.evalStateFor('promptChat', PROVIDER).status).toBe('evaluating'));
    act(() => { void result.current.evaluate('promptChat', 'RAW', PROVIDER); });
    expect(mockRun).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ text: JSON.stringify({ verdict: 'solido', suggestion: '', items: [] }), usage: null });
      await p;
    });
  });

  it('loading/errore indipendenti tra provider anche per valuta, sulla stessa variante', async () => {
    let resolveP!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolveP = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    let p!: Promise<void>;
    act(() => { p = result.current.evaluate('promptChat', 'RAW', PROVIDER); });
    await waitFor(() => expect(result.current.evalStateFor('promptChat', PROVIDER).status).toBe('evaluating'));
    expect(result.current.evalStateFor('promptChat', OTHER_PROVIDER).status).toBe('idle');

    await act(async () => {
      resolveP({ text: JSON.stringify({ verdict: 'solido', suggestion: '', items: [] }), usage: null });
      await p;
    });
  });
});

describe('useClaudeRefine — coppia System+User', () => {
  it('refinePair idle→refining→done(view claude)', async () => {
    mockRun.mockResolvedValue({
      text: JSON.stringify({ refinedSystem: 'S', refinedUser: 'U', changes: 'C' }),
      usage: null,
    });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refinePair('sys', 'usr', PROVIDER); });
    expect(result.current.refinePairState()).toMatchObject({ status: 'done', view: 'claude', result: { refinedSystem: 'S', refinedUser: 'U' } });
  });
  it('toggleRefinePairView alterna', async () => {
    mockRun.mockResolvedValue({
      text: JSON.stringify({ refinedSystem: 'S', refinedUser: 'U', changes: '' }),
      usage: null,
    });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refinePair('s', 'u', PROVIDER); });
    act(() => result.current.toggleRefinePairView());
    expect(result.current.refinePairState()).toMatchObject({ view: 'gemini' });
  });
  it('evaluatePair done con verdetto', async () => {
    mockRun.mockResolvedValue({
      text: JSON.stringify({ verdict: 'solido', suggestion: 's', items: [] }),
      usage: null,
    });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.evaluatePair('s', 'u', PROVIDER); });
    expect(result.current.evalPairState()).toMatchObject({ status: 'done', result: { verdict: 'solido' } });
  });
  it('refinePair non ri-parte se già in corso', async () => {
    let resolve!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    let p!: Promise<void>;
    act(() => { p = result.current.refinePair('s', 'u', PROVIDER); });
    await waitFor(() => expect(result.current.refinePairState(PROVIDER).status).toBe('refining'));
    act(() => { void result.current.refinePair('s', 'u', PROVIDER); });
    expect(mockRun).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ text: JSON.stringify({ refinedSystem: 'S', refinedUser: 'U', changes: '' }), usage: null });
      await p;
    });
  });

  it('refinePair: loading indipendente tra provider (la coppia non ha variantId, solo providerId)', async () => {
    let resolveP!: (v: { text: string; usage: null }) => void;
    mockRun.mockReturnValue(new Promise((r) => (resolveP = r)));
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));

    let p!: Promise<void>;
    act(() => { p = result.current.refinePair('s', 'u', PROVIDER); });
    await waitFor(() => expect(result.current.refinePairState(PROVIDER).status).toBe('refining'));
    // OTHER_PROVIDER non ha alcuna refinePair in corso: resta idle, il suo
    // pulsante non deve risultare disabilitato mentre PROVIDER lavora.
    expect(result.current.refinePairState(OTHER_PROVIDER).status).toBe('idle');

    await act(async () => {
      resolveP({ text: JSON.stringify({ refinedSystem: 'S', refinedUser: 'U', changes: '' }), usage: null });
      await p;
    });
    // Baseline condivisa (senza providerId) riflette il risultato, come per
    // le varianti singole.
    expect(result.current.refinePairState()).toMatchObject({ status: 'done', result: { refinedSystem: 'S' } });
  });
});

describe('useClaudeRefine — consumo (usage)', () => {
  it('accumula costo e token dopo una refine', async () => {
    mockRun.mockResolvedValue({
      text: JSON.stringify({ refined: 'R', changes: 'C' }),
      usage: { costUsd: 0.034, inputTokens: 10, outputTokens: 900 },
    });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    expect(result.current.usage.callCount).toBe(0);
    await act(async () => { await result.current.refine('promptChat', 'X', PROVIDER); });
    expect(result.current.usage.callCount).toBe(1);
    expect(result.current.usage.totalCostUsd).toBeCloseTo(0.034);
    expect(result.current.usage.last).toEqual({ costUsd: 0.034, inputTokens: 10, outputTokens: 900 });
  });

  it('non conteggia una chiamata senza metadati di consumo', async () => {
    mockRun.mockResolvedValue({ text: JSON.stringify({ refined: 'R', changes: 'C' }), usage: null });
    const { result } = renderHook(() => useClaudeRefine('', ''));
    await waitFor(() => expect(result.current.model).toBe('sonnet'));
    await act(async () => { await result.current.refine('promptChat', 'X', PROVIDER); });
    expect(result.current.usage.callCount).toBe(0);
  });
});

describe('useClaudeRefine — flag motore (registry)', () => {
  // Queste due verifiche vogliono controllare il vero wiring verso
  // availableProviders (id reali claude-api/openai-api), non il doppio
  // fisso usato altrove nel file: per la durata di ciascun test
  // sostituiamo l'implementazione del mock con quella reale del registry,
  // poi la ripristiniamo per non contaminare gli altri test del file.
  afterEach(() => {
    vi.mocked(computeAvailableProviders).mockImplementation(() => [
      { id: PROVIDER, label: 'Test Provider', run: mockRun },
      { id: OTHER_PROVIDER, label: 'Other Provider', run: mockRun },
    ]);
  });

  it('master OFF → availableProviders vuoto', async () => {
    const real = await vi.importActual<typeof import('../lib/providers/registry')>('../lib/providers/registry');
    vi.mocked(computeAvailableProviders).mockImplementation(real.availableProviders);
    const { result } = renderHook(() =>
      useClaudeRefine('sk-ant', 'sk-oai', { master: false, anthropic: true, openai: true }));
    await waitFor(() => expect(result.current.availableProviders).toEqual([]));
  });

  it('un motore disabilitato non compare tra i provider', async () => {
    const real = await vi.importActual<typeof import('../lib/providers/registry')>('../lib/providers/registry');
    vi.mocked(computeAvailableProviders).mockImplementation(real.availableProviders);
    const { result } = renderHook(() =>
      useClaudeRefine('sk-ant', 'sk-oai', { master: true, anthropic: false, openai: true }));
    await waitFor(() => expect(result.current.availableProviders.map((p) => p.id)).not.toContain('claude-api'));
    expect(result.current.availableProviders.map((p) => p.id)).toContain('openai-api');
  });
});
