import type { LlmProvider } from './types';
import { makeClaudeApiProvider } from './claudeApi';
import { makeOpenaiApiProvider } from './openaiApi';

export interface RegistryOpts {
  anthropicKey: string | null;
  openaiKey: string | null;
  masterEnabled?: boolean;    // default: abilitato
  anthropicEnabled?: boolean;
  openaiEnabled?: boolean;
}

export function availableProviders(o: RegistryOpts): LlmProvider[] {
  if (o.masterEnabled === false) return [];
  const list: LlmProvider[] = [];
  if (o.anthropicKey && o.anthropicEnabled !== false) list.push(makeClaudeApiProvider(() => o.anthropicKey!));
  if (o.openaiKey && o.openaiEnabled !== false) list.push(makeOpenaiApiProvider(() => o.openaiKey!));
  return list;
}
