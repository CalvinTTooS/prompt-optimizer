import { load } from '@tauri-apps/plugin-store';
import {
  DEFAULT_REFINE_MODEL,
  REFINE_MODELS,
  type RefineModel,
} from './claudeRefine';

const STORE_FILE = 'settings.json';
const REFINE_MODEL_FIELD = 'refineModel';

export async function getStoredRefineModel(): Promise<RefineModel> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  const value = await store.get<string>(REFINE_MODEL_FIELD);
  return (REFINE_MODELS as readonly string[]).includes(value ?? '')
    ? (value as RefineModel)
    : DEFAULT_REFINE_MODEL;
}

export async function setStoredRefineModel(model: RefineModel): Promise<void> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  await store.set(REFINE_MODEL_FIELD, model);
  await store.save();
}
