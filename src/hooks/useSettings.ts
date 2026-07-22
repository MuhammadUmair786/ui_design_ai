import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../types';
import { loadSettings, saveSettings } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const updateOpenRouterKey = useCallback((value: string) => {
    setSettings((prev) => ({ ...prev, openRouterKey: value }));
  }, []);

  const persist = useCallback(
    (next?: AppSettings) => {
      const toSave = next ?? settings;
      saveSettings(toSave);
      setSettings(toSave);
      setSaved(true);
    },
    [settings],
  );

  return { settings, setSettings, updateOpenRouterKey, persist, saved };
}
