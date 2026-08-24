import { describe, it as test, expect, beforeEach, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-store', () => ({
  load: async () => ({ get: async () => undefined, set: async () => {}, save: async () => {} }),
}));

import { t, setLang, detectLang } from './i18n';
import { it as itDict } from './i18n/it';
import { en as enDict } from './i18n/en';
import { es as esDict } from './i18n/es';
import { fr as frDict } from './i18n/fr';
import { de as deDict } from './i18n/de';
import { zh as zhDict } from './i18n/zh';
import { zhHant as zhHantDict } from './i18n/zh-Hant';
import { pt as ptDict } from './i18n/pt';
import { ja as jaDict } from './i18n/ja';

describe('i18n', () => {
  beforeEach(async () => { try { await setLang('it'); } catch { /* store non disponibile in test */ } });
  test('t risolve nella lingua corrente e fa fallback su it, poi sulla chiave', () => {
    expect(t('setup.activate')).toBe('Attiva Applicazione');
    expect(t('__inesistente__')).toBe('__inesistente__');
  });
  test('interpolazione {var}', () => {
    expect(t('toast.error', { message: 'X' })).toBe('Errore: X');
  });
  test('detectLang mappa un locale supportato, altrimenti it', () => {
    expect(['it', 'en', 'es', 'fr', 'de', 'zh', 'zh-Hant', 'pt', 'ja']).toContain(detectLang());
  });
});

describe('coerenza chiavi tra i dizionari', () => {
  const itKeys = Object.keys(itDict).sort();

  test('en ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(enDict).sort()).toEqual(itKeys);
  });
  test('es ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(esDict).sort()).toEqual(itKeys);
  });
  test('fr ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(frDict).sort()).toEqual(itKeys);
  });
  test('de ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(deDict).sort()).toEqual(itKeys);
  });
  test('zh ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(zhDict).sort()).toEqual(itKeys);
  });
  test('zh-Hant ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(zhHantDict).sort()).toEqual(itKeys);
  });
  test('pt ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(ptDict).sort()).toEqual(itKeys);
  });
  test('ja ha lo stesso set di chiavi di it', () => {
    expect(Object.keys(jaDict).sort()).toEqual(itKeys);
  });
});
