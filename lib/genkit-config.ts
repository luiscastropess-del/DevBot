import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

// Initialize Genkit with Google AI and Ollama plugins
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
    }),
    ollama({
      models: [{ name: 'qwen2.5-coder:1.5b' }],
      serverAddress: 'http://127.0.0.1:11434', 
    }),
  ],
});

