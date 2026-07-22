import type { DesignSpec } from '../types';
import type { ProviderClient } from '../providers';
import { completeWithRetry } from '../providers';
import { sanitizeHtml, SanitizeError } from './sanitize';
import {
  GENERATOR_SYSTEM,
  FIX_SYSTEM,
  generatorUserPrompt,
  fixUserPrompt,
  editUserPrompt,
} from './prompts';

const MAX_HTML_RETRIES = 2;

async function generateAndSanitize(
  client: ProviderClient,
  system: string,
  userContent: string,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_HTML_RETRIES; attempt++) {
    try {
      const raw = await completeWithRetry(client, system, [
        { role: 'user', content: userContent },
      ]);
      return sanitizeHtml(raw);
    } catch (err) {
      lastError = err;
      // Only retry sanitation failures (model returned prose / fences)
      if (!(err instanceof SanitizeError) || attempt === MAX_HTML_RETRIES) {
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
): Promise<string> {
  return generateAndSanitize(
    client,
    GENERATOR_SYSTEM,
    generatorUserPrompt(JSON.stringify(spec, null, 2)),
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
): Promise<string> {
  return generateAndSanitize(
    client,
    FIX_SYSTEM,
    fixUserPrompt(JSON.stringify(spec, null, 2), html, instructions),
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
): Promise<string> {
  return generateAndSanitize(
    client,
    GENERATOR_SYSTEM,
    editUserPrompt(html, instruction),
  );
}
