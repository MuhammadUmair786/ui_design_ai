import { useMemo, useState } from 'react';
import type { SlotId } from './types';
import { useSettings } from './hooks/useSettings';
import { useSlotModels } from './hooks/useSlotModels';
import { useOpenRouterModels } from './hooks/useOpenRouterModels';
import { usePipeline } from './hooks/usePipeline';
import { hasOpenRouterKey } from './utils/storage';
import { downloadAllAsZip } from './utils/download';
import { SettingsPanel } from './components/SettingsPanel';
import { DesignColumn } from './components/DesignColumn';
import { EditorView } from './components/EditorView';

export default function App() {
  const { settings, updateOpenRouterKey, persist, saved } = useSettings();
  const { models: slotModels, setSlotModel } = useSlotModels();
  const { models: catalog, loading: modelsLoading } = useOpenRouterModels();
  const { results, isRunning, prompt, setPrompt, generate, updateHtml } =
    usePipeline(slotModels);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<SlotId | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  const editingResult = useMemo(
    () => (editing ? results.find((r) => r.slot === editing) : undefined),
    [editing, results],
  );

  const successCount = results.filter((r) => r.html).length;

  const handleGenerate = () => {
    if (!hasOpenRouterKey(settings)) {
      setSettingsOpen(true);
      return;
    }
    void generate(settings, prompt);
  };

  const handleDownloadAll = async () => {
    setZipError(null);
    setZipBusy(true);
    try {
      await downloadAllAsZip(results);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setZipBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--bg-elevated)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-[Georgia,Cambria,serif] text-xl tracking-tight text-[var(--ink)] sm:text-2xl">
              GUIDE
            </p>
            <p className="text-xs text-[var(--ink-muted)] sm:text-sm">
              Multi-agent HTML designs · powered by OpenRouter
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={successCount === 0 || zipBusy}
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm disabled:opacity-40 hover:enabled:bg-[var(--bg)]"
            >
              {zipBusy ? 'Zipping…' : 'Download all (.zip)'}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm hover:bg-[var(--bg)]"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-sm">
          <label htmlFor="prompt" className="text-sm font-medium">
            Describe the screen you want
          </label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A travel booking landing page with destination search, featured trips carousel (tabs), and a sticky book CTA"
            disabled={isRunning}
            className="mt-2 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isRunning || !prompt.trim()}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:enabled:bg-[var(--accent-hover)]"
            >
              {isRunning ? 'Running pipelines…' : 'Generate 3 designs'}
            </button>
            <p className="text-xs text-[var(--ink-muted)]">
              Each column runs Planner → Generator → Critic → optional Fix with
              its selected model.
            </p>
          </div>
          {zipError && (
            <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
              {zipError}
            </p>
          )}
        </section>

        <div className="grid min-h-[480px] flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          {results.map((result) => (
            <DesignColumn
              key={result.slot}
              result={result}
              selectedModel={slotModels[result.slot]}
              models={catalog}
              modelsLoading={modelsLoading}
              modelDisabled={isRunning}
              onModelChange={setSlotModel}
              onEdit={(slot) => setEditing(slot)}
            />
          ))}
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChangeKey={updateOpenRouterKey}
        onSave={() => {
          persist();
        }}
        saved={saved}
      />

      {editing && editingResult?.html && (
        <EditorView
          key={editing}
          slot={editing}
          model={slotModels[editing]}
          initialHtml={editingResult.html}
          apiKey={settings.openRouterKey}
          onClose={() => setEditing(null)}
          onSave={(slot, html) => updateHtml(slot, html)}
        />
      )}
    </div>
  );
}
