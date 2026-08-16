import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./index";

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise((resolve) => server.close(resolve)))
  );
});

const startApp = async (options) => {
  const server = createApp(options).listen(0, "127.0.0.1");
  servers.push(server);
  await once(server, "listening");
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
};

const request = (baseUrl, body) =>
  fetch(`${baseUrl}/api/gemini/generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const validRequest = {
  model: "gemini-3.1-flash-lite",
  contents: { parts: [{ text: "statement" }] },
};

describe("Gemini endpoint", () => {
  it("rejects JSON bodies over 10 MB", async () => {
    const baseUrl = await startApp({ geminiApiKey: "test" });
    const response = await request(baseUrl, {
      ...validRequest,
      contents: "x".repeat(10 * 1024 * 1024),
    });

    expect(response.status).toBe(413);
  });

  it("rejects models outside the allowlist", async () => {
    const fetchImpl = vi.fn();
    const baseUrl = await startApp({ geminiApiKey: "test", fetchImpl });
    const response = await request(baseUrl, {
      ...validRequest,
      model: "gemini-unapproved",
    });

    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("caches normalized responses for identical requests", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "one" }] } }],
        }),
        { status: 200 }
      )
    );
    const baseUrl = await startApp({ geminiApiKey: "test", fetchImpl });

    const first = await request(baseUrl, validRequest);
    const second = await request(baseUrl, validRequest);

    expect(await first.json()).toEqual({
      text: "one",
      response: { candidates: [{ content: { parts: [{ text: "one" }] } }] },
    });
    expect(await second.json()).toEqual({
      text: "one",
      response: { candidates: [{ content: { parts: [{ text: "one" }] } }] },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns the final upstream response after exhausting retries", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("unavailable", { status: 503 }));
    const baseUrl = await startApp({
      geminiApiKey: "test",
      fetchImpl,
      retryOptions: { backoffMs: 0 },
    });
    const response = await request(baseUrl, validRequest);

    expect(response.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
