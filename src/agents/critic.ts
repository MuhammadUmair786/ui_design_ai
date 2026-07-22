import type { CriticVerdict, DesignSpec } from '../types';
import type { ProviderClient } from '../providers';
import { completeWithRetry } from '../providers';
import { extractJson } from './sanitize';
import { CRITIC_SYSTEM, criticUserPrompt } from './prompts';

/**
 * Critic agent: reviews HTML against the planner spec.
 * Returns "approved" or concrete fix instructions.
 */
export async function runCritic(
  client: ProviderClient,
  spec: DesignSpec,
  html: string,
): Promise<CriticVerdict> {
  const raw = await completeWithRetry(client, CRITIC_SYSTEM, [
    {
      role: 'user',
      content: criticUserPrompt(JSON.stringify(spec, null, 2), html),
    },
  ]);

  const parsed = extractJson<{ status?: string; instructions?: string }>(raw);

  if (parsed.status === 'approved') {
    return { status: 'approved' };
  }

  if (parsed.status === 'needs_fix' && typeof parsed.instructions === 'string') {
    return { status: 'needs_fix', instructions: parsed.instructions };
  }

  // Ambiguous response — treat as approved to avoid endless fix loops
  if (
    typeof parsed.status === 'string' &&
    /approv/i.test(parsed.status)
  ) {
    return { status: 'approved' };
  }

  return {
    status: 'needs_fix',
    instructions:
      typeof parsed.instructions === 'string'
        ? parsed.instructions
        : 'Improve layout fidelity to the spec and ensure interactive elements work.',
  };
}
