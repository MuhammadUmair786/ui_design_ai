import type { AppSettings } from '../types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChangeKey: (value: string) => void;
  onSave: () => void;
  saved: boolean;
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChangeKey,
  onSave,
  saved,
}: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="settings-title"
      >
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold tracking-tight">
              Settings
            </h2>
            <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
              OpenRouter key · stored in localStorage only
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-[var(--ink-muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]"
            aria-label="Close settings"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">OpenRouter API key</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={settings.openRouterKey}
              onChange={(e) => onChangeKey(e.target.value)}
              placeholder="sk-or-v1-…"
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="block text-xs text-[var(--ink-muted)]">
              One key for all models at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--ink)]"
              >
                openrouter.ai/keys
              </a>
              . Pick a different model per design column.
            </span>
          </label>

          <p className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink-muted)]">
            Your key is sent only from this browser to OpenRouter. GUIDE has no
            backend. Enable browser access on your OpenRouter account if
            requests are blocked.
          </p>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
          <span className="text-sm text-[var(--accent)]" aria-live="polite">
            {saved ? 'Saved' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave();
              }}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Save key
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
