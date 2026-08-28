import type { DesignSpec } from '../types';
import type { ProviderClient } from '../providers';
import { completeWithRetry } from '../providers';
import { ProviderError, htmlReasoningForAttempt, isReasoningRequestError } from '../providers/types';
import { sanitizeHtml, SanitizeError } from './sanitize';
import {
  generatorUserPrompt,
  fixUserPrompt,
  editUserPrompt,
  MAX_MAX_TOKENS,
} from './prompts';

const MAX_HTML_RETRIES = 3;

const COMPACT_HTML_SUFFIX = `\n\nIMPORTANT: Return a complete but compact HTML page — concise CSS (no comments), minimal JS, under 400 lines total. Must include <!DOCTYPE html> through </html>.`;

const ULTRA_COMPACT_SUFFIX = `\n\nCRITICAL: Prior attempts exceeded the token limit. Simplify the design — combine sections if needed, utility CSS, no animations, short copy — but return a complete <!DOCTYPE html>…</html> document.`;

function isRetryableHtmlError(err: unknown): boolean {
  if (err instanceof SanitizeError) return true;
  if (isReasoningRequestError(err)) return true;
  if (err instanceof ProviderError && err.code === 'parse') {
    return err.message.toLowerCase().includes('empty response');
  }
  return false;
}

function htmlPromptForAttempt(userContent: string, attempt: number): string {
  if (attempt <= 1) return userContent;
  if (attempt === 2) return `${userContent}${COMPACT_HTML_SUFFIX}`;
  return `${userContent}${COMPACT_HTML_SUFFIX}${ULTRA_COMPACT_SUFFIX}`;
}

async function generateAndSanitize(
  client: ProviderClient,
  system: string,
  userContent: string,
  _maxTokens: number,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_HTML_RETRIES; attempt++) {
    const prompt = htmlPromptForAttempt(userContent, attempt);
    const tokenBudget = MAX_MAX_TOKENS;
    const reasoning = htmlReasoningForAttempt(attempt);

    try {
      const raw = await completeWithRetry(
        client,
        system,
        [{ role: 'user', content: prompt }],
        { reasoning, maxTokens: tokenBudget },
      );
      const sanitized = sanitizeHtml(raw);
      return sanitized;
    } catch (err) {
      lastError = err;
      if (!isRetryableHtmlError(err) || attempt === MAX_HTML_RETRIES) {
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * Generator agent: DesignSpec → self-contained HTML.
 */
export async function runGenerator(
  client: ProviderClient,
  spec: DesignSpec,
  systemPrompt: string,
  maxTokens: number,
): Promise<string> {
  return generateAndSanitize(
    client,
    systemPrompt,
    generatorUserPrompt(JSON.stringify(spec, null, 2)),
    maxTokens,
  );
}

/**
 * Fix pass: re-run generator-style call with critic feedback.
 */
export async function runFixPass(
  client: ProviderClient,
  spec: DesignSpec,
  html: string,
  instructions: string,
  systemPrompt: string,
  maxTokens: number,
): Promise<string> {
  return generateAndSanitize(
    client,
    systemPrompt,
    fixUserPrompt(JSON.stringify(spec, null, 2), html, instructions),
    maxTokens,
  );
}

/**
 * Optional editor helper: apply a natural-language edit to existing HTML
 * using the same provider's generator agent.
 */
export async function runHtmlEdit(
  client: ProviderClient,
  html: string,
  instruction: string,
  systemPrompt: string,
  maxTokens: number,
): Promise<string> {
  return generateAndSanitize(
    client,
    systemPrompt,
    editUserPrompt(html, instruction),
    maxTokens,
  );
}
