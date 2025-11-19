import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Only allow requests from the frontend origin
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Support large file uploads

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Get API key from environment (server-side only)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

// Security: Rate limiting middleware (basic implementation)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

const rateLimit = (req, res, next) => {
  // Get client IP, handling proxy headers (X-Forwarded-For)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.ip 
    || req.connection.remoteAddress 
    || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  }
  
  record.count++;
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-proxy' });
});

// Secure proxy endpoint for Gemini API
app.post('/api/gemini/generateContent', rateLimit, async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    // Validate required fields
    if (!model || !contents) {
      return res.status(400).json({ 
        error: 'Missing required fields: model and contents' 
      });
    }

    // Construct the Gemini API URL
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // Prepare the request body for Gemini API
    // Map config properties to Gemini API format
    const generationConfig = {};
    if (config) {
      if (config.responseMimeType) {
        generationConfig.responseMimeType = config.responseMimeType;
      }
      if (config.responseSchema) {
        generationConfig.responseSchema = config.responseSchema;
      }
      if (config.thinkingConfig) {
        generationConfig.thinkingConfig = config.thinkingConfig;
      }
      // Copy any other config properties
      Object.keys(config).forEach(key => {
        if (!['responseMimeType', 'responseSchema', 'thinkingConfig'].includes(key)) {
          generationConfig[key] = config[key];
        }
      });
    }

    const geminiRequestBody = {
      contents: contents,
      ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
    };

    // Forward the request to Google's Gemini API
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Gemini API request failed',
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Return the response in a format compatible with the client
    res.json({
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      response: data,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔒 Secure Gemini API proxy server running on port ${PORT}`);
  console.log(`   Frontend origin: ${FRONTEND_ORIGIN}`);
  console.log(`   API key configured: ${GEMINI_API_KEY ? '✅' : '❌'}`);
});

