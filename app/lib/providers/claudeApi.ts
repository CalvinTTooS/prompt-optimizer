import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { LlmProvider, ProviderResponse, QualityTier } from './types';

const MODEL: Record<QualityTier, string> = {
  haiku: 'claude-haiku-4-5', sonnet: 'claude-sonnet-5', opus: 'claude-opus-5',
};

export function makeClaudeApiProvider(getKey: () => string): LlmProvider {
  return {
    id: 'claude-api', label: 'Claude (API)',
    async run(assembled, tier): Promise<ProviderResponse> {
      const res = await tauriFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': getKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL[tier], max_tokens: 8192, messages: [{ role: 'user', content: assembled }] }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const msg = data?.error?.message || res.statusText || `HTTP ${res.status}`;
        throw new Error(`Errore API Claude (${res.status}): ${msg}`);
      }
      if (data?.stop_reason === 'max_tokens') {
        throw new Error('Risposta Claude API troncata (limite token raggiunto) — riprova con un prompt più corto o un modello diverso.');
      }
      const text = Array.isArray(data?.content) ? data.content.map((c: {text?: string}) => c.text ?? '').join('') : '';
      const usage = data?.usage
        ? { costUsd: 0, inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 }
        : null;
      if (!text) throw new Error('Risposta Claude API vuota o non valida');
      return { text, usage };
    },
  };
}
