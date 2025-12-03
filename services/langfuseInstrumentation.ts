/**
 * Langfuse instrumentation setup for browser environment
 *
 * Note: @langfuse/otel is designed for Node.js. For browser environments,
 * we use the OpenTelemetry web SDK with a custom exporter that sends to Langfuse.
 * Context propagation is handled by @langfuse/tracing's startActiveObservation.
 */

import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import {
  resourceFromAttributes,
  defaultResource,
} from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeLangfuse = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const publicKey = (process.env.LANGFUSE_PUBLIC_KEY as string)?.trim();
    const secretKey = (process.env.LANGFUSE_SECRET_KEY as string)?.trim();
    const baseUrl = (process.env.LANGFUSE_BASE_URL as string)?.trim();

    if (!publicKey || !secretKey || publicKey === "" || secretKey === "") {
      console.warn("[Langfuse] Credentials not found. Tracing disabled.");
      return;
    }

    try {
      const authString = btoa(`${publicKey}:${secretKey}`);
      const otlpEndpoint = `${baseUrl.replace(/\/$/, "")}/api/public/otel/v1/traces`;

      const exporter = new OTLPTraceExporter({
        url: otlpEndpoint,
        headers: {
          Authorization: `Basic ${authString}`,
        },
      });

      const resource = defaultResource().merge(
        resourceFromAttributes({
          [SemanticResourceAttributes.SERVICE_NAME]: "tfl-expense-calculator",
          [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
        })
      );

      const spanProcessor = new BatchSpanProcessor(exporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
      });

      const provider = new WebTracerProvider({
        resource,
        spanProcessors: [spanProcessor],
      });

      provider.register();
      isInitialized = true;

      // Expose for manual flushing if needed
      (
        window as Window & { __langfuseSpanProcessor?: typeof spanProcessor }
      ).__langfuseSpanProcessor = spanProcessor;
    } catch (error) {
      console.error("[Langfuse] Failed to initialize:", error);
      throw error;
    }
  })();

  return initializationPromise;
};

// Auto-initialize when module is imported
if (typeof window !== "undefined") {
  initializeLangfuse().catch(() => {});
}

export const waitForInitialization = async (): Promise<boolean> => {
  if (isInitialized) return true;
  if (initializationPromise) {
    try {
      await initializationPromise;
      return isInitialized;
    } catch {
      return false;
    }
  }
  return false;
};
