import { useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { SlotId } from '../types';
import { SLOT_LABELS } from '../types';
import { createProviderClient, classifyError } from '../providers';
import { runHtmlEdit } from '../agents';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { IframePreview } from './IframePreview';
import { DownloadButton } from './DownloadButton';

interface EditorViewProps {
  slot: SlotId;
  model: string;
  initialHtml: string;
  apiKey: string;
  onClose: () => void;
  onSave: (slot: SlotId, html: string) => void;
}

export function EditorView({
  slot,
  model,
  initialHtml,
  apiKey,
  onClose,
  onSave,
}: EditorViewProps) {
  const [code, setCode] = useState(initialHtml);
  const [instruction, setInstruction] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const debouncedHtml = useDebouncedValue(code, 450);

  const askAi = useCallback(async () => {
    const trimmed = instruction.trim();
    if (!trimmed || !apiKey.trim()) {
      setAiError(!apiKey.trim() ? 'Add an OpenRouter API key in Settings.' : null);
      return;
    }

    setAiBusy(true);
    setAiError(null);
    try {
      const client = createProviderClient(slot, apiKey, model);
      const next = await runHtmlEdit(client, code, trimmed);
      setCode(next);
      setInstruction('');
    } catch (err) {
      setAiError(classifyError(err).message);
    } finally {
      setAiBusy(false);
    }
  }, [apiKey, code, instruction, model, slot]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Editor</p>
          <h2 className="text-base font-semibold">{SLOT_LABELS[slot]}</h2>
          <p className="font-mono text-[11px] text-[var(--ink-muted)]">{model}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadButton html={code} slot={slot} model={model} />
          <button
            type="button"
            onClick={() => {
              onSave(slot, code);
              onClose();
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Save & close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
          >
            Close
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-[40vh] border-b border-[var(--line)] lg:min-h-0 lg:border-b-0 lg:border-r">
          <Editor
            height="100%"
            defaultLanguage="html"
            theme="vs-light"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <div className="min-h-[40vh] bg-white lg:min-h-0">
          <IframePreview
            html={debouncedHtml}
            title={`${SLOT_LABELS[slot]} live preview`}
          />
        </div>
      </div>

      <footer className="border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
        <label className="block text-xs font-medium text-[var(--ink-muted)]">
          Ask AI to change this
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void askAi();
              }
            }}
            placeholder="e.g. Make the hero darker and enlarge the primary CTA"
            disabled={aiBusy}
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <button
            type="button"
            onClick={() => void askAi()}
            disabled={aiBusy || !instruction.trim()}
            className="shrink-0 rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40 hover:enabled:opacity-90"
          >
            {aiBusy ? 'Editing…' : 'Apply'}
          </button>
        </div>
        {aiError && (
          <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
            {aiError}
          </p>
        )}
      </footer>
    </div>
  );
}
