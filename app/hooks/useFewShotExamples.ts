import { useState } from 'react';
import { EMPTY_EXAMPLES, type SingleExample } from '../lib/fewShotExamples';

// Cap on attached example files: they inflate the Gemini payload/token cost.
export const MAX_EXAMPLE_FILE_BYTES = 102400; // ~100 KB

/** Shared few-shot examples (single list, applied to all flows; no persistence). */
export function useFewShotExamples() {
  const [examples, setExamples] = useState<SingleExample[]>(EMPTY_EXAMPLES);

  const addExample = () => setExamples((prev) => [...prev, { content: '' }]);
  const removeExample = (index: number) =>
    setExamples((prev) => prev.filter((_, i) => i !== index));
  const updateExample = (index: number, content: string) =>
    setExamples((prev) => prev.map((e, i) => (i === index ? { content } : e)));

  const loadFromFile = async (
    index: number,
    file: File,
  ): Promise<{ loaded: boolean; reason?: 'oversize' | 'read-error' }> => {
    if (file.size > MAX_EXAMPLE_FILE_BYTES) return { loaded: false, reason: 'oversize' };
    try {
      const text = await file.text();
      updateExample(index, text);
      return { loaded: true };
    } catch {
      return { loaded: false, reason: 'read-error' };
    }
  };

  return { examples, addExample, removeExample, updateExample, loadFromFile };
}
