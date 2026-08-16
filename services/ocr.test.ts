import { beforeEach, describe, expect, it, vi } from "vitest";

const worker = {
  recognize: vi.fn(),
  terminate: vi.fn(),
};
const createWorker = vi.fn();

vi.mock("tesseract.js", () => ({ createWorker }));

describe("OCR worker lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    worker.recognize.mockReset();
    worker.terminate.mockReset().mockResolvedValue(undefined);
    createWorker.mockReset().mockResolvedValue(worker);
  });

  it("reuses one worker and terminates it after the last session", async () => {
    worker.recognize
      .mockResolvedValueOnce({ data: { text: "first" } })
      .mockResolvedValueOnce({ data: { text: "second" } });
    const { createOcrSession } = await import("./ocr");
    const firstSession = createOcrSession();
    const secondSession = createOcrSession();

    await expect(
      Promise.all([
        firstSession.recognizeText({} as HTMLCanvasElement),
        secondSession.recognizeText({} as HTMLCanvasElement),
      ])
    ).resolves.toEqual(["first", "second"]);
    await firstSession.release();
    expect(worker.terminate).not.toHaveBeenCalled();
    await secondSession.release();

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(2);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
