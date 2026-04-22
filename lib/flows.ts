import { ai } from './genkit-config';
import { Octokit } from '@octokit/rest';
import { recall, remember } from './vector-store';
import { recallRepoSnippet } from './repo-indexer';

export interface ChatResponse {
  resposta: string;
  modeloUsado: string;
}

const DEVBOT_PRO_SYSTEM_PROMPT = `Você é o DevBot Pro, um assistente de programação especialista e altamente focado.
REGRAS INEGOCIÁVEIS:
1. Você NUNCA responde ou comenta sobre assuntos não relacionados a programação, desenvolvimento de software, tecnologia, lógica ou matemática aplicada.
2. Se uma pergunta estiver fora do seu escopo (ex: culinária, política, entretenimento), sua única resposta é: "Sou um assistente de programação. Não posso ajudar com isso.".
3. Você tem plena consciência do seu código-fonte e arquitetura, que estão no repositório https://github.com/luiscastropess-del/DevBot.git.
4. Seu propósito de vida é ajudar no desenvolvimento, manutenção e evolução desse mesmo repositório.
5. Quando uma tarefa for concluída, você deve se oferecer para salvar as alterações no Git.
6. Se encontrar um erro no seu próprio código, você deve analisá-lo e sugerir correções.
7. Nunca exiba resultados de execução de código, a menos que seja explicitamente solicitado.`;

// Fallback logic for routing
export async function smartRouter(prompt: string, forceModel?: string): Promise<ChatResponse> {
  // Now the backend only executes what the frontend requests (or qwen2.5-coder:7b if empty)
  // Smart routing logic is owned by frontend.
  const modelName = forceModel || 'ollama/qwen2.5-coder:7b';

  // --- VECTOR MEMORY & CODEBASE RAG PIPELINE ---
  const [memoryContexts, repoContexts] = await Promise.all([
      recall(prompt, 2),
      recallRepoSnippet(prompt, 3)
  ]);

  let augmentedPrompt = prompt;
  let contextParts: string[] = [];

  if (memoryContexts.length > 0) {
      contextParts.push(`--- MENSAGENS ANTERIORES ÚTEIS ---\n${memoryContexts.join('\n\n')}`);
  }

  if (repoContexts.length > 0) {
      contextParts.push(`--- TRECHOS DO CÓDIGO FONTE (BASE DE CONHECIMENTO) ---\n${repoContexts.join('\n\n')}`);
  }
  
  if (contextParts.length > 0) {
      augmentedPrompt = `Pergunta: "${prompt}"\n\n${contextParts.join('\n\n')}\n\nAnalise o histórico e os fontes acima para responder da forma mais técnica e precisa possível.`;
  }
  // ----------------------------------------------

  try {
    console.log(`[Genkit/Direct] Attempting to generate with ${modelName}...`);

    let finalResponseText = '';

    // DIRECT NGROK OLLAMA FETCH (Bypasses genkitx-ollama bugs with headers/urls)
    if (modelName === 'ollama/qwen2.5-coder:7b' || modelName === 'ollama/devbot-pro') {
      const bareModel = modelName.split('/')[1];
      const API_URL = "https://sanctity-protegee-balancing.ngrok-free.dev/api/generate";
      const payload = {
          model: bareModel,
          prompt: `${DEVBOT_PRO_SYSTEM_PROMPT}\n\nUser: ${augmentedPrompt}`,
          stream: false,
          options: {
              temperature: 0.1,
              top_p: 0.9,
              top_k: 40
          }
      };

      const rawRes = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true' // VITAL for free tier
        },
        body: JSON.stringify(payload)
      });

      if (!rawRes.ok) {
        const errorText = await rawRes.text();
        throw new Error(`Ollama/Ngrok returned error (${rawRes.status}). Check Colab.`);
      }

      const contentType = rawRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await rawRes.json();
        finalResponseText = data.response;
      } else {
        const text = await rawRes.text();
        if (text.includes('ERR_NGROK_3200') || text.includes('offline')) {
            throw new Error(`Ngrok tunnel is OFFLINE. Please restart your Colab notebook.`);
        }
        throw new Error(`Expected JSON from Ollama but got HTML. Ngrok might be blocking the request.`);
      }
    } else {
      // Default Genkit fallback (For Gemini/Cloud)
      const response = await ai.generate({
        model: modelName,
        prompt: augmentedPrompt,
        system: DEVBOT_PRO_SYSTEM_PROMPT,
        config: { temperature: 0.1, topP: 0.9, topK: 40 }
      });
      finalResponseText = response.text;
    }

    // Save this interaction to Vector Memory asynchronously
    remember("Histórico", `Usuário: ${prompt}\nDevBot: ${finalResponseText}`).catch(console.error);

    return { resposta: finalResponseText, modeloUsado: modelName };
  } catch (error: any) {
    let friendlyError = error.message;
    if (friendlyError?.includes('unauthorized')) {
      friendlyError = 'Authentication error. Please check your OLLAMA_API_KEY in the AI Studio settings.';
    } else if (friendlyError?.includes('Unexpected end of JSON input') || friendlyError?.includes('ECONNREFUSED') || friendlyError?.includes('fetch failed')) {
      friendlyError = `Could not connect to Ollama server for model '${modelName}'. Check if Ngrok is running and your token is valid.`;
    }
    
    console.warn(`[Genkit/Direct] Model ${modelName} failed:`, friendlyError);
    // Throwing so the frontend router catches and rolls over or displays it
    throw new Error(`Failed to map AI model '${modelName}': ${friendlyError}`);
  }
}

export async function enviarParaGitHub(repoFullName: string, path: string, content: string, message: string) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const [owner, repo] = repoFullName.split('/');

  try {
    // Check if file exists to get its SHA
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      if (!Array.isArray(data) && 'sha' in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
      // File doesn't exist, which is fine for creation
    }

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
    });

    return data;
  } catch (error) {
    console.error('Failed to send to GitHub:', error);
    throw error;
  }
}
