import type React from 'react';
import { ScaffoldInstructions } from './ScaffoldInstructions';
import { useT } from '../hooks/useT';

interface ScaffoldGeneratorProps {
  scaffoldMode: boolean;
  onScaffoldModeChange: (value: boolean) => void;
  input: string;
  generating: boolean;
  scaffoldFiles: Record<string, string> | null;
  onGenerate: (input: string) => void;
  onWriteToDir: () => void;
  onDownloadZip: () => void;
  instructions: React.ComponentProps<typeof ScaffoldInstructions>;
}

export function ScaffoldGenerator({
  scaffoldMode,
  onScaffoldModeChange,
  input,
  generating,
  scaffoldFiles,
  onGenerate,
  onWriteToDir,
  onDownloadZip,
  instructions,
}: ScaffoldGeneratorProps) {
  const { t } = useT();
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-12">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 text-green-600 rounded"
          checked={scaffoldMode}
          onChange={(e) => onScaffoldModeChange(e.target.checked)}
        />
        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('scaffold.enableLabel')}</span>
      </label>

      {scaffoldMode && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('scaffold.descriptionPre')}<code className="mx-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">.md</code>{t('scaffold.descriptionPost')}
          </p>

          <ScaffoldInstructions {...instructions} />

          <button
            onClick={() => onGenerate(input)}
            disabled={generating || !input}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all disabled:from-gray-300 uppercase tracking-widest"
          >
            {generating ? t('scaffold.generating') : t('scaffold.generate')}
          </button>

          {scaffoldFiles && (
            <div className="space-y-4">
              <div className="bg-gray-950 p-6 rounded-2xl border-4 border-gray-900">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('scaffold.filesGenerated', { n: Object.keys(scaffoldFiles).length })}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(scaffoldFiles).map((name) => (
                    <span key={name} className="text-[11px] text-green-400 font-mono font-bold bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">{name}</span>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-t border-gray-800 pt-3">{t('scaffold.previewClaudeMd')}</p>
                <pre className="text-gray-300 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">{scaffoldFiles['CLAUDE.md']}</pre>
              </div>

              <div className="flex flex-wrap gap-4">
                <button onClick={onWriteToDir} className="flex-1 bg-green-900 hover:bg-green-800 text-green-100 px-6 py-3 rounded-xl text-xs font-bold transition-all border border-green-700 uppercase">{t('scaffold.writeToDir')}</button>
                <button onClick={onDownloadZip} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 uppercase">{t('scaffold.downloadZip')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
