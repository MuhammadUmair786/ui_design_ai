/** User-editable creative guidance — structural/output rules stay fixed in code. */

export interface PlannerGuidance {
  /** Design direction injected after the fixed JSON schema block. */
  designGuidance: string;
}

export interface GeneratorGuidance {
  /** Visual polish requirements injected after fixed HTML output rules. */
  visualQuality: string;
}

export interface CriticGuidance {
  /** Review criteria injected before the fixed JSON response format. */
  reviewStandards: string;
}

export interface FixGuidance {
  /** How to apply fixes, injected before fixed HTML output rules. */
  fixGuidance: string;
}

export interface PromptGuidance {
  planner: PlannerGuidance;
  generator: GeneratorGuidance;
  critic: CriticGuidance;
  fix: FixGuidance;
}

export interface PipelinePrompts {
  planner: string;
  generator: string;
  critic: string;
  fix: string;
}

/** Recommended default for full-page HTML with inline CSS/JS. */
export const DEFAULT_MAX_TOKENS = 16384;

export const MIN_MAX_TOKENS = 1024;
export const MAX_MAX_TOKENS = 16384;

export const MAX_TOKENS_PRESETS = [4096, 8192, 16384] as const;

// ── Fixed scaffold (never user-editable) ────────────────────────────────────

const PLANNER_INTRO = `You are a senior UI/UX design planner. Given a user's description of a screen or page, produce a structured design specification as JSON only — no markdown fences, no commentary.

The JSON must match this shape exactly:
{
  "title": string,
  "description": string,
  "styleDirection": string,
  "colorPalette": {
    "primary": string (hex),
    "secondary": string (hex),
    "accent": string (hex),
    "background": string (hex),
    "text": string (hex)
  },
  "layout": string,
  "sections": [
    {
      "id": string,
      "name": string,
      "purpose": string,
      "keyElements": string[]
    }
  ],
  "interactions": string[],
  "typography": string
}`;

const PLANNER_OUTRO = 'Return ONLY valid JSON.';

const GENERATOR_INTRO = `You are an expert front-end designer-engineer. Given a structured design specification (JSON), output a single self-contained HTML document that implements it with production-grade polish.

Hard rules:
- Return ONLY raw HTML. No markdown fences. No explanation before or after.
- Inline all CSS in a <style> tag. Do not use external stylesheets or CSS framework CDNs.
- Inline JS in a <script> tag only when needed for interactivity. All interactive controls must work when clicked.
- Use semantic HTML and accessibility basics: button types, form labels, aria where needed, visible :focus styles, sufficient color contrast.
- Start with <!DOCTYPE html>.
- Do not use iframe, eval, or external script sources.
- Keep output compact: concise CSS (no comments), minimal JS, aim for under 450 lines total so the full document fits in one response.`;

const CRITIC_INTRO = `You are a strict UI design critic and front-end QA reviewer. You receive:
1) The original design specification (JSON)
2) Generated HTML for that spec`;

const CRITIC_RESPONSE_FORMAT = `Respond with ONLY valid JSON (no markdown fences):
{ "status": "approved" }
OR
{ "status": "needs_fix", "instructions": "specific, actionable fix list" }`;

const FIX_INTRO = `You are an expert front-end designer-engineer fixing an existing HTML design.

You will receive the original design spec, the current HTML, and critic feedback.
Return a corrected single self-contained HTML document that addresses every critic point while preserving what already works well.`;

const FIX_RULES = `Hard rules:
- Return ONLY raw HTML. No markdown fences. No explanation.
- Inline CSS/JS as before. All interactive controls must work.
- Apply the spec's visual direction — improve polish, spacing, and hierarchy where the critic flagged gaps.
- Start with <!DOCTYPE html>.`;

// ── Default user-editable guidance ──────────────────────────────────────────

export const DEFAULT_PROMPT_GUIDANCE: PromptGuidance = {
  planner: {
    designGuidance: `Design quality requirements:
- Pick a distinctive, cohesive visual direction — name a real aesthetic reference (e.g. "Stripe marketing", "Linear app", "Apple product page") and commit to it.
- Avoid generic AI clichés: purple gradients on white, Inter-only stacks with no hierarchy, identical card grids, lorem ipsum feel.
- Define a clear typographic scale in typography (e.g. display 48px/700, h2 28px/600, body 16px/400, caption 13px/500).
- colorPalette must have intentional contrast — background vs text WCAG AA minimum; accent used sparingly for CTAs.
- layout must describe grid structure, max-width, spacing rhythm (prefer 4px/8px base), and mobile vs desktop behavior.
- sections must be ordered top-to-bottom; each keyElements list concrete UI pieces (not vague labels).
- interactions must list every interactive control with expected behavior (tabs switch panels, modal opens/closes, accordion expands, form validates, etc.).`,
  },
  generator: {
    visualQuality: `Visual quality bar:
- Implement the spec's styleDirection and colorPalette faithfully — not a generic template.
- Use the typography scale from the spec: clear hierarchy, comfortable line-height (1.4–1.6 body), letter-spacing on headings where appropriate.
- Apply consistent spacing (padding/margin/gap) using the rhythm described in layout — avoid cramped or randomly spaced blocks.
- Cards, nav, hero, and CTAs should feel intentional: subtle borders or shadows, hover/focus states, rounded corners aligned to the aesthetic.
- Responsive: stack gracefully on narrow viewports; nav and grids must not overflow or break.
- Include realistic placeholder content (headlines, labels, short copy) — never empty sections or "Lorem ipsum" unless the spec asks for it.
- Micro-interactions: transitions on hover/focus (150–250ms) where they improve feel.`,
  },
  critic: {
    reviewStandards: `Evaluate holistically:
- Spec fidelity: every section present, layout matches description, palette and typography direction followed.
- Visual polish: spacing rhythm, hierarchy, alignment, hover/focus states — not just "does it render".
- Interactivity: every behavior listed in spec.interactions must work (tabs, toggles, modals, accordions, etc.).
- Accessibility: labels, contrast, keyboard-focus visibility, semantic structure.
- Responsive behavior: reasonable layout on mobile-width viewports.

Approve only when the design would pass a design review — not merely "good enough". Request fixes for: missing/wrong sections, broken layout, non-working interactions, weak visual hierarchy, generic/template look, poor spacing, contrast failures, or missing responsive rules.`,
  },
  fix: {
    fixGuidance: `When fixing:
- Address every critic point explicitly; do not ignore partial feedback.
- Preserve sections and interactions that already work.
- Improve visual polish, spacing, and hierarchy where the critic flagged gaps.`,
  },
};

