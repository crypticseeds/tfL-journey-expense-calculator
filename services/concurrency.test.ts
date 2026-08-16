import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./concurrency";

describe("runWithConcurrency", () => {
  it("rejects invalid concurrency values", async () => {
    await expect(runWithConcurrency([], 0)).rejects.toThrow(
      "Concurrency must be a positive integer."
    );
  });

  it("limits active tasks, preserves result order, and reports monotonic progress", async () => {
    let active = 0;
    let maxActive = 0;
    const progress: number[] = [];
    const delays = [30, 5, 20, 1];
    const tasks = delays.map(
      (delay, index) => () =>
        new Promise<number>((resolve) => {
          active++;
          maxActive = Math.max(maxActive, active);
          setTimeout(() => {
            active--;
            resolve(index);
          }, delay);
        })
    );

    const results = await runWithConcurrency(tasks, 2, (completed) =>
      progress.push(completed)
    );

    expect(maxActive).toBe(2);
    expect(results).toEqual([0, 1, 2, 3]);
    expect(progress).toEqual([1, 2, 3, 4]);
  });
});
