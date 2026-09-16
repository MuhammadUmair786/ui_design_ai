import { sleep } from './retry';

/** Max in-flight OpenRouter requests — 1 serializes all calls and avoids burst rate limits. */
export const MAX_CONCURRENT_API_REQUESTS = 1;

/** Minimum pause between consecutive requests (ms). */
export const MIN_API_REQUEST_GAP_MS = 400;

/**
 * Global queue so parallel slot pipelines share one OpenRouter rate budget.
 * Slots still run concurrently; only the HTTP calls are throttled.
 */
class ApiRequestQueue {
  private active = 0;
  private waiters: Array<() => void> = [];
  private lastFinishedAt = 0;

  constructor(
    private readonly maxConcurrent: number,
    private readonly minGapMs: number,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      const elapsed = Date.now() - this.lastFinishedAt;
      if (this.lastFinishedAt > 0 && elapsed < this.minGapMs) {
        await sleep(this.minGapMs - elapsed);
      }
      return await fn();
    } finally {
      this.lastFinishedAt = Date.now();
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }
}

export const apiRequestQueue = new ApiRequestQueue(
  MAX_CONCURRENT_API_REQUESTS,
  MIN_API_REQUEST_GAP_MS,
);
