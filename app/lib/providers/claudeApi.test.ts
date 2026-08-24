import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { makeClaudeApiProvider } from './claudeApi';

beforeEach(() => {
  vi.mocked(tauriFetch).mockReset();
});

describe('makeClaudeApiProvider', () => {
  it('id/label identificano il provider API', () => {
    const provider = makeClaudeApiProvider(() => 'key');
    expect(provider.id).toBe('claude-api');
    expect(provider.label).toBe('Claude (API)');
  });

  it('estrae text concatenando i blocchi content e usage dai token', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ text: '{"refined":"R",' }, { text: '"changes":"C"}' }],
        usage: { input_tokens: 12, output_tokens: 34 },
      }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'sk-ant-test');
    const res = await provider.run('ASSEMBLED', 'sonnet');
    expect(res.text).toBe('{"refined":"R","changes":"C"}');
    expect(res.usage).toEqual({ costUsd: 0, inputTokens: 12, outputTokens: 34 });
  });

  it('chiama l endpoint Anthropic con header x-api-key e il modello mappato dal tier', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: 'ok' }] }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'sk-ant-secret');
    await provider.run('ASSEMBLED', 'opus');

    expect(tauriFetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(tauriFetch).mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-secret');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('claude-opus-5');
    expect(body.max_tokens).toBe(8192);
    expect(body.messages).toEqual([{ role: 'user', content: 'ASSEMBLED' }]);
  });

  it('usage è null se la risposta non contiene metadati di consumo', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: 'ok' }] }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'key');
    const res = await provider.run('ASSEMBLED', 'haiku');
    expect(res.usage).toBeNull();
  });

  it('lancia se il testo estratto è vuoto', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [] }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow();
  });

  it('lancia un errore con status e messaggio upstream su risposta non-2xx, senza esporre la key', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'invalid x-api-key' } }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'sk-ant-should-not-leak');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /401.*invalid x-api-key/
    );
    try {
      await provider.run('ASSEMBLED', 'sonnet');
    } catch (err) {
      expect((err as Error).message).not.toContain('sk-ant-should-not-leak');
    }
  });

  it('usa lo statusText se il body di errore non è JSON valido', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);
    const provider = makeClaudeApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /500.*Internal Server Error/
    );
  });

  it('lancia un errore di troncamento se stop_reason è max_tokens', async () => {
    vi.mocked(tauriFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ text: '{"refined":"parziale"' }],
        stop_reason: 'max_tokens',
      }),
    } as Response);
    const provider = makeClaudeApiProvider(() => 'key');
    await expect(provider.run('ASSEMBLED', 'sonnet')).rejects.toThrow(
      /troncata/
    );
  });
});
