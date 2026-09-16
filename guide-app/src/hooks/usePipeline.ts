import { useCallback, useRef, useState } from 'react';
import type {
  AppSettings,
  SlotId,
  SlotModels,
  SlotResult,
  SlotSelection,
} from '../types';
import { ALL_SLOTS_SELECTED, DEFAULT_MODELS, SLOTS, slotsFromSelection } from '../types';
import { runAllPipelines } from '../agents';

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

function emptyResults(models: SlotModels = DEFAULT_MODELS): SlotResult[] {
  return SLOTS.map((slot) => ({
    slot,
    model: models[slot],
    stage: 'idle' as const,
    spec: null,
    html: null,
    error: null,
    ...emptyErrorFields(),
    fixed: false,
  }));
}

function resetSlotForRun(slot: SlotId, model: string): SlotResult {
  return {
    slot,
    model,
    stage: 'planning',
    spec: null,
    html: null,
    error: null,
    ...emptyErrorFields(),
    fixed: false,
  };
}

export function usePipeline(slotModels: SlotModels) {
  const [results, setResults] = useState<SlotResult[]>(() => emptyResults(slotModels));
  const [isRunning, setIsRunning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [slotSelection, setSlotSelection] = useState<SlotSelection>(ALL_SLOTS_SELECTED);
  const runIdRef = useRef(0);

  const updateSlot = useCallback((slot: SlotId, patch: Partial<SlotResult>) => {
    setResults((prev) =>
      prev.map((r) => (r.slot === slot ? { ...r, ...patch } : r)),
    );
  }, []);

  const updateHtml = useCallback((slot: SlotId, html: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.slot === slot
          ? {
              ...r,
              html,
              stage: 'done',
              error: null,
              ...emptyErrorFields(),
            }
          : r,
      ),
    );
  }, []);

  const generate = useCallback(
    async (
      settings: AppSettings,
      userPrompt: string,
      slots?: SlotId[],
    ) => {
      const trimmed = userPrompt.trim();
      if (!trimmed) return;

      const toRun = slots ?? slotsFromSelection(slotSelection);
      if (toRun.length === 0) return;

      const runId = ++runIdRef.current;
      setPrompt(trimmed);
      setIsRunning(true);

      let baseline: SlotResult[] = [];
      setResults((prev) => {
        baseline = prev;
        return prev.map((r) =>
          toRun.includes(r.slot)
            ? resetSlotForRun(r.slot, slotModels[r.slot])
            : r,
        );
      });

      const settled = await runAllPipelines(
        settings,
        slotModels,
        trimmed,
        toRun,
        baseline,
        updateSlot,
      );

      if (runId !== runIdRef.current) return;

      setResults(settled);
      setIsRunning(false);
    },
    [slotModels, slotSelection, updateSlot],
  );

  const generateOne = useCallback(
    (settings: AppSettings, userPrompt: string, slot: SlotId) =>
      generate(settings, userPrompt, [slot]),
    [generate],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setIsRunning(false);
    setResults(emptyResults(slotModels));
    setPrompt('');
  }, [slotModels]);

  return {
    results,
    isRunning,
    prompt,
    setPrompt,
    slotSelection,
    setSlotSelection,
    generate,
    generateOne,
    updateHtml,
    reset,
  };
}
