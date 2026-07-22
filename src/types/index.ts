/** Parallel design slots — each runs its own pipeline with a chosen OpenRouter model. */
export type SlotId = 'a' | 'b' | 'c';

export const SLOTS: SlotId[] = ['a', 'b', 'c'];

export const SLOT_LABELS: Record<SlotId, string> = {
  a: 'Design 1',
  b: 'Design 2',
  c: 'Design 3',
};

/** Cheap defaults so free/low OpenRouter balances can run all 3 slots. */
export const DEFAULT_MODELS: Record<SlotId, string> = {
  a: 'google/gemini-2.5-flash-lite',
  b: 'openai/gpt-4o-mini',
  c: 'deepseek/deepseek-chat-v3.1',
};

export type SlotModels = Record<SlotId, string>;

/** Single BYOK key for https://openrouter.ai */
export interface AppSettings {
  openRouterKey: string;
}

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

export interface SlotResult {
  slot: SlotId;
  model: string;
  stage: PipelineStage;
  spec: DesignSpec | null;
  html: string | null;
  error: string | null;
  /** Whether the critic triggered a fix pass. */
  fixed: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
