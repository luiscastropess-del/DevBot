import { ai } from './genkit-config';
import { Octokit } from '@octokit/rest';

export interface ChatResponse {
  resposta: string;
  modeloUsado: string;
}

// Fallback logic for routing
export async function smartRouter(prompt: string, forceModel?: string): Promise<ChatResponse> {
  // If the user deliberately requests a specific model
  if (forceModel) {
    try {
      const response = await ai.generate({
        model: forceModel,
        prompt: prompt,
      });
      return { resposta: response.text, modeloUsado: forceModel };
    } catch (error) {
      console.warn(`[Genkit] Forced model ${forceModel} failed. Falling back...`);
    }
  }

  // Define our fallback chain
  const fallbackChain = [
    'ollama/qwen3-coder:cloud',
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
  ];

  let lastError = null;

  for (const modelName of fallbackChain) {
    try {
      console.log(`[Genkit] Attempting to generate with ${modelName}...`);
      const response = await ai.generate({
        model: modelName,
        prompt: prompt,
      });

      return {
        resposta: response.text,
        modeloUsado: modelName,
      };
    } catch (error: any) {
      if (error.message.includes('unauthorized')) {
        console.warn(`[Genkit] Model ${modelName} failed with Authentication error. Check OLLAMA_API_KEY.`);
      } else {
        console.warn(`[Genkit] Model ${modelName} failed:`, error);
      }
      lastError = error;
    }
  }

  throw new Error(`All models in the fallback chain failed. Last error: ${lastError}`);
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
