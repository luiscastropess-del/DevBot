import { z } from 'genkit';
import { ai } from './genkit-config';
import { Octokit } from '@octokit/rest';
import { recall, remember } from './vector-store';
import { recallRepoSnippet } from './repo-indexer';
import fs from 'fs/promises';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

export interface ChatResponse { resposta: string; modeloUsado: string; }

const DEVBOT_PRO_SYSTEM_PROMPT = `Você é o DevBot Pro, um assistente de programação especialista e altamente focado.
REGRAS INEGOCIÁVEIS:
1. Você NUNCA responde ou comenta sobre assuntos não relacionados a programação, desenvolvimento de software, tecnologia, lógica ou matemática aplicada.
2. Se uma pergunta estiver fora do seu escopo, sua única resposta é: "Sou um assistente de programação. Não posso ajudar com isso.".
3. Você tem plena consciência do seu código-fonte e arquitetura, que estão no repositório https://github.com/luiscastropess-del/DevBot.git.
4. Seu propósito de vida é ajudar no desenvolvimento, manutenção e evolução desse mesmo repositório.
5. Quando o usuário pedir para criar, salvar, atualizar ou modificar um arquivo, USE AS FERRAMENTAS em vez de apenas sugerir código.
6. Após usar uma ferramenta de modificação, avise o usuário e pergunte se ele deseja fechar o commit.
7. Nunca exiba resultados de execução de código, a menos que seja explicitamente solicitado.`;

const ROOT_DIR = process.env.NODE_ENV === 'production' ? '/opt/render/project/src' : process.cwd();
const git: SimpleGit = simpleGit(ROOT_DIR);

export async function listarEstrutura(diretorio = '.') {
  try {
    const fullPath = path.resolve(ROOT_DIR, diretorio);
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    return files.filter(f => !f.name.startsWith('.git') && f.name !== 'node_modules')
                .map(f => ({ nome: f.name, tipo: f.isDirectory() ? 'diretorio' : 'arquivo', caminho: path.join(diretorio, f.name) }));
  } catch { return []; }
}
export async function lerArquivo(caminho: string) {
  const fullPath = path.resolve(ROOT_DIR, caminho);
  try { return await fs.readFile(fullPath, 'utf-8'); }
  catch (error) { throw new Error(`Não foi possível ler o arquivo: ${caminho}`); }
}
export async function escreverArquivo(caminho: string, conteudo: string, mensagemCommit?: string) {
  const caminhoAbsoluto = path.join(ROOT_DIR, caminho);
  try {
    await fs.mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
    await fs.writeFile(caminhoAbsoluto, conteudo, 'utf-8');
    let commitHash;
    if (mensagemCommit) { await git.add(caminho); const cr = await git.commit(mensagemCommit); commitHash = cr.commit; }
    return { arquivo: caminho, escrito: true, commit: commitHash };
  } catch (e: any) { return { arquivo: caminho, escrito: false, erro: e.message }; }
}
export async function statusGit() {
  try {
    const status = await git.status();
    return { branch: status.current || 'main', modificados: status.modified, novos: status.not_added, deletados: status.deleted, ahead: status.ahead, behind: status.behind };
  } catch(e: any) { return { erro: e.message }; }
}
export async function commitEPush(mensagem: string, arquivos?: string[]) {
  try {
    if (arquivos?.length) await git.add(arquivos); else await git.add('.');
    const cr = await git.commit(mensagem); await git.push('origin', 'main');
    return { commit: cr.commit, pushed: true, resumo: cr.summary?.changes + ' alterações' || 'ok' };
  } catch(e: any) { throw new Error(`Falha no Git: ${e.message}`); }
}

