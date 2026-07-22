import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { SlotId, SlotResult } from '../types';
import { SLOT_LABELS } from '../types';

function safeModelSlug(model: string): string {
  return model.replace(/[^\w.-]+/g, '_').slice(0, 64);
}

/** Download a single HTML design as a .html file (Blob — no server). */
export function downloadHtml(html: string, slot: SlotId, model: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const name = `guide-${SLOT_LABELS[slot].toLowerCase().replace(/\s+/g, '-')}-${safeModelSlug(model)}.html`;
  saveAs(blob, name);
}

/** Download all successful designs as a .zip via JSZip. */
export async function downloadAllAsZip(results: SlotResult[]): Promise<void> {
  const zip = new JSZip();
  let count = 0;

  for (const r of results) {
    if (r.html) {
      zip.file(
        `guide-${SLOT_LABELS[r.slot].toLowerCase().replace(/\s+/g, '-')}-${safeModelSlug(r.model)}.html`,
        r.html,
      );
      count += 1;
    }
  }

  if (count === 0) {
    throw new Error('No designs available to download.');
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'guide-designs.zip');
}
