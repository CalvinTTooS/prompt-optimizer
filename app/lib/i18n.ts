import { load } from '@tauri-apps/plugin-store';
import { it } from './i18n/it';
import { en } from './i18n/en';
import { es } from './i18n/es';
import { fr } from './i18n/fr';
import { de } from './i18n/de';
import { zh } from './i18n/zh';
import { zhHant } from './i18n/zh-Hant';
import { pt } from './i18n/pt';
import { ja } from './i18n/ja';

export type Lang = 'it' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'zh-Hant' | 'pt' | 'ja';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文（简体）' },
  { code: 'zh-Hant', label: '中文（繁體）' },
  { code: 'pt', label: 'Português (BR)' },
  { code: 'ja', label: '日本語' },
];
const CODES: Lang[] = ['it', 'en', 'es', 'fr', 'de', 'zh', 'zh-Hant', 'pt', 'ja'];
const DICTS: Record<Lang, Record<string, string>> = { it, en, es, fr, de, zh, 'zh-Hant': zhHant, pt, ja };

const STORE_FILE = 'settings.json';
const LANG_FIELD = 'uiLang';

export function detectLang(): Lang {
  if (typeof navigator !== 'undefined') {
    const full = navigator.language.toLowerCase();
    if (full.startsWith('zh')) {
      return (full.includes('hant') || full.includes('hk') || full.includes('tw') || full.includes('mo')) ? 'zh-Hant' : 'zh';
    }
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'it';
  return (CODES as string[]).includes(nav) ? (nav as Lang) : 'it';
}

let lang: Lang = detectLang();
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getLang(): Lang { return lang; }

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.it[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export async function setLang(next: Lang): Promise<void> {
  if (next === lang) { /* still persist */ } else { lang = next; emit(); }
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  await store.set(LANG_FIELD, next);
  await store.save();
}

/** Applica la lingua salvata (se presente) — ha precedenza sull'auto-rilevata. */
export async function initLangFromStore(): Promise<void> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  const stored = await store.get<string>(LANG_FIELD);
  if (stored && (CODES as string[]).includes(stored) && stored !== lang) {
    lang = stored as Lang; emit();
  }
}
