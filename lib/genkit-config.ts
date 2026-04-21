import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

// Initialize Genkit with Google AI and Ollama plugins
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
    ollama({
      models: [{ name: 'qwen3-coder:cloud' }],
      serverAddress: process.env.OLLAMA_URL || 'https://ollama.com',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY || ''}`.trim()
      }
    }),
  ],
});

