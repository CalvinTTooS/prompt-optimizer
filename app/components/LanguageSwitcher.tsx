'use client';
import { useT } from '../hooks/useT';
import { LANGS, type Lang } from '../lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => { void setLang(e.target.value as Lang); }}
      className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-200 px-2 py-1 rounded-full bg-white cursor-pointer"
    >
      {LANGS.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
    </select>
  );
}
