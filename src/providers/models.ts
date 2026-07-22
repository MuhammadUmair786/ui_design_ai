import type { OpenRouterModel } from '../types';
import { OPENROUTER_BASE_URL } from './openrouter';
import fallbackModels from './openrouter-models.fallback.json';

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
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (mapped.length === 0) {
      return fallbackModels as OpenRouterModel[];
    }
    return mapped;
  } catch {
    return fallbackModels as OpenRouterModel[];
  }
}

export function getFallbackModels(): OpenRouterModel[] {
  return fallbackModels as OpenRouterModel[];
}
