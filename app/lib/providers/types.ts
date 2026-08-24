import type { CallUsage } from '../claudeUsage';

export type { CallUsage };
export type QualityTier = 'sonnet' | 'opus' | 'haiku'; // riusa RefineModel

export interface ProviderResponse { text: string; usage: CallUsage | null }

export interface LlmProvider {
  id: string;
  label: string;
  run(assembled: string, tier: QualityTier): Promise<ProviderResponse>;
}
