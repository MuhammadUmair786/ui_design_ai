import { useState } from 'react';
import type {
  OpenRouterModel,
  PipelineStage,
  ProviderErrorCode,
  SlotId,
  SlotResult,
} from '../types';
import { SLOT_LABELS } from '../types';
import { IframePreview } from './IframePreview';
import { DownloadButton } from './DownloadButton';
import { ModelSelect } from './ModelSelect';

interface DesignColumnProps {
  result: SlotResult;
  selectedModel: string;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelDisabled: boolean;
  onModelChange: (slot: SlotId, model: string) => void;
  onEdit: (slot: SlotId) => void;
  onGenerate?: (slot: SlotId) => void;
  generateDisabled?: boolean;
}

const ACCENT: Record<SlotId, string> = {
  a: 'var(--slot-a)',
  b: 'var(--slot-b)',
  c: 'var(--slot-c)',
};

const STAGE_LABEL: Record<PipelineStage, string> = {
  idle: 'Waiting',
  planning: 'Planner',
  generating: 'Generator',
  critiquing: 'Critic',
  fixing: 'Fix pass',
  done: 'Ready',
  error: 'Failed',
};

const ERROR_HINTS: Record<ProviderErrorCode, string> = {
  auth: 'Open Settings and verify your OpenRouter API key.',
  rate_limit: 'Requests are queued one at a time. Wait a minute, then try again.',
  network: 'Check your internet connection and retry.',
  parse: 'The model returned unusable output. Try again or pick a different model.',
  unknown: 'Check the technical details below or try a different model.',
};

function LoadingSkeleton({ stage }: { stage: PipelineStage }) {
  return (
    <div className="flex h-full flex-col gap-3 p-4" aria-busy="true" aria-label={STAGE_LABEL[stage]}>
      <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--line)]" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--line)]" />
      <div className="mt-2 flex-1 animate-pulse rounded-md bg-[var(--line)]/60" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded bg-[var(--line)]/50" />
        <div className="h-16 animate-pulse rounded bg-[var(--line)]/50" />
        <div className="h-16 animate-pulse rounded bg-[var(--line)]/50" />
      </div>
      <p className="text-center text-xs font-medium text-[var(--ink-muted)]">
        {STAGE_LABEL[stage]}…
      </p>
    </div>
  );
}

function PipelineErrorPanel({ result }: { result: SlotResult }) {
  const { error, failedStage, errorCode, errorStatus, errorDetail } = result;
  const [showDetail, setShowDetail] = useState(false);

  const hint = errorCode ? ERROR_HINTS[errorCode] : null;
  const stepLabel =
    failedStage && failedStage !== 'error' && failedStage !== 'idle'
      ? STAGE_LABEL[failedStage]
      : null;
  const detailText =
    errorDetail && errorDetail !== error ? errorDetail : null;

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center"
      role="alert"
    >
      <p className="text-sm font-semibold text-[var(--danger)]">Pipeline failed</p>

      {stepLabel && (
        <p className="text-xs font-medium text-[var(--ink-muted)]">
          Failed during: <span className="text-[var(--ink)]">{stepLabel}</span>
        </p>
      )}

      {error && (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--ink)]">{error}</p>
      )}

      {errorStatus != null && (
        <p className="text-xs text-[var(--ink-muted)]">HTTP {errorStatus}</p>
      )}

      {hint && (
        <p className="max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>
      )}

      {detailText && (
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {showDetail ? 'Hide technical details' : 'Show technical details'}
          </button>
          {showDetail && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-[var(--line)] bg-white p-3 text-left text-[10px] leading-relaxed text-[var(--ink-muted)] whitespace-pre-wrap break-words">
              {detailText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function DesignColumn({
  result,
  selectedModel,
  models,
  modelsLoading,
  modelDisabled,
  onModelChange,
  onEdit,
  onGenerate,
  generateDisabled,
}: DesignColumnProps) {
  const { slot, stage, html, fixed } = result;
  const running = stage !== 'idle' && stage !== 'done' && stage !== 'error';
  const canGenerate = !!onGenerate && !generateDisabled && !running;

  const modelsWithSelected =
    selectedModel && !models.some((m) => m.id === selectedModel)
      ? [{ id: selectedModel, name: selectedModel }, ...models]
      : models;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] shadow-sm">
      <header
        className="space-y-2 border-b border-[var(--line)] px-3 py-2.5"
        style={{ borderTopColor: ACCENT[slot], borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: ACCENT[slot] }}
              aria-hidden
            />
            <h3 className="truncate text-sm font-semibold">{SLOT_LABELS[slot]}</h3>
            {fixed && stage === 'done' && (
              <span className="truncate rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] text-[var(--ink-muted)]">
                fix applied
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onGenerate && (
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => onGenerate(slot)}
                title="Generate this design only"
                className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-medium hover:enabled:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? 'Running…' : 'Generate'}
              </button>
            )}
            <DownloadButton html={html} slot={slot} model={selectedModel} />
            <button
              type="button"
              disabled={!html}
              onClick={() => onEdit(slot)}
              className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[var(--accent-hover)]"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            Model
          </label>
          <ModelSelect
            value={selectedModel}
            models={modelsWithSelected}
            loading={modelsLoading}
            disabled={modelDisabled}
            onChange={(id) => onModelChange(slot, id)}
          />
        </div>
      </header>

      <div className="relative min-h-[320px] flex-1 bg-[var(--bg)]">
        {running && <LoadingSkeleton stage={stage} />}

        {stage === 'error' && <PipelineErrorPanel result={result} />}

        {stage === 'idle' && !html && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--ink-muted)]">
            Choose a model, then generate a design
          </div>
        )}

        {stage === 'done' && html && (
          <IframePreview html={html} title={`${SLOT_LABELS[slot]} design`} />
        )}
      </div>
    </section>
  );
}
