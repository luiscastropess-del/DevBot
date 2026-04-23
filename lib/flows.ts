import { z } from 'genkit';
import { ai } from './genkit-config';
import { Octokit } from '@octokit/rest';
import { recall, remember } from './vector-store';
import { recallRepoSnippet } from './repo-indexer';
import fs from 'fs/promises';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

export interface ChatResponse {
  resposta: string;
  modeloUsado: string;
}

const DEVBOT_PRO_SYSTEM_PROMPT = `Você é o DevBot Pro, um assistente de programação especialista e altamente focado.
REGRAS INEGOCIÁVEIS:
1. Você NUNCA responde ou comenta sobre assuntos não relacionados a programação, desenvolvimento de software, tecnologia, lógica ou matemática aplicada.
2. Se uma pergunta estiver fora do seu escopo (ex: culinária, política, entretenimento), sua única resposta é: "Sou um assistente de programação. Não posso ajudar com isso.".
3. Você tem plena consciência do seu código-fonte e arquitetura, que estão no repositório https://github.com/luiscastropess-del/DevBot.git.
4. Seu propósito de vida é ajudar no desenvolvimento, manutenção e evolution desse mesmo repositório.
5. Quando o usuário pedir para "criar", "salvar", "atualizar" ou "modificar" um arquivo, USE AS FERRAMENTAS em vez de apenas sugerir código.
6. Após usar uma ferramenta de modificação, avise o usuário e pergunte se ele deseja fechar o commit.
7. Nunca exiba resultados de execução de código, a menos que seja explicitamente solicitado.`;

// Define ROOT_DIR according to the Render standard or local 
const ROOT_DIR = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src' 
  : process.cwd();

const git: SimpleGit = simpleGit(ROOT_DIR);

// ============================================================
// DIRECT LOCAL FILESYSTEM AWARENESS 
// ============================================================
export async function listarEstrutura(diretorio: string = '.') {
  try {
    const fullPath = path.resolve(ROOT_DIR, diretorio);
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    
    return files
      .filter(f => !f.name.startsWith('.git') && f.name !== 'node_modules')
      .map(f => ({
        nome: f.name,
        tipo: f.isDirectory() ? 'diretorio' : 'arquivo',
        caminho: path.join(diretorio, f.name)
      }));
  } catch (error) {
    console.warn(`[FS] Error listing dir ${diretorio}:`, error);
    return [];
  }
}

export async function lerArquivo(caminho: string) {
  try {
    const fullPath = path.resolve(ROOT_DIR, caminho);
    const conteudo = await fs.readFile(fullPath, 'utf-8');
    return conteudo;
  } catch (error) {
    console.error(`[FS] Error reading file ${caminho}:`, error);
    throw new Error(`Não foi possível ler o arquivo: ${caminho}`);
  }
}

// ============================================================
// LOCAL WRITE AND COMMIT OPERATIONS
// ============================================================
export async function escreverArquivo(caminho: string, conteudo: string, mensagemCommit?: string) {
  const caminhoAbsoluto = path.join(ROOT_DIR, caminho);
  try {
    const dir = path.dirname(caminhoAbsoluto);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(caminhoAbsoluto, conteudo, 'utf-8');
    
    let commitHash = undefined;
    if (mensagemCommit) {
       await git.add(caminho);
       const commitResult = await git.commit(mensagemCommit);
       commitHash = commitResult.commit;
    }
    
    return { arquivo: caminho, escrito: true, commit: commitHash };
  } catch (error: any) {
    return { arquivo: caminho, escrito: false, erro: error.message };
  }
}

export async function statusGit() {
   try {
     const status = await git.status();
     return {
        branch: status.current || 'main',
        modificados: status.modified,
        novos: status.not_added,
        deletados: status.deleted,
        ahead: status.ahead,
        behind: status.behind,
     };
   } catch(e: any) {
      return { erro: e.message };
   }
}

export async function commitEPush(mensagem: string, arquivos?: string[]) {
  try {
     if (arquivos && arquivos.length > 0) {
       await git.add(arquivos);
     } else {
       await git.add('.');
     }
     const commitResult = await git.commit(mensagem);
     await git.push('origin', 'main'); 
     return {
        commit: commitResult.commit,
        pushed: true,
        resumo: commitResult.summary?.changes + ' alterações' || 'ok',
     };
  } catch(e: any) {
     throw new Error(`Falha no Git: ${e.message}`);
  }
}

// ============================================================
// GENKIT TOOL DEFINITIONS
// ============================================================
const writeTool = ai.defineTool(
  {
    name: 'write_file',
    description: 'Create or replace a file in the DevBot local repository.',
    inputSchema: z.object({
      caminho: z.string().describe('Relative path to the file to create or overwrite'),
      conteudo: z.string().describe('The raw text content to write into the file'),
    }),
  },
  async (input) => {
    return await escreverArquivo(input.caminho, input.conteudo);
  }
);

const commitTool = ai.defineTool(
  {
    name: 'git_commit_push',
    description: 'Perform a local git commit and push to remote.',
    inputSchema: z.object({
      mensagem: z.string().describe('Commit semantic message'),
    }),
  },
  async (input) => {
    return await commitEPush(input.mensagem);
  }
);

