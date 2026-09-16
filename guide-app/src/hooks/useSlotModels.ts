import { useCallback, useEffect, useState } from 'react';
import type { SlotId, SlotModels } from '../types';
import { loadSlotModels, saveSlotModels } from '../utils/storage';

export function useSlotModels() {
  const [models, setModels] = useState<SlotModels>(() => loadSlotModels());

  useEffect(() => {
    saveSlotModels(models);
  }, [models]);

  const setSlotModel = useCallback((slot: SlotId, model: string) => {
    setModels((prev) => ({ ...prev, [slot]: model }));
  }, []);

  return { models, setSlotModel, setModels };
}
