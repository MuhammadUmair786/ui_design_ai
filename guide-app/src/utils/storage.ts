import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_PROMPT_GUIDANCE,
  clampMaxTokens,
  normalizePromptGuidance,
  type PromptGuidance,
} from '../agents/prompts';
import type { AppSettings, SlotId, SlotModels } from '../types';
import { DEFAULT_MODELS, DEFAULT_SETTINGS } from '../types';

const KEY_STORAGE = 'guide-openrouter-key';
const SETTINGS_STORAGE = 'guide-settings-v3';
const LEGACY_SETTINGS_V2 = 'guide-settings-v2';
const MODELS_STORAGE = 'guide-slot-models-v3';
const LEGACY_MODELS_STORAGE = 'guide-slot-models-v2';
/** Legacy key from Design Forge — migrate once if present. */
const LEGACY_KEYS = 'ui-design-ai-api-keys';

/** Prior cheap defaults — upgrade to moderate defaults if still unchanged. */
const LEGACY_CHEAP_DEFAULTS: Record<SlotId, readonly string[]> = {
  a: ['google/gemini-2.5-flash-lite'],
  b: ['openai/gpt-4o-mini'],
  c: ['deepseek/deepseek-chat-v3.1', 'anthropic/claude-haiku-4.5'],
};

function resolveSlotModel(
  slot: SlotId,
  value: unknown,
  treatLegacyAsDefault: boolean,
): string {
  if (typeof value !== 'string' || !value) return DEFAULT_MODELS[slot];
  if (
    treatLegacyAsDefault &&
    LEGACY_CHEAP_DEFAULTS[slot].includes(value)
  ) {
    return DEFAULT_MODELS[slot];
  }
  return value;
}

function parsePromptGuidance(raw: unknown): PromptGuidance {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_PROMPT_GUIDANCE);
  }
  return normalizePromptGuidance(raw as Partial<PromptGuidance>);
}

function normalizeSettings(parsed: Partial<AppSettings> & { prompts?: unknown }): AppSettings {
  const guidance =
    parsed.promptGuidance !== undefined
      ? parsePromptGuidance(parsed.promptGuidance)
      : parsed.prompts !== undefined
        ? structuredClone(DEFAULT_PROMPT_GUIDANCE)
        : structuredClone(DEFAULT_PROMPT_GUIDANCE);

  return {
    openRouterKey:
      typeof parsed.openRouterKey === 'string' ? parsed.openRouterKey : '',
    maxTokens:
      typeof parsed.maxTokens === 'number'
        ? clampMaxTokens(parsed.maxTokens)
        : DEFAULT_MAX_TOKENS,
    promptGuidance: guidance,
  };
}

export function loadSettings(): AppSettings {
  try {
    const v3 = localStorage.getItem(SETTINGS_STORAGE);
    if (v3) {
      return normalizeSettings(JSON.parse(v3) as Partial<AppSettings>);
    }

    const v2 = localStorage.getItem(LEGACY_SETTINGS_V2);
    if (v2) {
      const settings = normalizeSettings(JSON.parse(v2) as Partial<AppSettings>);
      saveSettings(settings);
      return settings;
    }

    const raw = localStorage.getItem(KEY_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      const settings = normalizeSettings(parsed);
      saveSettings(settings);
      return settings;
    }

    const legacy = localStorage.getItem(LEGACY_KEYS);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, unknown>;
      const candidates = [parsed.openai, parsed.gemini, parsed.claude].filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      const orKey = candidates.find((k) => k.startsWith('sk-or-')) ?? '';
      if (orKey) {
        const settings = normalizeSettings({ openRouterKey: orKey });
        saveSettings(settings);
        return settings;
      }
    }

    return structuredClone(DEFAULT_SETTINGS);
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: AppSettings): void {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(normalized));
  localStorage.setItem(KEY_STORAGE, JSON.stringify(normalized));
}

export function clearSettings(): void {
  localStorage.removeItem(SETTINGS_STORAGE);
  localStorage.removeItem(LEGACY_SETTINGS_V2);
  localStorage.removeItem(KEY_STORAGE);
}

export function hasOpenRouterKey(settings: AppSettings): boolean {
  return Boolean(settings.openRouterKey.trim());
}

export function loadSlotModels(): SlotModels {
  try {
    const raw = localStorage.getItem(MODELS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SlotModels>;
      return {
        a: resolveSlotModel('a', parsed.a, false),
        b: resolveSlotModel('b', parsed.b, false),
        c: resolveSlotModel('c', parsed.c, false),
      };
    }

    const legacyRaw = localStorage.getItem(LEGACY_MODELS_STORAGE);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Partial<SlotModels>;
      const migrated: SlotModels = {
        a: resolveSlotModel('a', parsed.a, true),
        b: resolveSlotModel('b', parsed.b, true),
        c: resolveSlotModel('c', parsed.c, true),
      };
      saveSlotModels(migrated);
      localStorage.removeItem(LEGACY_MODELS_STORAGE);
      return migrated;
    }

    return { ...DEFAULT_MODELS };
  } catch {
    return { ...DEFAULT_MODELS };
  }
}

export function saveSlotModels(models: SlotModels): void {
  localStorage.setItem(MODELS_STORAGE, JSON.stringify(models));
}

export function updateSlotModel(
  models: SlotModels,
  slot: SlotId,
  model: string,
): SlotModels {
  return { ...models, [slot]: model };
}
