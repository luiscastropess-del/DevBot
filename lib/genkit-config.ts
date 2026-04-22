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
      models: [
        { name: 'devbot-pro' },
        { name: 'qwen2.5-coder:1.5b' },
        { name: 'qwen2.5-coder:7b' },
        { name: 'qwen3-coder:cloud' }
      ],
      serverAddress: process.env.OLLAMA_URL || 'https://sanctity-protegee-balancing.ngrok-free.dev',
      headers: {
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY || ''}`,
        'ngrok-skip-browser-warning': 'true'
      }
    } as any),
  ],
});

