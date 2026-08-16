import { describe, expect, it, vi } from "vitest";
import { createRateLimiter, fetchWithRetry } from "./utils";

describe("server utilities", () => {
  it("retries retryable upstream responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    const response = await fetchWithRetry(
      "https://example.test",
      {},
      { fetchImpl, sleep: vi.fn(), timeoutMs: 100 }
    );
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("aborts an upstream request at the timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );
    const request = fetchWithRetry(
      "https://example.test",
      {},
      {
        attempts: 3,
        fetchImpl,
        timeoutMs: 10,
      }
    );
    const rejection = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });

    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("evicts expired rate-limit records", () => {
    let time = 0;
    const records = new Map();
    const limiter = createRateLimiter({
      windowMs: 10,
      maxRequests: 1,
      now: () => time,
      records,
    });
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    limiter({ ip: "client" }, res, next);
    limiter({ ip: "client" }, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    time = 10;
    limiter({ ip: "another-client" }, res, next);
    expect(records.has("client")).toBe(false);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
