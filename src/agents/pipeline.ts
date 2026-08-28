import type {
  AppSettings,
  DesignSpec,
  PipelineStage,
  ProviderErrorCode,
  SlotId,
  SlotModels,
  SlotResult,
} from '../types';
import { SLOTS } from '../types';
import { createProviderClient, classifyError } from '../providers';
import { buildSystemPrompts } from './prompts';
import { runPlanner } from './planner';
import { runGenerator, runFixPass } from './generator';
import { runCritic } from './critic';

export type PipelineCallback = (slot: SlotId, patch: Partial<SlotResult>) => void;

/** @deprecated Use PipelineCallback */
export type StageCallback = (slot: SlotId, stage: PipelineStage) => void;

function emptyErrorFields(): Pick<
  SlotResult,
  'failedStage' | 'errorCode' | 'errorStatus' | 'errorDetail'
> {
  return {
    failedStage: null,
    errorCode: null,
    errorStatus: null,
    errorDetail: null,
  };
}

function slotErrorFrom(
  err: unknown,
  failedStage: PipelineStage,
): Pick<
  SlotResult,
  'stage' | 'error' | 'failedStage' | 'errorCode' | 'errorStatus' | 'errorDetail'
> {
  const pe = classifyError(err);
  return {
    stage: 'error',
    error: pe.message,
    failedStage,
    errorCode: (pe.code ?? 'unknown') as ProviderErrorCode,
    errorStatus: pe.status ?? null,
    errorDetail: pe.detail ?? (err instanceof Error ? err.message : null),
  };
}

function baseResult(slot: SlotId, model: string): SlotResult {
  return {
    slot,
    model,
    stage: 'idle',
    spec: null,
    html: null,
    error: null,
    ...emptyErrorFields(),
    fixed: false,
  };
}

/**
 * Run the full 3–4 step agent pipeline for a single design slot:
 * Planner → Generator → Critic → (optional) Fix pass.
 */
export async function runSlotPipeline(
  slot: SlotId,
  apiKey: string,
  model: string,
  userPrompt: string,
  settings: AppSettings,
  onUpdate?: PipelineCallback,
): Promise<SlotResult> {
  const notify = (stage: PipelineStage, patch: Partial<SlotResult> = {}) =>
    onUpdate?.(slot, { stage, ...patch });

  const base = baseResult(slot, model);

  if (!apiKey.trim()) {
    const errPatch = {
      stage: 'error' as const,
      error: 'No OpenRouter API key. Add one in Settings.',
      failedStage: 'idle' as const,
      errorCode: 'auth' as const,
      errorStatus: null,
      errorDetail: null,
    };
    notify('error', errPatch);
    return { ...base, ...errPatch };
  }

  if (!model.trim()) {
    const errPatch = {
      stage: 'error' as const,
      error: 'Select a model for this design slot.',
      failedStage: 'idle' as const,
      errorCode: 'unknown' as const,
      errorStatus: null,
      errorDetail: null,
    };
    notify('error', errPatch);
    return { ...base, ...errPatch };
  }

  let currentStage: PipelineStage = 'planning';

  try {
    const client = createProviderClient(slot, apiKey, model, settings.maxTokens);
    const prompts = buildSystemPrompts(settings.promptGuidance);

    currentStage = 'planning';
    notify('planning', emptyErrorFields());
    const spec: DesignSpec = await runPlanner(client, userPrompt, prompts.planner);

    currentStage = 'generating';
    notify('generating');
    let html = await runGenerator(client, spec, prompts.generator, settings.maxTokens);

    currentStage = 'critiquing';
    notify('critiquing');
    const verdict = await runCritic(client, spec, html, prompts.critic);

    let fixed = false;
    if (verdict.status === 'needs_fix') {
      currentStage = 'fixing';
      notify('fixing');
      html = await runFixPass(
        client,
        spec,
        html,
        verdict.instructions,
        prompts.fix,
        settings.maxTokens,
      );
      fixed = true;
    }

    notify('done', { spec, html, error: null, ...emptyErrorFields(), fixed });
    return {
      slot,
      model,
      stage: 'done',
      spec,
      html,
      error: null,
      ...emptyErrorFields(),
      fixed,
    };
  } catch (err) {
    const errPatch = slotErrorFrom(err, currentStage);
    notify('error', errPatch);
    return { ...base, ...errPatch, fixed: false };
  }
}

/**
 * Run selected slots in parallel. API calls are serialized globally via the
 * request queue. Unselected slots keep their previous results from `baseline`.
 */
export async function runAllPipelines(
  settings: AppSettings,
  slotModels: SlotModels,
  userPrompt: string,
  slotsToRun: SlotId[],
  baseline: SlotResult[],
  onUpdate?: PipelineCallback,
): Promise<SlotResult[]> {
  const key = settings.openRouterKey;
  const baselineBySlot = new Map(baseline.map((r) => [r.slot, r]));

  if (slotsToRun.length === 0) {
    return SLOTS.map(
      (slot) => baselineBySlot.get(slot) ?? baseResult(slot, slotModels[slot]),
    );
  }

  const settled = await Promise.allSettled(
    slotsToRun.map((slot) =>
      runSlotPipeline(slot, key, slotModels[slot], userPrompt, settings, onUpdate),
    ),
  );

  const runResults = new Map<SlotId, SlotResult>();
  slotsToRun.forEach((slot, index) => {
    const result = settled[index];
    if (result.status === 'fulfilled') {
      runResults.set(slot, result.value);
      return;
    }
    const errPatch = slotErrorFrom(result.reason, 'planning');
    onUpdate?.(slot, errPatch);
    runResults.set(slot, {
      ...baseResult(slot, slotModels[slot]),
      ...errPatch,
      fixed: false,
    });
  });

  return SLOTS.map(
    (slot) =>
      runResults.get(slot) ??
      baselineBySlot.get(slot) ??
      baseResult(slot, slotModels[slot]),
  );
}
