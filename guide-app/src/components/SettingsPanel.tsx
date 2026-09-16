import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import {
  DEFAULT_PROMPT_GUIDANCE,
  FIXED_OUTPUT_INFO,
  GUIDANCE_FIELD_META,
  MAX_MAX_TOKENS,
  MAX_TOKENS_PRESETS,
  MIN_MAX_TOKENS,
  clampMaxTokens,
  normalizePromptGuidance,
} from '../agents/prompts';

type SettingsTab = 'general' | 'prompts';

const PROMPT_SECTIONS = [
  {
    step: 'planner' as const,
    title: 'Planner',
    subtitle: 'Turns your screen brief into a structured design plan',
  },
  {
    step: 'generator' as const,
    title: 'Generator',
    subtitle: 'Builds the HTML page from the design plan',
  },
  {
    step: 'critic' as const,
    title: 'Critic',
    subtitle: 'Reviews the HTML against the plan',
  },
  {
    step: 'fix' as const,
    title: 'Fix',
    subtitle: 'Applies critic feedback when needed',
  },
] as const;

type GuidanceStep = (typeof PROMPT_SECTIONS)[number]['step'];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  saved: boolean;
}

function FixedOutputBadge({ step }: { step: GuidanceStep }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink-muted)]">
      <span className="font-medium text-[var(--ink)]">Fixed output · </span>
      {FIXED_OUTPUT_INFO[step]}
    </p>
  );
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  onSave,
  saved,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [tab, setTab] = useState<SettingsTab>('general');

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTab('general');
    }
  }, [open, settings]);

  const updateDraft = useCallback((patch: Partial<AppSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateGuidance = useCallback((step: GuidanceStep, value: string) => {
    setDraft((prev) => {
      if (step === 'planner') {
        return {
          ...prev,
          promptGuidance: {
            ...prev.promptGuidance,
            planner: { designGuidance: value },
          },
        };
      }
      if (step === 'generator') {
        return {
          ...prev,
          promptGuidance: {
            ...prev.promptGuidance,
            generator: { visualQuality: value },
          },
        };
      }
      if (step === 'critic') {
        return {
          ...prev,
          promptGuidance: {
            ...prev.promptGuidance,
            critic: { reviewStandards: value },
          },
        };
      }
      return {
        ...prev,
        promptGuidance: {
          ...prev.promptGuidance,
          fix: { fixGuidance: value },
        },
      };
    });
  }, []);

  const resetGuidanceSection = useCallback((step: GuidanceStep) => {
    setDraft((prev) => ({
      ...prev,
      promptGuidance: {
        ...prev.promptGuidance,
        [step]: structuredClone(DEFAULT_PROMPT_GUIDANCE[step]),
      },
    }));
  }, []);

  const resetAllGuidanceAndTokens = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      promptGuidance: structuredClone(DEFAULT_PROMPT_GUIDANCE),
    }));
  }, []);

  const handleSave = () => {
    onSave({
      ...draft,
      maxTokens: clampMaxTokens(draft.maxTokens),
      promptGuidance: normalizePromptGuidance(draft.promptGuidance),
    });
  };

  const handleClose = () => {
    setDraft(settings);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Configuration</p>
          <h2 id="settings-title" className="text-lg font-semibold tracking-tight">
            Settings
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
        >
          Close
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          className="shrink-0 border-b border-[var(--line)] bg-[var(--bg-elevated)] lg:w-52 lg:border-b-0 lg:border-r"
          aria-label="Settings sections"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
            <li className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => setTab('general')}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  tab === 'general'
                    ? 'bg-[var(--accent)]/10 font-medium text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
                }`}
              >
                API & tokens
              </button>
            </li>
            <li className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => setTab('prompts')}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  tab === 'prompts'
                    ? 'bg-[var(--accent)]/10 font-medium text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
                }`}
              >
                Design prompts
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {tab === 'general' && (
              <div className="mx-auto max-w-2xl space-y-6">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">OpenRouter API key</span>
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={draft.openRouterKey}
                    onChange={(e) => updateDraft({ openRouterKey: e.target.value })}
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
                    . Stored in localStorage only.
                  </span>
                </label>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Max tokens per completion</legend>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Default 8192 — enough for a full interactive HTML page with inline CSS/JS.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MAX_TOKENS_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateDraft({ maxTokens: preset })}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          draft.maxTokens === preset
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-[var(--line)] bg-white hover:bg-[var(--bg)]'
                        }`}
                      >
                        {preset.toLocaleString()}
                        {preset === DEFAULT_SETTINGS.maxTokens ? ' (default)' : ''}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={MIN_MAX_TOKENS}
                      max={MAX_MAX_TOKENS}
                      step={512}
                      value={draft.maxTokens}
                      onChange={(e) =>
                        updateDraft({ maxTokens: clampMaxTokens(Number(e.target.value)) })
                      }
                      className="min-w-0 flex-1 accent-[var(--accent)]"
                    />
                    <input
                      type="number"
                      min={MIN_MAX_TOKENS}
                      max={MAX_MAX_TOKENS}
                      step={512}
                      value={draft.maxTokens}
                      onChange={(e) =>
                        updateDraft({ maxTokens: clampMaxTokens(Number(e.target.value)) })
                      }
                      className="w-24 rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </fieldset>
              </div>
            )}

            {tab === 'prompts' && (
              <div className="mx-auto max-w-3xl space-y-8">
                <p className="text-sm text-[var(--ink-muted)]">
                  Customize how each pipeline step thinks about design. Output formats
                  (JSON schema, HTML rules, critic response shape) are fixed so the pipeline
                  keeps working reliably.
                </p>

                {PROMPT_SECTIONS.map(({ step, title, subtitle }) => {
                  const meta =
                    step === 'planner'
                      ? GUIDANCE_FIELD_META.planner.designGuidance
                      : step === 'generator'
                        ? GUIDANCE_FIELD_META.generator.visualQuality
                        : step === 'critic'
                          ? GUIDANCE_FIELD_META.critic.reviewStandards
                          : GUIDANCE_FIELD_META.fix.fixGuidance;

                  const value =
                    step === 'planner'
                      ? draft.promptGuidance.planner.designGuidance
                      : step === 'generator'
                        ? draft.promptGuidance.generator.visualQuality
                        : step === 'critic'
                          ? draft.promptGuidance.critic.reviewStandards
                          : draft.promptGuidance.fix.fixGuidance;

                  const onChange = (text: string) => updateGuidance(step, text);

                  return (
                    <section
                      key={step}
                      className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{title}</h3>
                          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{subtitle}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resetGuidanceSection(step)}
                          className="shrink-0 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs hover:bg-[var(--bg)]"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        <FixedOutputBadge step={step} />

                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium">{meta.label}</span>
                          <span className="block text-xs text-[var(--ink-muted)]">{meta.hint}</span>
                          <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={meta.placeholder}
                            rows={meta.rows}
                            spellCheck
                            className="mt-1 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                          />
                        </label>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetAllGuidanceAndTokens}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--bg)]"
              >
                Reset prompts & tokens
              </button>
              <span className="text-sm text-[var(--accent)]" aria-live="polite">
                {saved ? 'Saved' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--bg)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Save settings
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
