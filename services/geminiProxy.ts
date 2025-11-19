/**
 * Secure client-side proxy for Gemini API calls
 * This service calls our backend proxy instead of Google's API directly,
 * ensuring the API key never leaves the server.
 */

interface GenerateContentRequest {
  model: string;
  contents: any;
  config?: {
    responseMimeType?: string;
    responseSchema?: any;
    thinkingConfig?: any;
  };
}

interface GenerateContentResponse {
  text: string;
  response: any;
}

// Use relative URL when in dev mode (Vite will proxy to backend)
// In production, use the full URL from environment variable
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  : '/api'; // Vite proxy will handle this in development

/**
 * Generate content using Gemini API via secure backend proxy
 */
export const generateContent = async (
  request: GenerateContentRequest
): Promise<GenerateContentResponse> => {
  // In dev mode, API_BASE_URL is '/api', so the full path is '/api/gemini/generateContent'
  // In prod mode, API_BASE_URL is the full backend URL, so we append '/api/gemini/generateContent'
  const url = import.meta.env.PROD 
    ? `${API_BASE_URL}/api/gemini/generateContent`
    : `${API_BASE_URL}/gemini/generateContent`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        contents: request.contents,
        config: request.config,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. ` +
        `Please ensure the backend proxy server is running. ` +
        `Run 'pnpm run dev:server' or 'pnpm run dev:all' to start it.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
};

