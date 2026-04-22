import { ai } from './genkit-config';
import { Octokit } from '@octokit/rest';

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
  // Now the backend only executes what the frontend requests (or devbot-pro if empty)
  // Smart routing logic is owned by frontend.
  const modelName = forceModel || 'ollama/devbot-pro';

  try {
    console.log(`[Genkit] Attempting to generate with ${modelName}...`);
    const response = await ai.generate({
      model: modelName,
      prompt: prompt,
      system: DEVBOT_PRO_SYSTEM_PROMPT,
      config: { temperature: 0.1, topP: 0.9, topK: 40 }
    });
    return { resposta: response.text, modeloUsado: modelName };
  } catch (error: any) {
    let friendlyError = error.message;
    if (friendlyError?.includes('unauthorized')) {
      friendlyError = 'Authentication error. Please check your OLLAMA_API_KEY in the AI Studio settings.';
    } else if (friendlyError?.includes('Unexpected end of JSON input') || friendlyError?.includes('ECONNREFUSED')) {
      friendlyError = `Could not connect to Ollama server for model '${modelName}'. If you selected a local model, ensure Ollama is running on your machine and accessible limitlessly.`;
    }
    
    console.warn(`[Genkit] Model ${modelName} failed:`, friendlyError);
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