/** UI metadata for each editable guidance field. */
export const GUIDANCE_FIELD_META = {
  planner: {
    designGuidance: {
      label: 'Design direction',
      hint: 'How the planner should think about style, layout, sections, and interactions.',
      placeholder:
        'e.g. Prefer bold editorial layouts, dark themes, generous whitespace, and name a reference brand…',
      rows: 9,
    },
  },
  generator: {
    visualQuality: {
      label: 'Visual quality bar',
      hint: 'Extra polish requirements for the HTML output.',
      placeholder:
        'e.g. Premium fintech feel, subtle shadows, strong CTA contrast, smooth hover states…',
      rows: 8,
    },
  },
  critic: {
    reviewStandards: {
      label: 'Review standards',
      hint: 'How strictly to judge designs before approving or requesting fixes.',
      placeholder:
        'e.g. Reject generic templates, require working tabs/modals, enforce mobile layout…',
      rows: 8,
    },
  },
  fix: {
    fixGuidance: {
      label: 'Fix approach',
      hint: 'How the fix pass should apply critic feedback.',
      placeholder:
        'e.g. Keep existing structure, focus on spacing and interactivity fixes…',
      rows: 5,
    },
  },
} as const;

export const FIXED_OUTPUT_INFO = {
  planner:
    'Output is always structured JSON (title, colorPalette, sections, interactions, typography). You cannot change the schema.',
  generator:
    'Output is always a single self-contained HTML file with inline CSS/JS. External CDNs and markdown are blocked.',
  critic:
    'Output is always JSON: { "status": "approved" } or { "status": "needs_fix", "instructions": "…" }.',
  fix: 'Output is always corrected raw HTML with inline CSS/JS.',
} as const;

function trimBlock(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

/** Assemble full system prompts from user guidance + fixed scaffold. */
export function buildSystemPrompts(guidance: PromptGuidance): PipelinePrompts {
  const g = normalizePromptGuidance(guidance);

  return {
    planner: [PLANNER_INTRO, g.planner.designGuidance, PLANNER_OUTRO].join('\n\n'),
    generator: [GENERATOR_INTRO, g.generator.visualQuality].join('\n\n'),
    critic: [CRITIC_INTRO, g.critic.reviewStandards, CRITIC_RESPONSE_FORMAT].join('\n\n'),
    fix: [FIX_INTRO, g.fix.fixGuidance, FIX_RULES].join('\n\n'),
  };
}

export function normalizePromptGuidance(raw: Partial<PromptGuidance> | undefined): PromptGuidance {
  const d = DEFAULT_PROMPT_GUIDANCE;
  return {
    planner: {
      designGuidance: trimBlock(
        raw?.planner?.designGuidance ?? '',
        d.planner.designGuidance,
      ),
    },
    generator: {
      visualQuality: trimBlock(
        raw?.generator?.visualQuality ?? '',
        d.generator.visualQuality,
      ),
    },
    critic: {
      reviewStandards: trimBlock(
        raw?.critic?.reviewStandards ?? '',
        d.critic.reviewStandards,
      ),
    },
    fix: {
      fixGuidance: trimBlock(raw?.fix?.fixGuidance ?? '', d.fix.fixGuidance),
    },
  };
}

export function plannerUserPrompt(userPrompt: string): string {
  return `Design a screen/page for this brief:\n\n${userPrompt}`;
}

export function generatorUserPrompt(specJson: string): string {
  return `Implement this design specification as a complete HTML page:\n\n${specJson}`;
}

export function criticUserPrompt(specJson: string, html: string): string {
  return `SPEC:\n${specJson}\n\nHTML:\n${html}`;
}

export function fixUserPrompt(
  specJson: string,
  html: string,
  instructions: string,
): string {
  return `SPEC:\n${specJson}\n\nCURRENT HTML:\n${html}\n\nCRITIC FEEDBACK:\n${instructions}\n\nReturn the fixed HTML only.`;
}

export function editUserPrompt(html: string, instruction: string): string {
  return `Here is the current HTML page:\n\n${html}\n\nApply this edit instruction and return the full updated HTML document only (no markdown, no explanation):\n\n${instruction}`;
}

export function clampMaxTokens(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(value)));
}

/** @deprecated Use DEFAULT_PROMPT_GUIDANCE — kept for migration detection. */
export const DEFAULT_PROMPTS = buildSystemPrompts(DEFAULT_PROMPT_GUIDANCE);
