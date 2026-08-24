import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { LlmProvider, ProviderResponse, QualityTier } from './types';

// ID modello da confermare sui doc OpenAI correnti
const MODEL: Record<QualityTier, string> = {
  haiku: 'gpt-5-mini', sonnet: 'gpt-5', opus: 'gpt-5',
};

export function makeOpenaiApiProvider(getKey: () => string): LlmProvider {
  return {
    id: 'openai-api', label: 'OpenAI (API)',
    async run(assembled, tier): Promise<ProviderResponse> {
      const res = await tauriFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getKey()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL[tier], messages: [{ role: 'user', content: assembled }] }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const msg = data?.error?.message || res.statusText || `HTTP ${res.status}`;
        throw new Error(`Errore API OpenAI (${res.status}): ${msg}`);
      }
      if (data?.choices?.[0]?.finish_reason === 'length') {
        throw new Error('Risposta OpenAI troncata (limite token raggiunto) — riprova con un prompt più corto o un modello diverso.');
      }
      const text = typeof data?.choices?.[0]?.message?.content === 'string'
        ? data.choices[0].message.content
        : '';
      const usage = data?.usage
        ? { costUsd: 0, inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 }
        : null;
      if (!text) throw new Error('Risposta OpenAI API vuota o non valida');
      return { text, usage };
    },
  };
}
