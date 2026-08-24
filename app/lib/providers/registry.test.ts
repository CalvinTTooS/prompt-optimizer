import { describe, it, expect } from 'vitest';
import { availableProviders } from './registry';

describe('availableProviders', () => {
  it('nessun provider disponibile se tutte le opts sono assenti', () => {
    const list = availableProviders({ anthropicKey: null, openaiKey: null });
    expect(list).toEqual([]);
  });

  it('include claude-api se anthropicKey presente', () => {
    const list = availableProviders({ anthropicKey: 'sk-ant', openaiKey: null });
    expect(list.map((p) => p.id)).toEqual(['claude-api']);
  });

  it('include openai-api se openaiKey presente', () => {
    const list = availableProviders({ anthropicKey: null, openaiKey: 'sk-oai' });
    expect(list.map((p) => p.id)).toEqual(['openai-api']);
  });

  it('include entrambi nell ordine claude-api, openai-api', () => {
    const list = availableProviders({ anthropicKey: 'sk-ant', openaiKey: 'sk-oai' });
    expect(list.map((p) => p.id)).toEqual(['claude-api', 'openai-api']);
  });

  it('esclude claude-api/openai-api per chiave stringa vuota', () => {
    const list = availableProviders({ anthropicKey: '', openaiKey: '' });
    expect(list).toEqual([]);
  });

  it('master OFF esclude tutti i motori', () => {
    const list = availableProviders({ anthropicKey: 'sk-ant', openaiKey: 'sk-oai', masterEnabled: false });
    expect(list).toEqual([]);
  });
  it('un motore disabilitato non compare anche se disponibile', () => {
    const list = availableProviders({
      anthropicKey: 'sk-ant', openaiKey: 'sk-oai',
      anthropicEnabled: false,
    });
    expect(list.map((p) => p.id)).toEqual(['openai-api']);
  });
});
