import type { ChangeEvent } from 'react';
import type { SingleExample } from '../lib/fewShotExamples';
import { toast } from '../lib/toast';
import { useT } from '../hooks/useT';
import { t as translate } from '../lib/i18n';

interface FewShotExamplesProps {
  examples: SingleExample[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, content: string) => void;
  onLoadFile: (index: number, file: File) => Promise<{ loaded: boolean; reason?: string }>;
}

async function handleFile(
  e: ChangeEvent<HTMLInputElement>,
  onLoadFile: FewShotExamplesProps['onLoadFile'],
  index: number,
) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const outcome = await onLoadFile(index, file);
  if (!outcome.loaded && outcome.reason === 'oversize') {
    toast.error(translate('fewshot.errorOversize'));
  } else if (!outcome.loaded) {
    toast.error(translate('fewshot.errorReadFile'));
  }
}

export function FewShotExamples({ examples, onAdd, onRemove, onUpdate, onLoadFile }: FewShotExamplesProps) {
  const { t } = useT();
  return (
    <details className="mt-2 ml-1">
      <summary className="cursor-pointer text-xs font-bold text-gray-500 uppercase tracking-wide select-none">
        {t('fewshot.title')}
      </summary>
      <div className="mt-3 space-y-4">
        {examples.map((item, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase">{t('fewshot.exampleLabel', { n: i + 1 })}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-[11px] text-red-400 font-bold uppercase hover:text-red-300"
              >
                {t('fewshot.remove')}
              </button>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">{t('fewshot.exampleFieldLabel')}</label>
                <label className="text-[11px] text-blue-600 font-bold uppercase cursor-pointer hover:text-blue-500">
                  {t('fewshot.uploadFile')}
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={(e) => handleFile(e, onLoadFile, i)} />
                </label>
              </div>
              <textarea
                className="w-full p-3 border-2 border-gray-100 rounded-xl h-24 outline-none font-mono text-xs bg-white"
                value={item.content}
                onChange={(e) => onUpdate(i, e.target.value)}
              />
              <div className="text-right text-[10px] text-gray-400 mt-1">{t('fewshot.chars', { n: item.content.length })}</div>
            </div>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="text-xs font-bold text-blue-600 uppercase tracking-wide">
          {t('fewshot.addExample')}
        </button>
      </div>
    </details>
  );
}
