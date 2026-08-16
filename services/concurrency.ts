export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  onComplete?: (completed: number, total: number) => void
): Promise<T[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be a positive integer.");
  }

  const results = new Array<T>(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
      completed++;
      onComplete?.(completed, tasks.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  const settledWorkers = await Promise.allSettled(workers);
  const failedWorker = settledWorkers.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failedWorker) throw failedWorker.reason;
  return results;
}