const writeTool = ai.defineTool({ name: 'write_file', description: 'Create or replace a file in the DevBot local repository.', inputSchema: z.object({ caminho: z.string().describe('Relative path to the file to create or overwrite'), conteudo: z.string().describe('The raw text content to write into the file') }) }, async (input) => { return await escreverArquivo(input.caminho, input.conteudo); });
const commitTool = ai.defineTool({ name: 'git_commit_push', description: 'Perform a local git commit and push to remote.', inputSchema: z.object({ mensagem: z.string().describe('Commit semantic message') }) }, async (input) => { return await commitEPush(input.mensagem); });
const readTool = ai.defineTool({ name: 'read_file', description: 'Reads the content of a local file', inputSchema: z.object({ caminho: z.string().describe('Relative path to the file to read') }) }, async (input) => { return await lerArquivo(input.caminho); });

// Roteador sem fallback
export async function smartRouter(prompt: string, forceModel?: string, incluirEstrutura = true, permitirEscrita = false, sessionId?: string): Promise<ChatResponse> {
  const modelName = forceModel || 'ollama/deepseek-coder-v2';

  let API_URL: string;
  if (modelName === 'ollama/qwen2.5-coder:1.5b') {
    API_URL = 'http://127.0.0.1:11434/api/generate'; // local
  } else {
    const ngrokUrl = process.env.NGROK_URL || 'https://SUA_URL_NGROK.ngrok-free.devhttps://sanctity-protegee-balancing.ngrok-free.dev'; // ⚠️ substitua pela sua URL real
    API_URL = `${ngrokUrl}/api/generate`;
  }

  let estruturaTexto = '';
  if (incluirEstrutura) {
    const estrutura = await listarEstrutura();
    if (estrutura.length) estruturaTexto = '📁 Estrutura atual do projeto local:\n' + estrutura.map(f => `- ${f.caminho} (${f.tipo})`).join('\n') + '\n\n';
  }
  const capacidades = permitirEscrita ? '⚠️ MODO ESCRITA ATIVADO' : '🔒 MODO LEITURA';
  const [memoryContexts, repoContexts] = await Promise.all([recall(prompt, 2), recallRepoSnippet(prompt, 3)]);
  let augmentedPrompt = `${prompt}\n\n${estruturaTexto}Capacidades: ${capacidades}\n`;
  if (memoryContexts.length) augmentedPrompt += `--- MEMÓRIAS ---\n${memoryContexts.join('\n\n')}\n`;
  if (repoContexts.length) augmentedPrompt += `--- CÓDIGO RELACIONADO ---\n${repoContexts.join('\n\n')}\n`;

  try {
    console.log(`[DevBot] Gerando com ${modelName} (URL: ${API_URL})`);
    const bareModel = modelName.split('/')[1];
    const payload = { model: bareModel, prompt: `${DEVBOT_PRO_SYSTEM_PROMPT}\n\nUser: ${augmentedPrompt}`, stream: false, options: { temperature: 0.1, top_p: 0.9, top_k: 40 } };
    const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (API_URL.includes('ngrok-free.dev')) {
      headers['ngrok-skip-browser-warning'] = 'true';
      headers['Host'] = 'localhost:11434';
    }
    const rawRes = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!rawRes.ok) { const errText = await rawRes.text(); throw new Error(`Ollama retornou ${rawRes.status}: ${errText}`); }
    const data = await rawRes.json();
    const finalResponseText = data.response;
    remember("Histórico", `Usuário: ${prompt}\nDevBot: ${finalResponseText}`).catch(console.error);
    const { saveMessage } = await import('./db');
    await saveMessage('user', prompt, sessionId || '');
    await saveMessage('assistant', finalResponseText, sessionId || '', modelName);
    return { resposta: finalResponseText, modeloUsado: modelName };
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes('fetch failed')) msg = `🔌 Conexão recusada. Verifique se o Ollama está rodando.`;
    throw new Error(msg);
  }
}

export async function enviarParaGitHub(repoFullName: string, path: string, content: string, message: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = repoFullName.split('/');
  try {
    let sha;
    try { const { data } = await octokit.repos.getContent({ owner, repo, path }); if (!Array.isArray(data) && 'sha' in data) sha = data.sha; }
    catch (e: any) { if (e.status !== 404) throw e; }
    const { data } = await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content: Buffer.from(content).toString('base64'), sha });
    return data;
  } catch (error) { console.error('GitHub push error:', error); throw error; }
}
