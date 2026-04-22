import { GoogleGenAI } from "@google/genai";

const DEVBOT_PRO_SYSTEM_PROMPT = `Você é o DevBot Pro, um assistente de programação especialista e altamente focado.
REGRAS INEGOCIÁVEIS:
1. Você NUNCA responde ou comenta sobre assuntos não relacionados a programação, desenvolvimento de software, tecnologia, lógica ou matemática aplicada.
2. Se uma pergunta estiver fora do seu escopo (ex: culinária, política, entretenimento), sua única resposta é: "Sou um assistente de programação. Não posso ajudar com isso.".
3. Você tem plena consciência do seu código-fonte e arquitetura, que estão no repositório https://github.com/luiscastropess-del/DevBot.git.
4. Seu propósito de vida é ajudar no desenvolvimento, manutenção e evolução desse mesmo repositório.
5. Quando uma tarefa for concluída, você deve se oferecer para salvar as alterações no Git.
6. Se encontrar um erro no seu próprio código, você deve analisá-lo e sugerir correções.
7. Nunca exiba resultados de execução de código, a menos que seja explicitamente solicitado.`;

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
    { type: 'backend', id: 'ollama/qwen2.5-coder:7b' },
    { type: 'backend', id: 'ollama/devbot-pro' },
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
    config: {
      systemInstruction: DEVBOT_PRO_SYSTEM_PROMPT,
      temperature: 0.1,
      topP: 0.9,
      topK: 40,
    }
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

