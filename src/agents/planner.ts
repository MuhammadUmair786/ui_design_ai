import type { DesignSpec } from '../types';
import type { ProviderClient } from '../providers';
import { completeWithRetry } from '../providers';
import { extractJson } from './sanitize';
import { PLANNER_SYSTEM, plannerUserPrompt } from './prompts';

function assertDesignSpec(data: unknown): DesignSpec {
  if (!data || typeof data !== 'object') {
    throw new Error('Planner did not return a JSON object.');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.title !== 'string' || typeof d.styleDirection !== 'string') {
    throw new Error('Planner JSON missing required fields (title, styleDirection).');
  }
  if (!d.colorPalette || typeof d.colorPalette !== 'object') {
    throw new Error('Planner JSON missing colorPalette.');
  }
  if (!Array.isArray(d.sections)) {
    throw new Error('Planner JSON missing sections array.');
  }
  return data as DesignSpec;
}

/**
 * Planner agent: raw user prompt → structured DesignSpec JSON (no HTML).
 */
export async function runPlanner(
  client: ProviderClient,
  userPrompt: string,
): Promise<DesignSpec> {
  const raw = await completeWithRetry(client, PLANNER_SYSTEM, [
    { role: 'user', content: plannerUserPrompt(userPrompt) },
  ]);

  const parsed = extractJson<unknown>(raw);
  return assertDesignSpec(parsed);
}
