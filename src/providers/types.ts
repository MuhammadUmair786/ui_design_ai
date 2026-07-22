import type { ChatMessage, SlotId } from '../types';

/**
 * Shared LLM client interface — agents stay model-agnostic.
 * All completions go through OpenRouter with a per-slot model id.
 */
export interface ProviderClient {
  readonly id: SlotId;
  readonly model: string;
  /**
   * Send a chat-style completion. `system` is separated because providers handle it differently;
   * OpenRouter accepts a system role message.
   */
  complete(system: string, messages: ChatMessage[]): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: 'auth' | 'rate_limit' | 'network' | 'parse' | 'unknown',
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function classifyError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('api key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('authentication') ||
    lower.includes('unauthorized') ||
    lower.includes('user not found')
  ) {
    return new ProviderError(
      'Invalid OpenRouter API key. Check Settings and try again.',
      401,
      'auth',
    );
  }

  if (
    lower.includes('402') ||
    lower.includes('more credits') ||
    lower.includes('can only afford') ||
    lower.includes('insufficient credits')
  ) {
    return new ProviderError(
      'OpenRouter credits too low for this request. Add credits at openrouter.ai/settings/credits, or try a cheaper model.',
      402,
      'unknown',
    );
  }

  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('quota')
  ) {
    return new ProviderError(
      'Rate limited. Waiting and retrying…',
      429,
      'rate_limit',
    );
  }

  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('cors')
  ) {
    return new ProviderError(
      'Network error reaching OpenRouter.',
      undefined,
      'network',
    );
  }

  return new ProviderError(message || 'Unknown provider error.', undefined, 'unknown');
}
