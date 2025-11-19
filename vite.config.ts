import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path, // Don't rewrite, forward as-is
          },
        },
      },
      plugins: [react()],
      define: {
        // SECURITY: API keys are no longer exposed to client-side code
        // GEMINI_API_KEY is only used server-side in the proxy server
        'process.env.LANGFUSE_PUBLIC_KEY': JSON.stringify(env.LANGFUSE_PUBLIC_KEY || ''),
        'process.env.LANGFUSE_SECRET_KEY': JSON.stringify(env.LANGFUSE_SECRET_KEY || ''),
        'process.env.LANGFUSE_BASE_URL': JSON.stringify(env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com')
      },
      envPrefix: 'VITE_',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
