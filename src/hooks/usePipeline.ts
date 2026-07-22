import { useCallback, useRef, useState } from 'react';
import type {
  AppSettings,
  PipelineStage,
  SlotId,
  SlotModels,
  SlotResult,
} from '../types';
import { DEFAULT_MODELS, SLOTS } from '../types';
import { runAllPipelines } from '../agents';

function emptyResults(models: SlotModels = DEFAULT_MODELS): SlotResult[] {
  return SLOTS.map((slot) => ({
    slot,
    model: models[slot],
    stage: 'idle' as const,
    spec: null,
    html: null,
    error: null,
    fixed: false,
  }));
}

export function usePipeline(slotModels: SlotModels) {
  const [results, setResults] = useState<SlotResult[]>(() => emptyResults(slotModels));
  const [isRunning, setIsRunning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const runIdRef = useRef(0);

  const updateStage = useCallback((slot: SlotId, stage: PipelineStage) => {
    setResults((prev) => prev.map((r) => (r.slot === slot ? { ...r, stage } : r)));
  }, []);

  const updateHtml = useCallback((slot: SlotId, html: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.slot === slot ? { ...r, html, stage: 'done', error: null } : r,
      ),
    );
  }, []);

  const generate = useCallback(
    async (settings: AppSettings, userPrompt: string) => {
      const trimmed = userPrompt.trim();
      if (!trimmed) return;

      const runId = ++runIdRef.current;
      setPrompt(trimmed);
      setIsRunning(true);
      setResults(
        SLOTS.map((slot) => ({
          slot,
          model: slotModels[slot],
          stage: 'planning' as const,
          spec: null,
          html: null,
          error: null,
          fixed: false,
        })),
      );

      const settled = await runAllPipelines(
        settings,
        slotModels,
        trimmed,
        updateStage,
      );

      if (runId !== runIdRef.current) return;

      setResults(settled);
      setIsRunning(false);
    },
    [slotModels, updateStage],
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
    generate,
    updateHtml,
    reset,
  };
}
