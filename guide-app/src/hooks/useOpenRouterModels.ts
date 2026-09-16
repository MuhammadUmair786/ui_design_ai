import { useEffect, useState } from 'react';
import type { OpenRouterModel } from '../types';
import { fetchOpenRouterModels, getFallbackModels } from '../providers';

export function useOpenRouterModels() {
  const [models, setModels] = useState<OpenRouterModel[]>(() => getFallbackModels());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchOpenRouterModels()
      .then((list) => {
        if (!cancelled) {
          setModels(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load models');
          setModels(getFallbackModels());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, loading, error };
}
