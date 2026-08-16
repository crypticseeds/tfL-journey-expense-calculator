export function createRateLimiter({
  windowMs,
  maxRequests,
  now = Date.now,
  records = new Map(),
}) {
  let nextSweep = now() + windowMs;

  return (req, res, next) => {
    const currentTime = now();
    if (currentTime >= nextSweep) {
      for (const [ip, record] of records) {
        if (currentTime >= record.resetTime) records.delete(ip);
      }
      nextSweep = currentTime + windowMs;
    }

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    let record = records.get(ip);
    if (!record || currentTime >= record.resetTime) {
      record = { count: 0, resetTime: currentTime + windowMs };
      records.set(ip, record);
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    record.count++;
    next();
  };
}

export function createLruCache(maxEntries) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new RangeError("maxEntries must be a positive integer");
  }

  const entries = new Map();

  return {
    get(key) {
      if (!entries.has(key)) return undefined;
      const value = entries.get(key);
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, value);
      if (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value);
      }
    },
  };
}

export async function fetchWithRetry(
  url,
  options,
  {
    attempts = 3,
    timeoutMs = 20_000,
    backoffMs = 250,
    fetchImpl = fetch,
    sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  } = {}
) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
      });
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === attempts - 1) return response;
    } catch (error) {
      lastError = error;
      if (error.name === "AbortError" || attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }

    await sleep(backoffMs * 2 ** attempt);
  }

  throw lastError;
}
