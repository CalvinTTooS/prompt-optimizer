'use client';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useT } from '../hooks/useT';

interface AppHeaderProps {
  debugLoggingEnabled: boolean;
  onToggleDebugLogging: (enabled: boolean) => void;
  onResetKey: () => void;
  onOpenSettings: () => void;
  version?: string;
}

export function AppHeader({ debugLoggingEnabled, onToggleDebugLogging, onResetKey, onOpenSettings, version }: AppHeaderProps) {
  const { t } = useT();
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex flex-col">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Prompt Optimizer</h1>
        {version && (
          <span className="text-[10px] font-mono text-gray-300 mt-0.5 tracking-wider">
            v{version}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <label
          className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest border border-gray-200 px-3 py-1 rounded-full"
          title={t('header.debugLogTooltip')}
        >
          <input
            type="checkbox"
            className="w-3 h-3"
            checked={debugLoggingEnabled}
            onChange={(e) => onToggleDebugLogging(e.target.checked)}
          />
          {t('header.debugLog')}
        </label>
        <button onClick={onOpenSettings} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest border border-gray-200 px-3 py-1 rounded-full">{t('header.settings')}</button>
        <button onClick={onResetKey} className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest border border-gray-200 px-3 py-1 rounded-full">{t('header.resetKey')}</button>
      </div>
    </div>
  );
}
