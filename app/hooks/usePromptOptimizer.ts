import { useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildResponseSchema,
  buildOptimizerSystemInstruction,
  parseOptimizerResponse,
  type OptimizerResult,
} from '../lib/promptOptimizer';
import { runAnonymization, type CensoredEntry } from '../lib/anonymization';
import { saveTextFile } from '../lib/nativeDownload';
import { logger } from '../lib/logger';
import { toast } from '../lib/toast';
import { t } from '../lib/i18n';
import {
  FLOW_CHAT_INSTRUCTIONS,
  FLOW_COWORK_INSTRUCTIONS,
  FLOW_CODE_INSTRUCTIONS,
  FLOW_SYSTEM_USER_INSTRUCTIONS,
  FLOW_GEMINI_INSTRUCTIONS,
} from '../constants/prompts';
import { buildExamplesBlock, EMPTY_EXAMPLES, type SingleExample } from '../lib/fewShotExamples';

// Re-exported so UI components can import the result type from the hook they
// already depend on, keeping the single source of truth in lib/promptOptimizer.
export type { OptimizerResult };

function computeInitialVariables(parsed: OptimizerResult): Record<string, string> {
  const allText =
    (parsed.promptChat || '') +
    ' ' +
    (parsed.promptCowork || '') +
    ' ' +
    (parsed.promptCode || '') +
    ' ' +
    (parsed.promptSystem || '') +
    ' ' +
    (parsed.promptUser || '') +
    ' ' +
    (parsed.promptGemini || '');
  const matches = allText.match(/\[(?!EMAIL|TELEFONO|CARTA|CCV|MANUALE).*?\]/g);
  const initialVars: Record<string, string> = {};
  matches?.forEach((m) => (initialVars[m] = ''));
  return initialVars;
}

/** Prompt-editing, PII anonymization, and Gemini optimization for the current API key/model. */
export function usePromptOptimizer(apiKey: string, selectedModel: string) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const [enablePrivacy, setEnablePrivacy] = useState<boolean>(true);
  const [censoredData, setCensoredData] = useState<CensoredEntry[]>([]);

  const [genChat, setGenChat] = useState<boolean>(true);
  const [genCowork, setGenCowork] = useState<boolean>(false);
  const [genCode, setGenCode] = useState<boolean>(false);
  const [genSystemUser, setGenSystemUser] = useState<boolean>(false);
  const [genGemini, setGenGemini] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAutoAnonymize = () => {
    const { safeText, detected } = runAnonymization(input, censoredData);
    setCensoredData(detected);
    setInput(safeText);
  };

  const handleManualCensor = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selection = input.substring(start, end);

    if (selection && selection.trim().length > 0) {
      const placeholder = `[MANUALE_${censoredData.length + 1}]`;
      const newInput = input.substring(0, start) + placeholder + input.substring(end);
      setCensoredData((prev) => [...prev, { original: selection, placeholder }]);
      setInput(newInput);
    }
  };

  const handleRestoreField = (placeholder: string) => {
    const field = censoredData.find((d) => d.placeholder === placeholder);
    if (field) {
      const newInput = input.split(placeholder).join(field.original);
      setInput(newInput);
      setCensoredData((prev) => prev.filter((d) => d.placeholder !== placeholder));
    }
  };

  const handleRestoreAll = () => {
    let text = input;
    censoredData.forEach((d) => (text = text.split(d.placeholder).join(d.original)));
    setInput(text);
    setCensoredData([]);
  };

  const handleOptimize = async (examples: SingleExample[] = EMPTY_EXAMPLES) => {
    if (!input.trim() || !apiKey) return;
    if (!genChat && !genCowork && !genCode && !genSystemUser && !genGemini) {
      toast.error(t('toast.selectOutputFormat'));
      return;
    }

    setLoading(true);

    try {
      let finalInputForAI = input;
      let inputDetections = censoredData;

      if (enablePrivacy) {
        const anonymized = runAnonymization(input, censoredData);
        finalInputForAI = anonymized.safeText;
        inputDetections = anonymized.detected;
        setInput(anonymized.safeText);
        setCensoredData(inputDetections);
      }

      const responseSchema = buildResponseSchema({ genChat, genCowork, genCode, genSystemUser, genGemini });
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.5,
        },
      });

      const exBlock = buildExamplesBlock(examples);
      const tasks: string[] = [];
      if (genChat) tasks.push(FLOW_CHAT_INSTRUCTIONS + exBlock);
      if (genCowork) tasks.push(FLOW_COWORK_INSTRUCTIONS + exBlock);
      if (genCode) tasks.push(FLOW_CODE_INSTRUCTIONS + exBlock);
      if (genSystemUser) tasks.push(FLOW_SYSTEM_USER_INSTRUCTIONS + exBlock);
      if (genGemini) tasks.push(FLOW_GEMINI_INSTRUCTIONS + exBlock);

      let systemInstruction = buildOptimizerSystemInstruction(tasks);

      if (enablePrivacy) {
        // Scrub any PII inside the examples before the instruction reaches
        // Gemini. Seed with the input's detections so identical values reuse the
        // same placeholder; we deliberately do NOT persist example-only
        // detections to censoredData — they aren't in the user's input box and
        // would otherwise appear as phantom chips in the "Dati protetti" panel.
        // (This also re-scans the static FLOW_* instruction text: safe today, as
        // those constants contain no PII-matching content — keep it that way.)
        systemInstruction = runAnonymization(systemInstruction, inputDetections).safeText;
      }

      const chat = model.startChat();
      const response = await chat.sendMessage([systemInstruction, finalInputForAI]);
      const finishReason = response.response.candidates?.[0]?.finishReason;

      const parsed = parseOptimizerResponse({ text: response.response.text(), finishReason }) as OptimizerResult;
      setResult(parsed);
      setVariables(computeInitialVariables(parsed));
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      logger.error(`Dettaglio Errore: ${error}`);
      toast.error(t('toast.error', { message: message || t('toast.aiOutputFailed') }));
    } finally {
      setLoading(false);
    }
  };

  const getCleanedPrompt = (rawText: string | undefined) => {
    if (!rawText) return '';
    let p = rawText;
    censoredData.forEach((i) => (p = p.split(i.placeholder).join(i.original)));
    Object.keys(variables).forEach((k) => {
      if (variables[k]) p = p.split(k).join(variables[k]);
    });
    return p;
  };

  const downloadMarkdown = async (filename: string, prefix: string, content: string) => {
    // An empty prefix means the content already IS the whole file (e.g. GEMINI.md),
    // so don't prepend leading blank lines.
    const finalContent = prefix ? `${prefix}\n\n${content}` : content;
    await saveTextFile(filename, finalContent);
  };

  return {
    input,
    setInput,
    result,
    loading,
    variables,
    setVariables,
    enablePrivacy,
    setEnablePrivacy,
    censoredData,
    setCensoredData,
    genChat,
    setGenChat,
    genCowork,
    setGenCowork,
    genCode,
    setGenCode,
    genSystemUser,
    setGenSystemUser,
    genGemini,
    setGenGemini,
    textareaRef,
    handleAutoAnonymize,
    handleManualCensor,
    handleRestoreField,
    handleRestoreAll,
    handleOptimize,
    getCleanedPrompt,
    downloadMarkdown,
  };
}
