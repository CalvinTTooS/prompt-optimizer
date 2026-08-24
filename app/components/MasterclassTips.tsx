'use client';
import { useT } from '../hooks/useT';

export function MasterclassTips() {
  const { t } = useT();
  return (
    <div className="mt-24 border-t-2 border-gray-100 pt-16 pb-24">
      <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">{t('tips.title')}</h2>
      <p className="text-sm text-gray-500 mb-12 max-w-2xl">{t('tips.introPre')}<strong>{t('tips.introStrong')}</strong>{t('tips.introPost')}</p>

      {/* Principi validi su entrambi i modelli */}
      <h3 className="text-2xl font-bold text-gray-800 tracking-tight mb-6">{t('tips.sectionFundamentals')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.xmlTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.xmlBody')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.roleTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.roleBody')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.clarityTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.clarityBody')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.fewshotTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.fewshotPre')}<strong>{t('tips.fewshotStrong')}</strong>{t('tips.fewshotPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.positiveTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.positivePre')}<strong>{t('tips.positiveStrong1')}</strong>{t('tips.positiveMid')}<strong>{t('tips.positiveStrong2')}</strong>{t('tips.positivePost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.topTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.topPre')}<strong>{t('tips.topStrong')}</strong>{t('tips.topPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.cotTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.cotBody')}</p>
        </div>
      </div>

      {/* Le poche differenze genuinamente legate al modello */}
      <h3 className="text-2xl font-bold text-gray-800 tracking-tight mt-16 mb-6">{t('tips.sectionModelSpecific')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">G</span>
            <h4 className="font-bold text-blue-600 text-sm tracking-tight">Google Gemini</h4>
          </div>
          <p className="text-sm text-gray-600"><strong>{t('tips.geminiStrong1')}</strong>{t('tips.geminiMid')}<strong>{t('tips.geminiStrong2')}</strong>{t('tips.geminiPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">A</span>
            <h4 className="font-bold text-orange-600 text-sm tracking-tight">Anthropic Claude</h4>
          </div>
          <p className="text-sm text-gray-600"><strong>{t('tips.claudeStrong')}</strong>{t('tips.claudeBody')}</p>
        </div>
      </div>

      {/* Best practice specifiche per ciascun formato di output dell'app */}
      <h3 className="text-2xl font-bold text-gray-800 tracking-tight mt-16 mb-6">{t('tips.sectionByOutput')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-blue-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.chatbotTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.chatbotBody')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-orange-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.claudemdTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.claudemdPre')}<strong>{t('tips.claudemdStrong')}</strong>{t('tips.claudemdPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-green-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.geminimdTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.geminimdPre')}<code className="text-xs bg-gray-100 px-1 rounded">@file.md</code>{t('tips.geminimdPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-indigo-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.coworkTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.coworkPre')}<strong>{t('tips.coworkStrong1')}</strong>{t('tips.coworkMid')}<strong>{t('tips.coworkStrong2')}</strong>{t('tips.coworkPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-teal-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.sysuserTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.sysuserPre')}<strong>{t('tips.sysuserStrong1')}</strong>{t('tips.sysuserMid')}<strong>{t('tips.sysuserStrong2')}</strong>{t('tips.sysuserPost')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-green-600 text-xs uppercase mb-2 underline underline-offset-4 tracking-widest">{t('tips.projectTitle')}</h4>
          <p className="text-sm text-gray-600">{t('tips.projectBody')}</p>
        </div>
      </div>
    </div>
  );
}
