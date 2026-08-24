import { load } from '@tauri-apps/plugin-store';
import { SCAFFOLD_EDITABLE_FILES, type ScaffoldFileKey } from './scaffoldTemplates';

export const SCAFFOLD_OVERRIDES_STORE_FILE = 'scaffold-overrides.json';

async function getStore() {
  return load(SCAFFOLD_OVERRIDES_STORE_FILE, { defaults: {}, autoSave: false });
}

export async function getScaffoldOverride(key: ScaffoldFileKey): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(key)) ?? null;
}

export async function setScaffoldOverride(key: ScaffoldFileKey, content: string): Promise<void> {
  const store = await getStore();
  await store.set(key, content);
  await store.save();
}

export async function clearScaffoldOverride(key: ScaffoldFileKey): Promise<void> {
  const store = await getStore();
  await store.delete(key);
  await store.save();
}

export async function getAllScaffoldOverrides(): Promise<Partial<Record<ScaffoldFileKey, string>>> {
  const store = await getStore();
  const out: Partial<Record<ScaffoldFileKey, string>> = {};
  for (const { key } of SCAFFOLD_EDITABLE_FILES) {
    const v = await store.get<string>(key);
    if (typeof v === 'string') out[key] = v;
  }
  return out;
}