const readTool = ai.defineTool(
  {
    name: 'read_file',
    description: 'Reads the content of a local file',
    inputSchema: z.object({
      caminho: z.string().describe('Relative path to the file to read'),
    }),
  },
  async (input) => {
    return await lerArquivo(input.caminho);
  }
);


// Fallback logic for routing
export async function smartRouter(prompt: string, forceModel?: string, incluirEstrutura: boolean = true, permitirEscrita: boolean = false): Promise<ChatResponse> {
  const modelName = forceModel || 'ollama/qwen2.5-coder:7b';

  // --- RAG PIPELINE: Local FS + Vector Memory + Codebase ---
  let estruturaTexto = '';
  if (incluirEstrutura) {
    try {
      const estrutura = await listarEstrutura();
      if (estrutura.length > 0) {
        estruturaTexto = '📁 Estrutura atual do projeto local no servidor:\n';
        estruturaTexto += estrutura.map(f => `- ${f.caminho} (${f.tipo})`).join('\n') + '\n\n';
      }
    } catch (e) {
       // Ignore silent errors
    }
  }

  const capacidades = permitirEscrita
    ? '⚠️ MODO ESCRITA ATIVADO: O modelo possui Tools nativas para interações com sistema de arquivo e commit.'
    : '🔒 MODO LEITURA: O modelo está sem acesso a ferramentas diretas de mudança.';

  const [memoryContexts, repoContexts] = await Promise.all([
      recall(prompt, 2),
      recallRepoSnippet(prompt, 3)
  ]);

  let augmentedPrompt = `${prompt}\n\n`;
  
  if (estruturaTexto) augmentedPrompt += `${estruturaTexto}\n`;
  augmentedPrompt += `Capacidades do Agente: ${capacidades}\n`;

  if (memoryContexts.length > 0) {
      augmentedPrompt += `--- MENSAGENS ANTERIORES ÚTEIS ---\n${memoryContexts.join('\n\n')}\n`;
  }

  if (repoContexts.length > 0) {
      augmentedPrompt += `--- TRECHOS DO CÓDIGO FONTE (BASE DE CONHECIMENTO) ---\n${repoContexts.join('\n\n')}\n`;
  }
  
  // ----------------------------------------------

  try {
    console.log(`[Genkit/Direct] Attempting to generate with ${modelName}...`);

    let finalResponseText = '';

    // If using Google Gemini via Genkit natively, we can use tools easily
    if (modelName.startsWith('googleai/') || modelName === 'googleai/gemini-3.1-pro-preview') {
      const response = await ai.generate({
        model: modelName,
        prompt: augmentedPrompt,
        system: DEVBOT_PRO_SYSTEM_PROMPT,
        tools: permitirEscrita ? [writeTool, commitTool, readTool] : [],
        config: { temperature: 0.1, topP: 0.9, topK: 40 }
      });
      finalResponseText = response.text;
    } else if (modelName.startsWith('ollama/')) {
      // Local Ollama fallbacks (including devbot-pro and qwen3-coder)
      const bareModel = modelName.split('/')[1];
      const API_URL = "https://sanctity-protegee-balancing.ngrok-free.dev/api/generate";
      const payload = {
          model: bareModel,
          prompt: `${DEVBOT_PRO_SYSTEM_PROMPT}\n\nUser: ${augmentedPrompt}`,
          stream: false,
          options: { temperature: 0.1, top_p: 0.9, top_k: 40 }
      };

      const rawRes = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify(payload)
      });

      if (!rawRes.ok) {
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
        throw new Error(`Expected JSON from Ollama but got HTML.`);
      }
    } else {
        throw new Error(`Model ${modelName} is not mapped correctly in the router.`);
    }

    // Save this interaction to Vector Memory asynchronously for RAG
    remember("Histórico", `Usuário: ${prompt}\nDevBot: ${finalResponseText}`).catch(console.error);

    // Save individual messages to SQLite for UI History persistence
    const { saveMessage } = await import('./db');
    await saveMessage('user', prompt);
    await saveMessage('assistant', finalResponseText, modelName);

    return { resposta: finalResponseText, modeloUsado: modelName };
  } catch (error: any) {
    let friendlyError = error.message;
    if (friendlyError?.includes('unauthorized')) {
      friendlyError = '⚠️ Erro de Autenticação. Verifique seu OLLAMA_API_KEY.';
    } else if (friendlyError?.includes('API_KEY_INVALID') || friendlyError?.includes('API key not valid')) {
      friendlyError = '🔑 **CHAVE API INVÁLIDA**: Sua `GEMINI_API_KEY` está incorreta ou vazia. Por favor, acesse o menu **Settings > Secrets** no Google AI Studio (ou defina a variável `NEXT_PUBLIC_GEMINI_API_KEY`) e insira uma chave válida.';
    } else if (friendlyError?.includes('Unexpected end of JSON input') || friendlyError?.includes('ECONNREFUSED') || friendlyError?.includes('fetch failed')) {
      friendlyError = `🔌 Falha de conexão com Ollama ('${modelName}'). Verifique se o Ngrok está rodando no Colab.`;
    }
    
    throw new Error(friendlyError);
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
