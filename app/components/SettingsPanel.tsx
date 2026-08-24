import { ToggleSwitch } from './ToggleSwitch';
import { useT } from '../hooks/useT';

interface SettingsPanelProps {
  anthropicKey: string;
  onAnthropicKeyChange: (value: string) => void;
  openaiKey: string;
  onOpenaiKeyChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  refineMasterEnabled: boolean;
  onRefineMasterEnabledChange: (v: boolean) => void;
  anthropicEnabled: boolean;
  onAnthropicEnabledChange: (v: boolean) => void;
  openaiEnabled: boolean;
  onOpenaiEnabledChange: (v: boolean) => void;
}

export function SettingsPanel({
  anthropicKey,
  onAnthropicKeyChange,
  openaiKey,
  onOpenaiKeyChange,
  onSave,
  onClose,
  refineMasterEnabled,
  onRefineMasterEnabledChange,
  anthropicEnabled,
  onAnthropicEnabledChange,
  openaiEnabled,
  onOpenaiEnabledChange,
}: SettingsPanelProps) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 w-full max-w-2xl">
        <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">{t('settings.title')}</h2>
        <p className="text-xs text-gray-500 mb-6">
          {t('settings.intro')}
        </p>

        <div className="mb-5 pb-5 border-b border-gray-100">
          <ToggleSwitch label={t('settings.masterToggle')} checked={refineMasterEnabled} onChange={onRefineMasterEnabledChange} />
          <p className="text-[10px] text-gray-400 mt-1">{t('settings.masterToggleNote')}</p>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('settings.engines')}</p>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {t('settings.anthropicKeyLabel')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder="sk-ant-..."
                className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none font-mono text-sm"
                value={anthropicKey}
                onChange={(e) => onAnthropicKeyChange(e.target.value)}
              />
              <ToggleSwitch label={t('settings.claudeApi')} checked={anthropicEnabled} onChange={onAnthropicEnabledChange} disabled={!refineMasterEnabled} />
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-600 underline"
            >
              {t('settings.whereToGet')}
            </a>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {t('settings.openaiKeyLabel')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder="sk-..."
                className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none font-mono text-sm"
                value={openaiKey}
                onChange={(e) => onOpenaiKeyChange(e.target.value)}
              />
              <ToggleSwitch label={t('settings.openaiApi')} checked={openaiEnabled} onChange={onOpenaiEnabledChange} disabled={!refineMasterEnabled} />
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-600 underline"
            >
              {t('settings.whereToGet')}
            </a>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
          >
            {t('common.save')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 font-black py-3 rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
