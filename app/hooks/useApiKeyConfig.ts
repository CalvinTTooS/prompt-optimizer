import { useEffect, useState } from 'react';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  getStoredProviderKey,
  setStoredProviderKey,
  getEngineFlag,
  setEngineFlag,
} from '../lib/secureApiKeyStore';
import { logger } from '../lib/logger';
import { toast } from '../lib/toast';
import { t } from '../lib/i18n';

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

export interface OptimizerModel {
  id: string;
  name: string;
}

// Stato esplicito del caricamento modelli: evita di dedurre "sto caricando"
// dal solo `models.length === 0`, che confondeva caricamento, errore e vuoto
// (offline restava un "Caricamento..." eterno). Ora ogni stato ha il suo esito.
export type ModelsStatus = 'idle' | 'loading' | 'error' | 'loaded';

export function useApiKeyConfig() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [models, setModels] = useState<OptimizerModel[]>([]);
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus>('idle');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [anthropicKey, setAnthropicKey] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [savedAnthropicKey, setSavedAnthropicKey] = useState<string>('');
  const [savedOpenaiKey, setSavedOpenaiKey] = useState<string>('');
  const [refineMasterEnabled, setRefineMasterEnabledState] = useState<boolean>(true);
  const [anthropicEnabled, setAnthropicEnabledState] = useState<boolean>(true);
  const [openaiEnabled, setOpenaiEnabledState] = useState<boolean>(true);

  const loadModelsDirectlyFromGoogle = async (key: string) => {
    setModelsStatus('loading');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (!res.ok) throw new Error('Chiave non valida o errore di rete');

      const data = (await res.json()) as { models?: GeminiModel[] };
      if (data.models) {
        const usableModels = data.models.filter(
          (m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'),
        );

        let formattedModels = usableModels.map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));

        formattedModels = formattedModels.filter((m) => {
          const idLower = m.id.toLowerCase();
          return (
            !idLower.includes('gemma') &&
            !idLower.includes('nano') &&
            !idLower.includes('lyria') &&
            !idLower.includes('deep') &&
            !idLower.includes('research')
          );
        });

        setModels(formattedModels);

        if (formattedModels.length > 0) {
          // Default: the current Flash-Lite alias — cheapest and fastest tier,
          // and a MOVING alias so the app follows Google's current model
          // without a code change. (The eval harness pins an exact version
          // instead: there comparability across runs matters more than being
          // current.) The chain degrades gracefully because the list is fetched
          // live and its naming has changed before.
          const defaultM =
            formattedModels.find((m) => m.id === 'gemini-flash-lite-latest') ||
            formattedModels.find((m) => m.id.includes('flash-lite') && m.id.includes('latest')) ||
            formattedModels.find((m) => m.id.includes('flash-lite')) ||
            formattedModels.find((m) => m.id.includes('flash-latest')) ||
            formattedModels.find((m) => m.id.includes('flash')) ||
            formattedModels[0];
          setSelectedModel(defaultM.id);
          setModelsStatus('loaded');
        } else {
          // Risposta valida ma nessun modello utilizzabile: è comunque un
          // esito da "riprova", non un caricamento in corso.
          setModelsStatus('error');
        }
      } else {
        setModelsStatus('error');
      }
    } catch (e) {
      logger.error(`Errore recupero modelli: ${e}`);
      toast.error(t('toast.modelsLoadFailed'));
      setModelsStatus('error');
    }
  };

  // Ricarica manuale (pulsante ↻): utile quando il primo tentativo è fallito
  // offline. No-op se non c'è ancora una chiave configurata.
  const reloadModels = async () => {
    if (apiKey) await loadModelsDirectlyFromGoogle(apiKey);
  };

  useEffect(() => {
    (async () => {
      const savedKey = await getStoredApiKey();
      if (savedKey) {
        setApiKey(savedKey);
        setIsConfigured(true);
        loadModelsDirectlyFromGoogle(savedKey);
      }
    })();
    (async () => {
      const [savedAnthropic, savedOpenai] = await Promise.all([
        getStoredProviderKey('anthropic'),
        getStoredProviderKey('openai'),
      ]);
      if (savedAnthropic) { setAnthropicKey(savedAnthropic); setSavedAnthropicKey(savedAnthropic); }
      if (savedOpenai) { setOpenaiKey(savedOpenai); setSavedOpenaiKey(savedOpenai); }
    })();
    (async () => {
      const [m, a, o] = await Promise.all([
        getEngineFlag('refineMaster'),
        getEngineFlag('anthropic'), getEngineFlag('openai'),
      ]);
      setRefineMasterEnabledState(m);
      setAnthropicEnabledState(a); setOpenaiEnabledState(o);
    })();
  }, []);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length > 10) {
      await setStoredApiKey(apiKey);
      setIsConfigured(true);
      loadModelsDirectlyFromGoogle(apiKey);
    } else {
      toast.error(t('toast.invalidApiKey'));
    }
  };

  const handleResetKey = async () => {
    await clearStoredApiKey();
    setIsConfigured(false);
    setApiKey('');
    setModels([]);
    setModelsStatus('idle');
  };

  const saveProviderKeys = async () => {
    await Promise.all([
      setStoredProviderKey('anthropic', anthropicKey),
      setStoredProviderKey('openai', openaiKey),
    ]);
    setSavedAnthropicKey(anthropicKey);
    setSavedOpenaiKey(openaiKey);
  };

  const setRefineMasterEnabled = (v: boolean) => { setRefineMasterEnabledState(v); void setEngineFlag('refineMaster', v); };
  const setAnthropicEnabled = (v: boolean) => { setAnthropicEnabledState(v); void setEngineFlag('anthropic', v); };
  const setOpenaiEnabled = (v: boolean) => { setOpenaiEnabledState(v); void setEngineFlag('openai', v); };

  return {
    apiKey,
    setApiKey,
    isConfigured,
    models,
    modelsStatus,
    reloadModels,
    selectedModel,
    setSelectedModel,
    saveConfig,
    handleResetKey,
    anthropicKey,
    setAnthropicKey,
    openaiKey,
    setOpenaiKey,
    savedAnthropicKey,
    savedOpenaiKey,
    saveProviderKeys,
    refineMasterEnabled,
    setRefineMasterEnabled,
    anthropicEnabled,
    setAnthropicEnabled,
    openaiEnabled,
    setOpenaiEnabled,
  };
}
