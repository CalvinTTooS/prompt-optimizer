import { load } from '@tauri-apps/plugin-store';

export const API_KEY_STORE_FILE = 'settings.json';
export const API_KEY_FIELD = 'geminiApiKey';

async function getStore() {
  return load(API_KEY_STORE_FILE, { defaults: {}, autoSave: false });
}

export async function getStoredApiKey(): Promise<string | null> {
  const store = await getStore();
  const value = await store.get<string>(API_KEY_FIELD);
  return value ?? null;
}

export async function setStoredApiKey(apiKey: string): Promise<void> {
  const store = await getStore();
  await store.set(API_KEY_FIELD, apiKey);
  await store.save();
}

export async function clearStoredApiKey(): Promise<void> {
  const store = await getStore();
  await store.delete(API_KEY_FIELD);
  await store.save();
}

export type ProviderKeyId = 'anthropic' | 'openai';
const PROVIDER_KEY_FIELD: Record<ProviderKeyId, string> = {
  anthropic: 'anthropicApiKey',
  openai: 'openaiApiKey',
};

export async function getStoredProviderKey(id: ProviderKeyId): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(PROVIDER_KEY_FIELD[id])) ?? null;
}

export async function setStoredProviderKey(id: ProviderKeyId, key: string): Promise<void> {
  const store = await getStore();
  await store.set(PROVIDER_KEY_FIELD[id], key);
  await store.save();
}

export async function clearStoredProviderKey(id: ProviderKeyId): Promise<void> {
  const store = await getStore();
  await store.delete(PROVIDER_KEY_FIELD[id]);
  await store.save();
}

export type EngineFlagId = 'refineMaster' | 'anthropic' | 'openai';
const ENGINE_FLAG_FIELD: Record<EngineFlagId, string> = {
  refineMaster: 'refineMasterEnabled',
  anthropic: 'engineAnthropicEnabled',
  openai: 'engineOpenaiEnabled',
};

/** Flag di abilitazione motore; default TRUE quando assente. */
export async function getEngineFlag(id: EngineFlagId): Promise<boolean> {
  const store = await getStore();
  const value = await store.get<boolean>(ENGINE_FLAG_FIELD[id]);
  return value ?? true;
}

export async function setEngineFlag(id: EngineFlagId, value: boolean): Promise<void> {
  const store = await getStore();
  await store.set(ENGINE_FLAG_FIELD[id], value);
  await store.save();
}
