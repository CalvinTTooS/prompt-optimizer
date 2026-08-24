'use client';
import { useT } from '../hooks/useT';

interface SetupScreenProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SetupScreen({ apiKey, onApiKeyChange, onSubmit }: SetupScreenProps) {
  const { t } = useT();
  return (
    <main className="p-8 max-w-2xl mx-auto min-h-screen flex items-center">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 w-full">
        <h1 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">{t('setup.title')}</h1>
        <div className="space-y-6 mb-8 text-sm text-gray-600">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <p className="font-bold text-blue-900 mb-2 uppercase tracking-widest text-[10px]">{t('setup.quickGuide')}</p>
            <ol className="list-decimal ml-4 space-y-2 text-blue-800">
              <li>{t('setup.step1pre')}<a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold">Google AI Studio</a>{t('setup.step1post')}</li>
              <li>{t('setup.step2')}</li>
              <li>{t('setup.step3')}</li>
            </ol>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="password"
              placeholder={t('setup.placeholder')}
              className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-mono"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
            <button className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest">
              {t('setup.activate')}
            </button>
          </form>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {t('setup.privacy')}
          </p>
        </div>
      </div>
    </main>
  );
}
