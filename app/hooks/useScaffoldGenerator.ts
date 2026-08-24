import { useEffect, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildScaffoldSchema, parseOptimizerResponse } from '../lib/promptOptimizer';
import { buildScaffold } from '../lib/scaffoldBuilder';
import { writeScaffoldToDir, downloadScaffoldZip } from '../lib/scaffoldPackager';
import { logger } from '../lib/logger';
import { toast } from '../lib/toast';
import { t } from '../lib/i18n';
import { SCAFFOLD_PROGETTO_INSTRUCTIONS } from '../constants/prompts';
import { SCAFFOLD_EDITABLE_FILES, defaultEditableContent, type ScaffoldFileKey } from '../lib/scaffoldTemplates';
import { getAllScaffoldOverrides, setScaffoldOverride, clearScaffoldOverride } from '../lib/scaffoldTemplateStore';

/**
 * "Structured scaffold" mode: from the user's project description, Gemini fills
 * only the project section of the CLAUDE.md/GEMINI.md template; the assembled
 * file set can then be written to a folder or downloaded as a zip.
 */
export function useScaffoldGenerator(apiKey: string, selectedModel: string) {
  const [scaffoldMode, setScaffoldMode] = useState<boolean>(false);
  const [scaffoldFiles, setScaffoldFiles] = useState<Record<string, string> | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<Partial<Record<ScaffoldFileKey, string>>>({});
  const [selectedFile, setSelectedFile] = useState<ScaffoldFileKey>(SCAFFOLD_EDITABLE_FILES[0].key);
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');

  useEffect(() => {
    let active = true;
    void (async () => {
      const all = await getAllScaffoldOverrides();
      if (active) setOverrides(all);
    })();
    return () => { active = false; };
  }, []);

  const effectiveContent = (key: ScaffoldFileKey): string => overrides[key] ?? defaultEditableContent(key);
  const isModified = (key: ScaffoldFileKey): boolean => overrides[key] != null;
  const selectFile = (key: ScaffoldFileKey) => { setSelectedFile(key); setEditing(false); };
  const startEdit = () => { setDraft(effectiveContent(selectedFile)); setEditing(true); };
  const changeDraft = (text: string) => setDraft(text);
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    await setScaffoldOverride(selectedFile, draft);
    setOverrides((prev) => ({ ...prev, [selectedFile]: draft }));
    setEditing(false);
  };
  const restore = async (key: ScaffoldFileKey) => {
    await clearScaffoldOverride(key);
    setOverrides((prev) => { const next = { ...prev }; delete next[key]; return next; });
    if (key === selectedFile) setEditing(false);
  };

  const generateScaffold = async (input: string) => {
    if (!input.trim() || !apiKey) return;

    setGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: buildScaffoldSchema(),
        },
      });

      const chat = model.startChat();
      const response = await chat.sendMessage([SCAFFOLD_PROGETTO_INSTRUCTIONS, input]);
      const finishReason = response.response.candidates?.[0]?.finishReason;

      const { progetto } = parseOptimizerResponse<{ progetto: string }>({
        text: response.response.text(),
        finishReason,
      });
      const effective: Partial<Record<ScaffoldFileKey, string>> = {};
      for (const { key } of SCAFFOLD_EDITABLE_FILES) effective[key] = effectiveContent(key);
      setScaffoldFiles(buildScaffold(progetto, effective));
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      logger.error(`Errore generazione scaffold: ${error}`);
      toast.error(t('toast.error', { message: message || t('toast.scaffoldGenFailed') }));
    } finally {
      setGenerating(false);
    }
  };

  const writeToDir = async () => {
    if (!scaffoldFiles) return;
    const ok = await writeScaffoldToDir(scaffoldFiles);
    if (ok) toast.success(t('toast.scaffoldWritten'));
  };

  const downloadZip = async () => {
    if (!scaffoldFiles) return;
    const ok = await downloadScaffoldZip(scaffoldFiles);
    if (ok) toast.success(t('toast.scaffoldZipDownloaded'));
  };

  return {
    scaffoldMode,
    setScaffoldMode,
    scaffoldFiles,
    generating,
    generateScaffold,
    writeToDir,
    downloadZip,
    editableFiles: SCAFFOLD_EDITABLE_FILES,
    selectedFile,
    selectFile,
    effectiveContent,
    isModified,
    editing,
    draft,
    startEdit,
    changeDraft,
    cancelEdit,
    saveEdit,
    restore,
  };
}
