import { FEW_SHOT_EXAMPLES_GUIDE } from '../constants/prompts';

export interface SingleExample { content: string }

export const EMPTY_EXAMPLES: SingleExample[] = [];

/**
 * Builds the shared few-shot block appended to EVERY selected flow's
 * instruction, or '' when there is no non-empty example.
 */
export function buildExamplesBlock(examples: SingleExample[]): string {
  const items = examples.filter((e) => e.content.trim() !== '');
  if (items.length === 0) return '';
  const blocks = items.map((e, i) => `[Esempio ${i + 1}]\n<esempio>\n${e.content}\n</esempio>`);
  return `\n\n${FEW_SHOT_EXAMPLES_GUIDE}\n\n${blocks.join('\n\n')}`;
}
