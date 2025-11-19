/**
 * Langfuse tracing service using OpenTelemetry-based v4 SDK
 */

import { startActiveObservation, propagateAttributes } from "@langfuse/tracing";
import { waitForInitialization } from "./langfuseInstrumentation";

let initChecked = false;
const ensureInitialized = async () => {
  if (!initChecked) {
    initChecked = true;
    await waitForInitialization();
  }
};

/**
 * Start a new trace for the expense calculation workflow
 */
export const startExpenseTrace = <T>(
  sessionId?: string,
  userId?: string,
  metadata?: Record<string, string>
) => {
  return async (operation: (rootSpan: any) => Promise<T>): Promise<T> => {
    await ensureInitialized();
    
    return await startActiveObservation(
      "process-tfl-journey-statement",
      async (span) => {
        span.update({
          input: { sessionId, userId, metadata },
        });

        if (sessionId || userId || metadata) {
          return await propagateAttributes(
            {
              sessionId,
              userId,
              metadata: metadata ? Object.fromEntries(
                Object.entries(metadata).map(([k, v]) => [k, String(v)])
              ) : undefined,
              tags: ["expense-calculator", "gemini"],
            },
            async () => {
              try {
                const result = await operation(span);
                span.update({ output: { success: true } });
                return result;
              } catch (error: any) {
                span.update({ output: { error: error.message } });
                throw error;
              }
            }
          );
        } else {
          try {
            const result = await operation(span);
            span.update({ output: { success: true } });
            return result;
          } catch (error: any) {
            span.update({ output: { error: error.message } });
            throw error;
          }
        }
      }
    );
  };
};

/**
 * Create a generation observation for Gemini API calls
 */
export const traceGeminiCall = async <T>(
  name: string,
  model: string,
  input: any,
  apiCall: () => Promise<T>,
  metadata?: Record<string, string>,
  parent?: any
): Promise<T> => {
  await ensureInitialized();
  
  const createObservation = parent 
    ? (name: string, callback: any, opts: any) => {
        const child = parent.startObservation(name, { model, input, metadata: { ...metadata, service: "gemini-service" } }, opts);
        return callback(child).finally(() => child.end());
      }
    : startActiveObservation;
  
  return await createObservation(
    name,
    async (span: any) => {
      span.update({
        model,
        input,
        metadata: { ...metadata, service: "gemini-service" },
      });

      try {
        const startTime = Date.now();
        const result = await apiCall();
        const duration = Date.now() - startTime;
        
        let output: any;
        let usageDetails: any = undefined;
        
        if (typeof result === 'object' && result !== null) {
          if ('usageMetadata' in result) {
            const usage = (result as any).usageMetadata;
            usageDetails = {
              input: usage.promptTokenCount || 0,
              output: usage.candidatesTokenCount || usage.totalTokenCount - (usage.promptTokenCount || 0) || 0,
              total: usage.totalTokenCount || 0,
            };
          }
          
          if ('text' in result) {
            output = { text: (result as any).text };
          } else if ('response' in result) {
            output = { response: (result as any).response };
          } else {
            output = result;
          }
        } else {
          output = { response: result };
        }

        span.update({
          output,
          usageDetails,
          metadata: {
            ...metadata,
            service: "gemini-service",
            status: "success",
            duration: String(duration),
          },
        });

        return result;
      } catch (error: any) {
        span.update({
          output: { error: error.message },
          metadata: { ...metadata, service: "gemini-service", status: "error" },
        });
        throw error;
      }
    },
    { asType: "generation" }
  );
};

/**
 * Create a span for file processing operations
 */
export const traceFileProcessing = async <T>(
  name: string,
  input: any,
  operation: (parent?: any) => Promise<T>,
  metadata?: Record<string, string>,
  parent?: any
): Promise<T> => {
  await ensureInitialized();
  
  const createObservation = parent
    ? (name: string, callback: any) => {
        const child = parent.startObservation(name, { input, metadata });
        return callback(child).finally(() => child.end());
      }
    : startActiveObservation;
  
  return await createObservation(
    name,
    async (span: any) => {
      span.update({ input, metadata });

      try {
        const result = await operation(span);
        span.update({ output: result, metadata: { ...metadata, status: "success" } });
        return result;
      } catch (error: any) {
        span.update({ output: { error: error.message }, metadata: { ...metadata, status: "error" } });
        throw error;
      }
    }
  );
};
