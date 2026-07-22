import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { OpenRouterModel } from '../types';

interface ModelSelectProps {
  value: string;
  models: OpenRouterModel[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (modelId: string) => void;
}

/**
 * Searchable model picker for OpenRouter's large catalog.
 * Filters by id or display name as the user types.
 */
export function ModelSelect({
  value,
  models,
  loading = false,
  disabled = false,
  onChange,
}: ModelSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = models.find((m) => m.id === value);
  const display = selected?.name ?? value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [models, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setQuery('');
        }}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-left text-xs disabled:opacity-50 hover:enabled:border-[var(--accent)]"
        title={value}
      >
        <span className="min-w-0 truncate font-medium text-[var(--ink)]">
          {loading && models.length === 0 ? 'Loading models…' : display}
        </span>
        <span className="shrink-0 text-[var(--ink-muted)]" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-lg">
          <div className="border-b border-[var(--line)] p-1.5">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-[var(--ink-muted)]">
                No models match
              </li>
            )}
            {filtered.map((m) => {
              const active = m.id === value;
              return (
                <li key={m.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-[var(--bg)] ${
                      active ? 'bg-[var(--bg)]' : ''
                    }`}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="text-xs font-medium text-[var(--ink)]">
                      {m.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {m.id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-[var(--line)] px-3 py-1.5 text-[10px] text-[var(--ink-muted)]">
            {filtered.length} of {models.length} OpenRouter models
          </p>
        </div>
      )}
    </div>
  );
}
