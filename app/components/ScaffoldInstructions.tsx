import { useT } from '../hooks/useT';

interface FileOption { key: string; label: string }

/** Maps each editable scaffold file's key to its i18n label key — the
 *  file list itself is static (module-scope), so display text must be
 *  resolved here at render time to react to language changes. */
const FILE_LABEL_KEY: Record<string, string> = {
  'CLAUDE.md': 'scaffoldInstr.labelClaude',
  'GEMINI.md': 'scaffoldInstr.labelGemini',
  'METHOD.md': 'scaffoldInstr.labelMethod',
  'profiles/desktop.md': 'scaffoldInstr.labelDesktop',
  'profiles/android.md': 'scaffoldInstr.labelAndroid',
  'profiles/web.md': 'scaffoldInstr.labelWeb',
};

interface ScaffoldInstructionsProps {
  files: FileOption[];
  selectedFile: string;
  onSelectFile: (key: string) => void;
  content: string;
  modified: boolean;
  modifiedKeys: string[];
  editing: boolean;
  draft: string;
  onStartEdit: () => void;
  onChangeDraft: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onRestore: () => void;
}

export function ScaffoldInstructions({
  files, selectedFile, onSelectFile, content, modified, modifiedKeys,
  editing, draft, onStartEdit, onChangeDraft, onCancel, onSave, onRestore,
}: ScaffoldInstructionsProps) {
  const { t } = useT();
  return (
    <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <summary className="cursor-pointer text-xs font-bold text-gray-500 uppercase tracking-wide select-none">
        {t('scaffoldInstr.title')}
      </summary>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedFile}
            onChange={(e) => onSelectFile(e.target.value)}
            className="bg-white text-gray-800 text-xs rounded-lg px-2 py-1 border border-gray-300"
          >
            {files.map((f) => (
              <option key={f.key} value={f.key}>
                {t(FILE_LABEL_KEY[f.key] ?? '')}{modifiedKeys.includes(f.key) ? t('scaffoldInstr.modifiedSuffix') : ''}
              </option>
            ))}
          </select>
          {modified && <span className="text-[10px] font-bold text-amber-600 uppercase">{t('scaffoldInstr.modifiedBadge')}</span>}
        </div>

        {editing ? (
          <>
            <textarea
              className="w-full p-3 border-2 border-gray-200 rounded-xl h-72 outline-none font-mono text-xs bg-white"
              value={draft}
              onChange={(e) => onChangeDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={onSave} className="bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">{t('common.save')}</button>
              <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold uppercase">{t('common.cancel')}</button>
            </div>
          </>
        ) : (
          <>
            <pre className="w-full p-3 border border-gray-200 rounded-xl h-72 overflow-auto font-mono text-xs bg-white whitespace-pre-wrap text-gray-700">{content}</pre>
            <div className="flex gap-2">
              <button type="button" onClick={onStartEdit} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">{t('common.edit')}</button>
              <button type="button" onClick={onRestore} disabled={!modified} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-40">{t('scaffoldInstr.restoreDefault')}</button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
