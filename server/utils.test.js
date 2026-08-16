import { describe, expect, it, vi } from "vitest";
import {
  LruCache,
  createCacheKey,
  createRateLimiter,
  fetchWithRetry,
} from "./utils";

describe("server utilities", () => {
  it("evicts the least recently used response", () => {
    const cache = new LruCache(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
  });

  it("creates a compact deterministic key", () => {
    expect(createCacheKey({ model: "a" })).toBe(createCacheKey({ model: "a" }));
    expect(createCacheKey({ model: "a" })).not.toBe(
      createCacheKey({ model: "b" })
    );
  });

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
        attempts: 1,
        fetchImpl,
        timeoutMs: 10,
      }
    );
    const rejection = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });

    await vi.advanceTimersByTimeAsync(10);
    await rejection;
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
