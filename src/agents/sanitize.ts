/**
 * Strip markdown fences and validate that model output is usable HTML.
 * Rejects explanation-only responses so the pipeline can retry.
 */

const FENCE_RE = /^```(?:html|HTML|css|xml)?\s*\n?([\s\S]*?)\n?```\s*$/;
const FENCE_ANYWHERE_RE = /```(?:html|HTML)?\s*\n?([\s\S]*?)```/;

export class SanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SanitizeError';
  }
}

/** Remove surrounding markdown code fences if the model wrapped the HTML. */
export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const full = trimmed.match(FENCE_RE);
  if (full?.[1]) return full[1].trim();

  // Sometimes models add a short preamble then a fenced block
  const partial = trimmed.match(FENCE_ANYWHERE_RE);
  if (partial?.[1] && partial[1].includes('<')) {
    return partial[1].trim();
  }

  return trimmed;
}

/**
 * Heuristic: does this look like HTML rather than an essay about HTML?
 */
export function looksLikeHtml(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;

  const hasDoctype = t.startsWith('<!doctype') || t.startsWith('<html');
  const hasTags =
    /<(html|head|body|div|section|main|header|nav|style|button|form)\b/i.test(text);
  // Explanation prose often starts with "Sure," / "Here" / "I've"
  const proseLead =
    /^(sure[,!.]|here(?:'s| is)|i('ve| have)|certainly|of course|below is|the following)/i.test(
      t,
    );

  if (proseLead && !hasDoctype && !t.includes('<!doctype') && !t.startsWith('<')) {
    return false;
  }

  return hasDoctype || hasTags;
}

/**
 * Parse with DOMParser to ensure the document is structurally readable.
 * Does not execute scripts — parsing only.
 */
export function isParseableHtml(html: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return false;
    // Must have some real element content
    const body = doc.body;
    return !!(body && body.children.length > 0);
  } catch {
    return false;
  }
}

/**
 * Full sanitize pipeline for generated HTML before store/render.
 * Throws SanitizeError if the output is not valid HTML.
 */
export function sanitizeHtml(raw: string): string {
  const stripped = stripMarkdownFences(raw);

  if (!looksLikeHtml(stripped)) {
    throw new SanitizeError(
      'Model returned explanation text instead of HTML. Retrying…',
    );
  }

  if (!isParseableHtml(stripped)) {
    throw new SanitizeError('Generated HTML failed to parse.');
  }

  return stripped;
}

/**
 * Extract and parse JSON from a model response (planner / critic).
 * Handles optional markdown fences and leading/trailing prose.
 */
export function extractJson<T>(raw: string): T {
  const stripped = stripMarkdownFences(raw);
  // Try direct parse first
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Fall back: find first { ... } or [ ... ] block
    const start = stripped.search(/[{[]/);
    const endObj = stripped.lastIndexOf('}');
    const endArr = stripped.lastIndexOf(']');
    const end = Math.max(endObj, endArr);
    if (start === -1 || end <= start) {
      throw new SanitizeError('Could not find JSON in model response.');
    }
    const slice = stripped.slice(start, end + 1);
    return JSON.parse(slice) as T;
  }
}
