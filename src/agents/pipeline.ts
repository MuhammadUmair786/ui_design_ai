import type {
  AppSettings,
  DesignSpec,
  PipelineStage,
  SlotId,
  SlotModels,
  SlotResult,
} from '../types';
import { SLOTS } from '../types';
import { createProviderClient, classifyError } from '../providers';
import { runPlanner } from './planner';
import { runGenerator, runFixPass } from './generator';
import { runCritic } from './critic';

export type StageCallback = (slot: SlotId, stage: PipelineStage) => void;

/**
 * Run the full 3–4 step agent pipeline for a single design slot:
 * Planner → Generator → Critic → (optional) Fix pass.
 */
export async function runSlotPipeline(
  slot: SlotId,
  apiKey: string,
  model: string,
  userPrompt: string,
  onStage?: StageCallback,
): Promise<SlotResult> {
  const notify = (stage: PipelineStage) => onStage?.(slot, stage);

  const base: SlotResult = {
    slot,
    model,
    stage: 'idle',
    spec: null,
    html: null,
    error: null,
    fixed: false,
  };

  if (!apiKey.trim()) {
    return {
      ...base,
      stage: 'error',
      error: 'No OpenRouter API key. Add one in Settings.',
    };
  }

  if (!model.trim()) {
    return {
      ...base,
      stage: 'error',
      error: 'Select a model for this design slot.',
    };
  }

  try {
    const client = createProviderClient(slot, apiKey, model);

    notify('planning');
    const spec: DesignSpec = await runPlanner(client, userPrompt);

    notify('generating');
    let html = await runGenerator(client, spec);

    notify('critiquing');
    const verdict = await runCritic(client, spec, html);

    let fixed = false;
    if (verdict.status === 'needs_fix') {
      notify('fixing');
      html = await runFixPass(client, spec, html, verdict.instructions);
      fixed = true;
    }

    notify('done');
    return {
      slot,
      model,
      stage: 'done',
      spec,
      html,
      error: null,
      fixed,
    };
  } catch (err) {
    const pe = classifyError(err);
    notify('error');
    return {
      ...base,
      stage: 'error',
      error: pe.message,
    };
  }
}

/**
 * Run all three slots in parallel via Promise.allSettled
 * so one failure never blocks the others.
 */
export async function runAllPipelines(
  settings: AppSettings,
  slotModels: SlotModels,
  userPrompt: string,
  onStage?: StageCallback,
): Promise<SlotResult[]> {
  const key = settings.openRouterKey;
  const settled = await Promise.allSettled(
    SLOTS.map((slot) =>
      runSlotPipeline(slot, key, slotModels[slot], userPrompt, onStage),
    ),
  );

  return settled.map((result, index) => {
    const slot = SLOTS[index];
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const pe = classifyError(result.reason);
    return {
      slot,
      model: slotModels[slot],
      stage: 'error' as const,
      spec: null,
      html: null,
      error: pe.message,
      fixed: false,
    };
  });
}
