import { GoogleGenAI } from "@google/genai";

export async function generateChatClient(prompt: string, forceModel?: string) {
  // If user forced a model
  if (forceModel) {
    if (forceModel.startsWith('googleai/')) {
      return await callGemini(prompt, forceModel.replace('googleai/', ''));
    } else {
      return await callBackend(prompt, forceModel);
    }
  }

  // AUTO ROUTING FALLBACK CHAIN
  const fallbackChain = [
    { type: 'backend', id: 'ollama/qwen3-coder:cloud' },
    { type: 'frontend', id: 'gemini-3.1-pro-preview' },
    { type: 'frontend', id: 'gemini-3.1-flash-lite-preview' }
  ];

  let lastError: any = null;

  for (const model of fallbackChain) {
    try {
      if (model.type === 'frontend') {
        return await callGemini(prompt, model.id);
      } else {
        return await callBackend(prompt, model.id);
      }
    } catch (e: any) {
      console.warn(`[Router] Model ${model.id} failed:`, e.message);
      lastError = e;
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message || lastError}`);
}

async function callGemini(prompt: string, modelId: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is missing in browser environment.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });
  return { resposta: response.text || "No response text", modeloUsado: `googleai/${modelId}` };
}

async function callBackend(prompt: string, forceModel: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, forceModel }),
  });

  const data = await res.json();
  if (res.ok) {
    return { resposta: data.resposta, modeloUsado: data.modeloUsado };
  } else {
    throw new Error(data.details || data.error || 'Failed to get response from backend');
  }
}

