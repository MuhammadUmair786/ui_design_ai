import type { AppSettings, SlotId, SlotModels } from '../types';
import { DEFAULT_MODELS } from '../types';

const KEY_STORAGE = 'guide-openrouter-key';
const MODELS_STORAGE = 'guide-slot-models-v2';
/** Legacy key from Design Forge — migrate once if present. */
const LEGACY_KEYS = 'ui-design-ai-api-keys';

const EMPTY_SETTINGS: AppSettings = { openRouterKey: '' };

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        openRouterKey:
          typeof parsed.openRouterKey === 'string' ? parsed.openRouterKey : '',
      };
    }

    // One-time migrate: if user had an openai key stored, treat it as OpenRouter
    // only when it looks like an OpenRouter key (sk-or-...).
    const legacy = localStorage.getItem(LEGACY_KEYS);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, unknown>;
      const candidates = [parsed.openai, parsed.gemini, parsed.claude].filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      const orKey = candidates.find((k) => k.startsWith('sk-or-')) ?? '';
      if (orKey) {
        const settings = { openRouterKey: orKey };
        saveSettings(settings);
        return settings;
      }
    }

    return { ...EMPTY_SETTINGS };
  } catch {
    return { ...EMPTY_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEY_STORAGE, JSON.stringify(settings));
}

export function clearSettings(): void {
  localStorage.removeItem(KEY_STORAGE);
}

export function hasOpenRouterKey(settings: AppSettings): boolean {
  return Boolean(settings.openRouterKey.trim());
}

export function loadSlotModels(): SlotModels {
  try {
    const raw = localStorage.getItem(MODELS_STORAGE);
    if (!raw) return { ...DEFAULT_MODELS };
    const parsed = JSON.parse(raw) as Partial<SlotModels>;
    return {
      a: typeof parsed.a === 'string' && parsed.a ? parsed.a : DEFAULT_MODELS.a,
      b: typeof parsed.b === 'string' && parsed.b ? parsed.b : DEFAULT_MODELS.b,
      c: typeof parsed.c === 'string' && parsed.c ? parsed.c : DEFAULT_MODELS.c,
    };
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
