import type { OpenRouterModel, PipelineStage, SlotId, SlotResult } from '../types';
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
}

const ACCENT: Record<SlotId, string> = {
  a: 'var(--slot-a)',
  b: 'var(--slot-b)',
  c: 'var(--slot-c)',
};

const STAGE_LABEL: Record<PipelineStage, string> = {
  idle: 'Waiting',
  planning: 'Planner…',
  generating: 'Generator…',
  critiquing: 'Critic…',
  fixing: 'Fix pass…',
  done: 'Ready',
  error: 'Failed',
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
        {STAGE_LABEL[stage]}
      </p>
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
}: DesignColumnProps) {
  const { slot, stage, html, error, fixed } = result;
  const running = stage !== 'idle' && stage !== 'done' && stage !== 'error';

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

        {stage === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-[var(--danger)]">Pipeline failed</p>
            <p className="max-w-sm text-xs text-[var(--ink-muted)]">{error}</p>
          </div>
        )}

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
