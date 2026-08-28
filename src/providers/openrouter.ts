import OpenAI from 'openai';
import type { SlotId } from '../types';
import type { ChatMessage } from '../types';
import type { CompleteOptions, ProviderClient } from './types';
import {
  DEFAULT_REASONING,
  ProviderError,
  classifyError,
  extractErrorDetail,
} from './types';

type ContentPart = { type?: string; text?: string };

function extractAssistantText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const p = part as ContentPart;
          // Skip reasoning/thinking parts — only collect visible output text.
          if (p.type === 'reasoning' || p.type === 'thinking') return '';
          if ('text' in p) return String(p.text ?? '');
        }
        return '';
      })
      .join('');
  }
  return '';
}

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export { DEFAULT_MAX_TOKENS } from '../agents/prompts';

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
  maxTokens: number,
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

    async complete(
      system: string,
      messages: ChatMessage[],
      options?: CompleteOptions,
    ): Promise<string> {
      try {
        const reasoning = options?.reasoning ?? DEFAULT_REASONING;
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
          max_tokens: options?.maxTokens ?? maxTokens,
          // OpenRouter extension — cap reasoning so HTML/JSON output is not starved.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...( { reasoning } as any ),
        });

        const choice = response.choices[0];
        const text = extractAssistantText(choice?.message?.content);
        if (!text.trim()) {
          throw new ProviderError(
            `${modelId} returned an empty response.`,
            undefined,
            'parse',
          );
        }
        // Let the HTML sanitizer decide if a length-truncated response is usable.
        return text;
      } catch (err) {
        const detail = extractErrorDetail(err);

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
              detail,
            );
          }
          if (status === 429) {
            throw new ProviderError(
              'OpenRouter rate limit (429). Requests are queued — if this persists, wait a minute and retry.',
              429,
              'rate_limit',
              detail,
            );
          }
          if (status === 401 || status === 403) {
            throw new ProviderError(
              'Invalid OpenRouter API key.',
              status,
              'auth',
              detail,
            );
          }
          if (status >= 400) {
            throw new ProviderError(
              `OpenRouter request failed (${status}).`,
              status,
              'unknown',
              detail,
            );
          }
        }
        throw classifyError(err);
      }
    },
  };
}
