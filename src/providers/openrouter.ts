import OpenAI from 'openai';
import type { SlotId } from '../types';
import type { ChatMessage } from '../types';
import type { ProviderClient } from './types';
import { ProviderError, classifyError } from './types';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Cap completion size so OpenRouter credit checks pass on free/low balances.
 * Without this, some models default to ~16k max_tokens and fail with 402.
 */
export const DEFAULT_MAX_TOKENS = 3500;

/**
 * OpenRouter client (OpenAI-compatible).
 *
 * One API key unlocks hundreds of models; each design slot picks its own model id.
 * Browser BYOK requires `dangerouslyAllowBrowser: true`.
 */
export function createOpenRouterClient(
  apiKey: string,
  model: string,
  slot: SlotId,
): ProviderClient {
  if (!apiKey.trim()) {
    throw new ProviderError('OpenRouter API key is missing.', 401, 'auth');
  }
  if (!model.trim()) {
    throw new ProviderError('No model selected for this design slot.', undefined, 'unknown');
  }

  const client = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: OPENROUTER_BASE_URL,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://guide.app',
      'X-OpenRouter-Title': 'GUIDE',
    },
  });

  const modelId = model.trim();

  return {
    id: slot,
    model: modelId,

    async complete(system: string, messages: ChatMessage[]): Promise<string> {
      try {
        const response = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: system },
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
          ],
          temperature: 0.7,
          max_tokens: DEFAULT_MAX_TOKENS,
        });

        const text = response.choices[0]?.message?.content;
        if (!text?.trim()) {
          throw new ProviderError(
            `${modelId} returned an empty response.`,
            undefined,
            'parse',
          );
        }
        return text;
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status: unknown }).status === 'number'
        ) {
          const status = (err as { status: number }).status;
          if (status === 402) {
            throw new ProviderError(
              'OpenRouter credits too low for this request. Add credits at openrouter.ai/settings/credits, or try a cheaper model.',
              402,
              'unknown',
            );
          }
          if (status === 429) {
            throw new ProviderError('OpenRouter rate limit (429).', 429, 'rate_limit');
          }
          if (status === 401 || status === 403) {
            throw new ProviderError('Invalid OpenRouter API key.', status, 'auth');
          }
        }
        throw classifyError(err);
      }
    },
  };
}
