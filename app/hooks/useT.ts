import { useSyncExternalStore } from 'react';
import { subscribe, getLang, t, setLang } from '../lib/i18n';

export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return { t, lang, setLang };
}
