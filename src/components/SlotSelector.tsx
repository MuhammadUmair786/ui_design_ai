import type { SlotId, SlotSelection } from '../types';
import { SLOTS, SLOT_LABELS } from '../types';

const ACCENT: Record<SlotId, string> = {
  a: 'var(--slot-a)',
  b: 'var(--slot-b)',
  c: 'var(--slot-c)',
};

interface SlotSelectorProps {
  selection: SlotSelection;
  disabled?: boolean;
  onChange: (selection: SlotSelection) => void;
}

export function SlotSelector({ selection, disabled, onChange }: SlotSelectorProps) {
  const selectedCount = SLOTS.filter((slot) => selection[slot]).length;

  const toggle = (slot: SlotId) => {
    if (disabled) return;
    onChange({ ...selection, [slot]: !selection[slot] });
  };

  const selectAll = () => {
    if (disabled) return;
    onChange({ a: true, b: true, c: true });
  };

  const selectNone = () => {
    if (disabled) return;
    onChange({ a: false, b: false, c: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--ink-muted)]">Generate:</span>

      {SLOTS.map((slot) => {
        const active = selection[slot];
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(slot)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              active
                ? 'border-transparent text-white shadow-sm'
                : 'border-[var(--line)] bg-white text-[var(--ink-muted)] hover:bg-[var(--bg)]'
            }`}
            style={active ? { background: ACCENT[slot] } : undefined}
          >
            {SLOT_LABELS[slot]}
          </button>
        );
      })}

      <span className="text-[var(--line)]">|</span>

      <button
        type="button"
        disabled={disabled || selectedCount === SLOTS.length}
        onClick={selectAll}
        className="text-xs font-medium text-[var(--accent)] disabled:opacity-40 hover:enabled:underline"
      >
        All
      </button>
      <button
        type="button"
        disabled={disabled || selectedCount === 0}
        onClick={selectNone}
        className="text-xs font-medium text-[var(--ink-muted)] disabled:opacity-40 hover:enabled:underline"
      >
        None
      </button>
    </div>
  );
}
