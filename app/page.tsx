'use client';
import { useEffect, useState } from 'react';
import { initLangFromStore } from './lib/i18n';
import { useApiKeyConfig } from './hooks/useApiKeyConfig';
import { usePromptOptimizer } from './hooks/usePromptOptimizer';
import { useDebugLogging } from './hooks/useDebugLogging';
import { useScaffoldGenerator } from './hooks/useScaffoldGenerator';
import { useFewShotExamples } from './hooks/useFewShotExamples';
import { useAppVersion } from './hooks/useAppVersion';
import { useClaudeRefine } from './hooks/useClaudeRefine';
import { SetupScreen } from './components/SetupScreen';
import { AppHeader } from './components/AppHeader';
import { SettingsPanel } from './components/SettingsPanel';
import { PromptEditor } from './components/PromptEditor';
import { ResultViewer } from './components/ResultViewer';
import { ScaffoldGenerator } from './components/ScaffoldGenerator';
import { MasterclassTips } from './components/MasterclassTips';

export default function Home() {
  useEffect(() => { void initLangFromStore(); }, []);
  const apiKeyConfig = useApiKeyConfig();
  const optimizer = usePromptOptimizer(apiKeyConfig.apiKey, apiKeyConfig.selectedModel);
  const fewShot = useFewShotExamples();
  const scaffold = useScaffoldGenerator(apiKeyConfig.apiKey, apiKeyConfig.selectedModel);
  const debugLogging = useDebugLogging();
  const refine = useClaudeRefine(apiKeyConfig.savedAnthropicKey, apiKeyConfig.savedOpenaiKey, {
    master: apiKeyConfig.refineMasterEnabled,
    anthropic: apiKeyConfig.anthropicEnabled,
    openai: apiKeyConfig.openaiEnabled,
  });
  const appVersion = useAppVersion();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!apiKeyConfig.isConfigured) {
    return <SetupScreen apiKey={apiKeyConfig.apiKey} onApiKeyChange={apiKeyConfig.setApiKey} onSubmit={apiKeyConfig.saveConfig} />;
  }

  return (
    <main className="p-8 max-w-5xl mx-auto text-black font-sans bg-gray-25 min-h-screen">
      <AppHeader
        debugLoggingEnabled={debugLogging.debugLoggingEnabled}
        onToggleDebugLogging={debugLogging.handleToggleDebugLogging}
        onResetKey={apiKeyConfig.handleResetKey}
        onOpenSettings={() => setSettingsOpen(true)}
        version={appVersion.version}
      />

      {settingsOpen && (
        <SettingsPanel
          anthropicKey={apiKeyConfig.anthropicKey}
          onAnthropicKeyChange={apiKeyConfig.setAnthropicKey}
          openaiKey={apiKeyConfig.openaiKey}
          onOpenaiKeyChange={apiKeyConfig.setOpenaiKey}
          onSave={async () => {
            await apiKeyConfig.saveProviderKeys();
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
          refineMasterEnabled={apiKeyConfig.refineMasterEnabled}
          onRefineMasterEnabledChange={apiKeyConfig.setRefineMasterEnabled}
          anthropicEnabled={apiKeyConfig.anthropicEnabled}
          onAnthropicEnabledChange={apiKeyConfig.setAnthropicEnabled}
          openaiEnabled={apiKeyConfig.openaiEnabled}
          onOpenaiEnabledChange={apiKeyConfig.setOpenaiEnabled}
        />
      )}

      <PromptEditor
        models={apiKeyConfig.models}
        modelsStatus={apiKeyConfig.modelsStatus}
        onReloadModels={apiKeyConfig.reloadModels}
        selectedModel={apiKeyConfig.selectedModel}
        onSelectedModelChange={apiKeyConfig.setSelectedModel}
        input={optimizer.input}
        onInputChange={optimizer.setInput}
        textareaRef={optimizer.textareaRef}
        onAutoAnonymize={optimizer.handleAutoAnonymize}
        onManualCensor={optimizer.handleManualCensor}
        enablePrivacy={optimizer.enablePrivacy}
        onEnablePrivacyChange={optimizer.setEnablePrivacy}
        censoredData={optimizer.censoredData}
        onRestoreField={optimizer.handleRestoreField}
        onRestoreAll={optimizer.handleRestoreAll}
        genChat={optimizer.genChat}
        onGenChatChange={optimizer.setGenChat}
        genCowork={optimizer.genCowork}
        onGenCoworkChange={optimizer.setGenCowork}
        genCode={optimizer.genCode}
        onGenCodeChange={optimizer.setGenCode}
        genSystemUser={optimizer.genSystemUser}
        onGenSystemUserChange={optimizer.setGenSystemUser}
        genGemini={optimizer.genGemini}
        onGenGeminiChange={optimizer.setGenGemini}
        loading={optimizer.loading}
        onOptimize={() => optimizer.handleOptimize(fewShot.examples)}
        examples={fewShot.examples}
        onAddExample={fewShot.addExample}
        onRemoveExample={fewShot.removeExample}
        onUpdateExample={fewShot.updateExample}
        onLoadExampleFile={fewShot.loadFromFile}
      />

      {optimizer.result && (
        <ResultViewer
          result={optimizer.result}
          variables={optimizer.variables}
          onVariableChange={(key, value) => optimizer.setVariables({ ...optimizer.variables, [key]: value })}
          getCleanedPrompt={optimizer.getCleanedPrompt}
          downloadMarkdown={optimizer.downloadMarkdown}
          providers={refine.availableProviders}
          refineModel={refine.model}
          onRefineModelChange={refine.setModel}
          refineStateFor={refine.stateFor}
          onRefine={refine.refine}
          onToggleRefineView={refine.toggleView}
          refineEvalStateFor={refine.evalStateFor}
          onEvaluate={refine.evaluate}
          refinePairState={refine.refinePairState}
          onRefinePair={refine.refinePair}
          onToggleRefinePairView={refine.toggleRefinePairView}
          evalPairState={refine.evalPairState}
          onEvaluatePair={refine.evaluatePair}
        />
      )}

      <ScaffoldGenerator
        scaffoldMode={scaffold.scaffoldMode}
        onScaffoldModeChange={scaffold.setScaffoldMode}
        input={optimizer.input}
        generating={scaffold.generating}
        scaffoldFiles={scaffold.scaffoldFiles}
        onGenerate={scaffold.generateScaffold}
        onWriteToDir={scaffold.writeToDir}
        onDownloadZip={scaffold.downloadZip}
        instructions={{
          files: scaffold.editableFiles,
          selectedFile: scaffold.selectedFile,
          onSelectFile: (k) => scaffold.selectFile(k as typeof scaffold.selectedFile),
          content: scaffold.effectiveContent(scaffold.selectedFile),
          modified: scaffold.isModified(scaffold.selectedFile),
          modifiedKeys: scaffold.editableFiles.filter((f) => scaffold.isModified(f.key)).map((f) => f.key),
          editing: scaffold.editing,
          draft: scaffold.draft,
          onStartEdit: scaffold.startEdit,
          onChangeDraft: scaffold.changeDraft,
          onCancel: scaffold.cancelEdit,
          onSave: scaffold.saveEdit,
          onRestore: () => scaffold.restore(scaffold.selectedFile),
        }}
      />

      <MasterclassTips />
    </main>
  );
}
