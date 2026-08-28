import type { ChatMessage, SlotId } from '../types';

/** OpenRouter reasoning controls — caps thinking tokens so output is not starved. */
export interface ReasoningOptions {
  effort?: 'max' | 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  max_tokens?: number;
  exclude?: boolean;
  enabled?: boolean;
}

export interface CompleteOptions {
  reasoning?: ReasoningOptions;
  /** Override the client default max output tokens for this call. */
  maxTokens?: number;
}

/** Default cap for JSON agents (planner / critic). */
export const DEFAULT_REASONING: ReasoningOptions = {
  effort: 'minimal',
  exclude: true,
};

/**
 * Reasoning config for HTML generation attempts.
 * OpenRouter rejects requests that set BOTH effort and max_tokens — use one or the other.
 * Never use effort:'none' on mandatory-reasoning models (e.g. google/gemini-2.5-pro).
 */
export function htmlReasoningForAttempt(attempt: number): ReasoningOptions {
  if (attempt <= 1) {
    return { effort: 'minimal', exclude: true };
  }
  // Retry with token-budget style (Gemini / Anthropic); do not combine with effort.
  return { max_tokens: 512, exclude: true };
}

export function isReasoningRequestError(err: unknown): boolean {
  if (!(err instanceof ProviderError) || err.status !== 400) return false;
  const text = `${err.detail ?? ''} ${err.message}`.toLowerCase();
  return (
    (text.includes('reasoning') && text.includes('mandatory')) ||
    text.includes('max_tokens') ||
    text.includes('effort')
  );
}

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
  complete(
    system: string,
    messages: ChatMessage[],
    options?: CompleteOptions,
  ): Promise<string>;
}

export type ProviderErrorCode =
  | 'auth'
  | 'rate_limit'
  | 'network'
  | 'parse'
  | 'unknown';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: ProviderErrorCode,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Pull a human-readable detail string from OpenAI SDK / fetch errors. */
export function extractErrorDetail(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;

  const obj = err as Record<string, unknown>;

  if (typeof obj.error === 'object' && obj.error !== null) {
    const inner = obj.error as Record<string, unknown>;
    if (typeof inner.message === 'string' && inner.message.trim()) {
      return inner.message.trim();
    }
  }

  if (typeof obj.message === 'string' && obj.message.trim()) {
    return obj.message.trim();
  }

  return undefined;
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
      'OpenRouter rate limit (429). Requests are queued — if this persists, wait a minute and retry.',
      429,
      'rate_limit',
      message,
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

  return new ProviderError(
    message || 'Unknown provider error.',
    undefined,
    'unknown',
    message || undefined,
  );
}
