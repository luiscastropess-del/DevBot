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
  // Configured default preferred fallback chain for robustness
  // If a model is offline or throws an error, the next is tried seamlessly.
  const defaultChain = [
    { type: 'backend', id: 'ollama/devbot-pro' },
    { type: 'backend', id: 'ollama/qwen2.5-coder:7b' },
    { type: 'backend', id: 'ollama/qwen3-coder:cloud' },
    { type: 'backend', id: 'googleai/gemini-3.1-pro-preview' },
    { type: 'backend', id: 'googleai/gemini-3.1-flash-lite-preview' }
  ];

  // If a specific model is forced, we try it FIRST, then fallback to others if it crashes
  let fallbackChain = [...defaultChain];
  if (forceModel) {
    // Remove the forced model if it's already in the chain to prevent double-checking
    fallbackChain = fallbackChain.filter(m => m.id !== forceModel);
    // Put the forced model at the very front of the execution queue
    fallbackChain.unshift({ type: 'backend', id: forceModel });
  }

  let lastError: any = null;
  const attemptedModels: string[] = [];

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
      attemptedModels.push(model.id);
    }
  }

  throw new Error(`Fallback exhaustion. Attempted models: ${attemptedModels.join(', ')}. Last error: ${lastError?.message || lastError}`);
}

async function callGemini(prompt: string, modelId: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("CHAVE API INVÁLIDA: Sua GEMINI_API_KEY está incorreta ou vazia. Por favor, acesse o menu Settings > Secrets no AI Studio.");
  }
  try {
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
  } catch(e: any) {
    if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid')) {
       throw new Error("CHAVE API INVÁLIDA: A chave do Gemini fornecida foi rejeitada pelo Google. Verifique os Segredos (Secrets) no seu ambiente.");
    }
    throw e;
  }
}

async function callBackend(prompt: string, forceModel: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
       prompt, 
       forceModel,
       params: { permitirEscrita: true } // Auto-enable tooling capabilities in Genkit Router
    }),
  });

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (res.ok) {
      return { resposta: data.resposta, modeloUsado: data.modeloUsado };
    } else {
      throw new Error(data.details || data.error || `Server Error (${res.status})`);
    }
  } else {
    const text = await res.text();
    // If it's a large HTML error page, just show a snippet or a generic message
    const errorSnippet = text.substring(0, 100).replace(/<[^>]*>?/gm, '');
    throw new Error(`Backend error (${res.status}): ${errorSnippet || 'Check if the backend is online'}`);
  }
}

