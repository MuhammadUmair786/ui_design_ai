import type { PromptGuidance } from '../agents/prompts';
import { DEFAULT_MAX_TOKENS, DEFAULT_PROMPT_GUIDANCE } from '../agents/prompts';

export type { PromptGuidance };

/** Parallel design slots — each runs its own pipeline with a chosen OpenRouter model. */
export type SlotId = 'a' | 'b' | 'c';

export const SLOTS: SlotId[] = ['a', 'b', 'c'];

export const SLOT_LABELS: Record<SlotId, string> = {
  a: 'Design 1',
  b: 'Design 2',
  c: 'Design 3',
};

/** Moderate-tier defaults — one flagship model per provider (Gemini, OpenAI, Claude). */
export const DEFAULT_MODELS: Record<SlotId, string> = {
  a: 'google/gemini-3.5-flash',
  b: 'openai/gpt-5.4',
  c: 'anthropic/claude-sonnet-5',
};

export type SlotModels = Record<SlotId, string>;

/** Which design columns to include in the next generate run. */
export type SlotSelection = Record<SlotId, boolean>;

export const ALL_SLOTS_SELECTED: SlotSelection = { a: true, b: true, c: true };

export function slotsFromSelection(selection: SlotSelection): SlotId[] {
  return SLOTS.filter((slot) => selection[slot]);
}

/** BYOK key + pipeline tuning for https://openrouter.ai */
export interface AppSettings {
  openRouterKey: string;
  maxTokens: number;
  promptGuidance: PromptGuidance;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openRouterKey: '',
  maxTokens: DEFAULT_MAX_TOKENS,
  promptGuidance: structuredClone(DEFAULT_PROMPT_GUIDANCE),
};

export interface OpenRouterModel {
  id: string;
  name: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface DesignSection {
  id: string;
  name: string;
  purpose: string;
  keyElements: string[];
}

/** Structured JSON spec produced by the Planner agent (no HTML). */
export interface DesignSpec {
  title: string;
  description: string;
  styleDirection: string;
  colorPalette: ColorPalette;
  layout: string;
  sections: DesignSection[];
  interactions: string[];
  typography: string;
}

export type CriticVerdict =
  | { status: 'approved' }
  | { status: 'needs_fix'; instructions: string };

export type PipelineStage =
  | 'idle'
  | 'planning'
  | 'generating'
  | 'critiquing'
  | 'fixing'
  | 'done'
  | 'error';

export type ProviderErrorCode =
  | 'auth'
  | 'rate_limit'
  | 'network'
  | 'parse'
  | 'unknown';

export interface SlotResult {
  slot: SlotId;
  model: string;
  stage: PipelineStage;
  spec: DesignSpec | null;
  html: string | null;
  error: string | null;
  /** Pipeline step active when the error occurred. */
  failedStage: PipelineStage | null;
  errorCode: ProviderErrorCode | null;
  errorStatus: number | null;
  errorDetail: string | null;
  /** Whether the critic triggered a fix pass. */
  fixed: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
