import type { SlotId } from '../types';
import { downloadHtml } from '../utils/download';

interface DownloadButtonProps {
  html: string | null;
  slot: SlotId;
  model: string;
  className?: string;
  label?: string;
}

export function DownloadButton({
  html,
  slot,
  model,
  className = '',
  label = 'Download .html',
}: DownloadButtonProps) {
  return (
    <button
      type="button"
      disabled={!html}
      onClick={() => {
        if (html) downloadHtml(html, slot, model);
      }}
      className={`rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[var(--bg)] ${className}`}
    >
      {label}
    </button>
  );
}
