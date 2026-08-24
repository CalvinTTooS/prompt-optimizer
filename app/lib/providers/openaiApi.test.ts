import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { makeOpenaiApiProvider } from './openaiApi';

beforeEach(() => {
  vi.mocked(tauriFetch).mockReset();
});

describe('makeOpenaiApiProvider', () => {
  it('id/label identificano il provider API', () => {
    const provider = makeOpenaiApiProvider(() => 'key');
    expect(provider.id).toBe('openai-api');
    expect(provider.label).toBe('OpenAI (API)');
  });

  it('estrae text da choices[0].message.content e usage dai token', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"refined":"R","changes":"C"}' } }],
        usage: { prompt_tokens: 20, completion_tokens: 40 },
      }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'sk-test');
    const res = await provider.run('ASSEMBLED', 'sonnet');
    expect(res.text).toBe('{"refined":"R","changes":"C"}');
    expect(res.usage).toEqual({ costUsd: 0, inputTokens: 20, outputTokens: 40 });
  });

  it('chiama l endpoint OpenAI con Authorization Bearer e il modello mappato dal tier', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'sk-secret');
    await provider.run('ASSEMBLED', 'opus');

    expect(tauriFetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(tauriFetch).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-secret');
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('gpt-5'); // opus → gpt-5
    expect(body.messages).toEqual([{ role: 'user', content: 'ASSEMBLED' }]);
  });

  it('mappa ogni tier al modello OpenAI corretto (haiku distinto da opus/sonnet)', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'key');

    const modelForTier = async (tier: 'haiku' | 'sonnet' | 'opus') => {
      vi.mocked(tauriFetch).mockClear();
      await provider.run('ASSEMBLED', tier);
      const body = JSON.parse(vi.mocked(tauriFetch).mock.calls[0][1]?.body as string);
      return body.model as string;
    };

    expect(await modelForTier('haiku')).toBe('gpt-5-mini');
    expect(await modelForTier('sonnet')).toBe('gpt-5');
    expect(await modelForTier('opus')).toBe('gpt-5');
  });

  it('usage è null se la risposta non contiene metadati di consumo', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'key');
    const res = await provider.run('ASSEMBLED', 'haiku');
    expect(res.usage).toBeNull();
  });

  it('lancia se il testo estratto è vuoto', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow();
  });

  it('lancia un errore con status e messaggio upstream su risposta non-2xx, senza esporre la key', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'rate limit exceeded' } }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'sk-should-not-leak');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /429.*rate limit exceeded/
    );
    try {
      await provider.run('ASSEMBLED', 'sonnet');
    } catch (err) {
      expect((err as Error).message).not.toContain('sk-should-not-leak');
    }
  });

  it('usa lo statusText se il body di errore non è JSON valido', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);
    const provider = makeOpenaiApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /402.*Payment Required/
    );
  });

  it('lancia un errore di troncamento se finish_reason è length', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"refined":"parziale"' }, finish_reason: 'length' }],
      }),
    } as Response);
    const provider = makeOpenaiApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /troncata/
    );
  });
});
