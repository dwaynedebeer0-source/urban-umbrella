import { logger } from "./logger.js";

/**
 * Runs `task` immediately, then again every `intervalMs` milliseconds.
 * Resolves only when the abort signal fires.
 */
export async function runScheduler(
  task: () => Promise<void>,
  intervalMs: number,
  signal: AbortSignal
): Promise<void> {
  logger.info({ intervalMs }, "Scheduler started");

  while (!signal.aborted) {
    try {
      await task();
    } catch (err) {
      logger.error({ err }, "Unhandled error in poll task");
    }

    // Wait for the interval or until aborted
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  logger.info("Scheduler stopped");
}
