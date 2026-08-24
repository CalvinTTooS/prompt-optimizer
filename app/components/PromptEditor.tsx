import type { RefObject } from 'react';
import type { CensoredEntry } from '../lib/anonymization';
import type { OptimizerModel, ModelsStatus } from '../hooks/useApiKeyConfig';
import { FewShotExamples } from './FewShotExamples';
import type { SingleExample } from '../lib/fewShotExamples';
import { useT } from '../hooks/useT';

interface PromptEditorProps {
  models: OptimizerModel[];
  modelsStatus: ModelsStatus;
  onReloadModels: () => void;
  selectedModel: string;
  onSelectedModelChange: (id: string) => void;

  input: string;
  onInputChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;

  onAutoAnonymize: () => void;
  onManualCensor: () => void;

  enablePrivacy: boolean;
  onEnablePrivacyChange: (value: boolean) => void;
  censoredData: CensoredEntry[];
  onRestoreField: (placeholder: string) => void;
  onRestoreAll: () => void;

  genChat: boolean;
  onGenChatChange: (value: boolean) => void;
  genCowork: boolean;
  onGenCoworkChange: (value: boolean) => void;
  genCode: boolean;
  onGenCodeChange: (value: boolean) => void;
  genSystemUser: boolean;
  onGenSystemUserChange: (value: boolean) => void;
  genGemini: boolean;
  onGenGeminiChange: (value: boolean) => void;

  loading: boolean;
  onOptimize: () => void;

  examples: SingleExample[];
  onAddExample: () => void;
  onRemoveExample: (index: number) => void;
  onUpdateExample: (index: number, content: string) => void;
  onLoadExampleFile: (index: number, file: File) => Promise<{ loaded: boolean; reason?: string }>;
}

export function PromptEditor({
  models,
  modelsStatus,
  onReloadModels,
  selectedModel,
  onSelectedModelChange,
  input,
  onInputChange,
  textareaRef,
  onAutoAnonymize,
  onManualCensor,
  enablePrivacy,
  onEnablePrivacyChange,
  censoredData,
  onRestoreField,
  onRestoreAll,
  genChat,
  onGenChatChange,
  genCowork,
  onGenCoworkChange,
  genCode,
  onGenCodeChange,
  genSystemUser,
  onGenSystemUserChange,
  genGemini,
  onGenGeminiChange,
  loading,
  onOptimize,
  examples,
  onAddExample,
  onRemoveExample,
  onUpdateExample,
  onLoadExampleFile,
}: PromptEditorProps) {
  const { t } = useT();
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-12">
      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-500 uppercase mb-2 ml-1">{t('editor.selectModel')}</label>
        <div className="flex items-center gap-2">
          <select
            className="flex-1 p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none font-medium"
            value={selectedModel}
            onChange={(e) => onSelectedModelChange(e.target.value)}
            disabled={modelsStatus !== 'loaded'}
          >
            {modelsStatus === 'loaded'
              ? models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
              : <option>{t(modelsStatus === 'error' ? 'editor.modelsLoadError' : 'editor.loadingModels')}</option>}
          </select>
          <button
            type="button"
            onClick={onReloadModels}
            disabled={modelsStatus === 'loading'}
            title={t('editor.reloadModels')}
            aria-label={t('editor.reloadModels')}
            className="p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-5 h-5 ${modelsStatus === 'loading' ? 'animate-spin' : ''}`}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-3">
        <button onClick={onAutoAnonymize} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-md">{t('editor.anonymizeAuto')}</button>
        <button onClick={onManualCensor} className="bg-white border-2 border-gray-100 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">{t('editor.censorSelection')}</button>
      </div>

      <textarea
        ref={textareaRef}
        className="w-full p-6 border-2 border-gray-100 rounded-3xl h-48 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono text-base bg-gray-50/50"
        placeholder={t('editor.placeholder')}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onOptimize(); } }}
      />

      <div className="mt-6 flex items-center bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enablePrivacy}
            onChange={(e) => onEnablePrivacyChange(e.target.checked)}
          />
          <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white peer-checked:after:bg-blue-700 after:border after:border-gray-300 peer-checked:after:border-transparent after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6 shadow-inner"></div>
          <span className="ml-4 text-sm font-bold text-blue-900 uppercase tracking-wide">
            {t('editor.privacyActive')}
          </span>
        </label>
      </div>

      {censoredData.length > 0 && (
        <div className="mt-6 p-4 bg-gray-900 rounded-2xl">
          <div className="flex justify-between mb-4 px-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('editor.protectedData', { n: censoredData.length })}</p>
            <button onClick={onRestoreAll} className="text-[10px] text-red-400 font-bold hover:text-red-300 uppercase">{t('editor.restoreAll')}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {censoredData.map((d, i) => (
              <div key={i} className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-[11px] text-blue-400 font-mono font-bold mr-3">{d.placeholder}</span>
                <button onClick={() => onRestoreField(d.placeholder)} className="text-gray-500 hover:text-white">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 mb-4">
        <label className="block text-sm font-bold text-gray-500 uppercase mb-3 ml-1">{t('editor.outputFormatsLabel')}</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={genChat} onChange={(e) => onGenChatChange(e.target.checked)} />
            <span className="text-sm font-bold text-gray-700">{t('editor.formatChat')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={genCowork} onChange={(e) => onGenCoworkChange(e.target.checked)} />
            <span className="text-sm font-bold text-gray-700">{t('editor.formatCowork')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-4 h-4 text-orange-600 rounded" checked={genCode} onChange={(e) => onGenCodeChange(e.target.checked)} />
            <span className="text-sm font-bold text-gray-700">{t('editor.formatCode')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" checked={genSystemUser} onChange={(e) => onGenSystemUserChange(e.target.checked)} />
            <span className="text-sm font-bold text-gray-700">{t('editor.formatSystemUser')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={genGemini} onChange={(e) => onGenGeminiChange(e.target.checked)} />
            <span className="text-sm font-bold text-gray-700">{t('editor.formatGemini')}</span>
          </label>
        </div>
      </div>

      {(genChat || genCowork || genCode || genSystemUser || genGemini) && (
        <div className="mb-4 space-y-3">
          <FewShotExamples
            examples={examples}
            onAdd={onAddExample}
            onRemove={onRemoveExample}
            onUpdate={onUpdateExample}
            onLoadFile={onLoadExampleFile}
          />
        </div>
      )}

      <button onClick={onOptimize} disabled={loading || !input || models.length === 0} className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black py-5 rounded-2xl shadow-2xl transition-all disabled:from-gray-300 uppercase tracking-widest text-lg">
        {loading ? t('editor.processing') : t('editor.optimize')}
      </button>
    </div>
  );
}
