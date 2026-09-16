import type { OpenRouterModel } from '../types';
import { CURATED_MODEL_IDS } from './curated-models';
import { OPENROUTER_BASE_URL } from './openrouter';
import fallbackModels from './openrouter-models.fallback.json';

function applyCuratedFilter(models: OpenRouterModel[]): OpenRouterModel[] {
  const byId = new Map(models.map((m) => [m.id, m]));
  return CURATED_MODEL_IDS.map((id) => {
    const found = byId.get(id);
    return found ?? { id, name: id };
  });
}

interface OpenRouterModelsResponse {
  data?: Array<{
    id?: string;
    name?: string;
    architecture?: {
      output_modalities?: string[];
    };
  }>;
}

/** Prefer live catalog from OpenRouter; fall back to bundled list if offline. */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/models`);
    if (!res.ok) {
      throw new Error(`Models request failed (${res.status})`);
    }
    const json = (await res.json()) as OpenRouterModelsResponse;
    const mapped = (json.data ?? [])
      .filter((m) => typeof m.id === 'string' && m.id.length > 0)
      .filter((m) => {
        const outs = m.architecture?.output_modalities;
        // Keep text-capable models (default OpenRouter list is mostly text).
        if (!outs || outs.length === 0) return true;
        return outs.includes('text');
      })
      .map((m) => ({
        id: m.id as string,
        name: (m.name && m.name.trim()) || (m.id as string),
      }));

    if (mapped.length === 0) {
      return applyCuratedFilter(fallbackModels as OpenRouterModel[]);
    }
    return applyCuratedFilter(mapped);
  } catch {
    return applyCuratedFilter(fallbackModels as OpenRouterModel[]);
  }
}

export function getFallbackModels(): OpenRouterModel[] {
  return applyCuratedFilter(fallbackModels as OpenRouterModel[]);
}
