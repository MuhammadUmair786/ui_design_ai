import type { ProviderClient } from './types';
import { ProviderError } from './types';
import type { ChatMessage } from '../types';

/**
 * Sleep helper used by retry-with-backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a provider call on 429 with exponential backoff.
 * Non-rate-limit errors are thrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status =
        err instanceof ProviderError
          ? err.status
          : typeof err === 'object' &&
              err !== null &&
              'status' in err &&
              typeof (err as { status: unknown }).status === 'number'
            ? (err as { status: number }).status
            : undefined;

      const isRateLimit =
        status === 429 ||
        (err instanceof Error && /429|rate.?limit/i.test(err.message));

      if (!isRateLimit || attempt === maxAttempts) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Convenience wrapper: retry + complete on a ProviderClient.
 */
export async function completeWithRetry(
  client: ProviderClient,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  return withRetry(() => client.complete(system, messages));
}
