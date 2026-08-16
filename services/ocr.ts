import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | undefined;
let recognitionQueue = Promise.resolve();
let activeSessions = 0;

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) => createWorker("eng"))
      .catch((error) => {
        workerPromise = undefined;
        throw error;
      });
  }
  return workerPromise;
};

const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = recognitionQueue.then(operation);
  recognitionQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const createOcrSession = () => {
  activeSessions++;
  let released = false;

  return {
    recognizeText: (image: HTMLCanvasElement): Promise<string> => {
      if (released) {
        return Promise.reject(new Error("OCR session has been released."));
      }
      return enqueue(async () => {
        const currentWorkerPromise = getWorker();
        const worker = await currentWorkerPromise;
        try {
          const { data } = await worker.recognize(image);
          return data.text;
        } catch (error) {
          if (workerPromise === currentWorkerPromise) {
            workerPromise = undefined;
          }
          await worker.terminate();
          throw error;
        }
      });
    },
    release: async (): Promise<void> => {
      if (released) return;
      released = true;
      activeSessions--;

      await enqueue(async () => {
        if (activeSessions === 0 && workerPromise) {
          const worker = await workerPromise;
          workerPromise = undefined;
          await worker.terminate();
        }
      });
    },
  };
};
