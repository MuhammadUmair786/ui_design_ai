import type { SlotId } from '../types';
import type { ProviderClient } from './types';
import { createOpenRouterClient } from './openrouter';

/** Factory — every slot talks to OpenRouter with its selected model. */
export function createProviderClient(
  slot: SlotId,
  apiKey: string,
  model: string,
): ProviderClient {
  return createOpenRouterClient(apiKey, model, slot);
}

export type { ProviderClient } from './types';
export { ProviderError, classifyError } from './types';
export { completeWithRetry, withRetry } from './retry';
export { fetchOpenRouterModels, getFallbackModels } from './models';
export { OPENROUTER_BASE_URL } from './openrouter';
