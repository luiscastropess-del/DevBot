import { Octokit } from '@octokit/rest';
import { getEmbedding, MemoryNode } from './vector-store';
import fs from 'fs';
import path from 'path';

const REPO_MEMORY_FILE = path.join(process.cwd(), 'repo_memory.json');

export interface RepoSource {
    url: string;
    lastIndexed: number;
}

function loadRepoMemories(): MemoryNode[] {
    if (!fs.existsSync(REPO_MEMORY_FILE)) return [];
    try {
        const data = fs.readFileSync(REPO_MEMORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveRepoMemories(memories: MemoryNode[]) {
    fs.writeFileSync(REPO_MEMORY_FILE, JSON.stringify(memories, null, 2));
}

export async function indexGitHubRepo(repoUrl: string) {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) throw new Error("URL do GitHub inválida");
    
    const [_, owner, repo] = match;
    console.log(`[Repo Indexer] Iniciando indexação de ${owner}/${repo}...`);

    try {
        // Get recursive tree
        const { data: treeData } = await octokit.repos.getTree({
            owner,
            repo,
            tree_sha: 'main', // fallback to master if main fails
            recursive: 'true'
        }).catch(() => octokit.repos.getTree({
            owner,
            repo,
            tree_sha: 'master',
            recursive: 'true'
        }));

        const files = treeData.tree.filter(f => 
            f.type === 'blob' && 
            f.path && 
            /\.(ts|tsx|js|jsx|json|md|py|go|rs|c|cpp|h|css|html)$/.test(f.path) &&
            !f.path.includes('node_modules') &&
            !f.path.includes('dist') &&
            !f.path.includes('.next')
        );

        console.log(`[Repo Indexer] Encontrados ${files.length} arquivos relevantes.`);
        const memories = loadRepoMemories();

        for (const file of files) {
            try {
                if (!file.path) continue;
                
                const { data: contentData } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: file.path,
                });

                if ('content' in contentData && typeof contentData.content === 'string') {
                    const content = Buffer.from(contentData.content, 'base64').toString('utf-8');
                    
                    // Chunk content if too large (roughly 4k chars per chunk)
                    const chunks = content.match(/[\s\S]{1,4000}/g) || [content];
                    
                    for (let i = 0; i < chunks.length; i++) {
                        const chunkText = `[Arquivo: ${file.path}${chunks.length > 1 ? ` Parte ${i+1}` : ''}]\nURL: ${repoUrl}\n\n${chunks[i]}`;
                        const vector = await getEmbedding(chunkText);
                        
                        if (vector && vector.length > 0) {
                            memories.push({
                                text: chunkText,
                                vector,
                                timestamp: Date.now()
                            });
                        }
                    }
                    console.log(`[Repo Indexer] Arquivo indexado: ${file.path}`);
                }
            } catch (err) {
                console.warn(`[Repo Indexer] Falha ao indexar ${file.path}:`, err);
            }
        }

        saveRepoMemories(memories);
        console.log(`[Repo Indexer] Finalizado. Base de conhecimento expandida.`);
        return { success: true, count: files.length };
    } catch (error) {
        console.error("[Repo Indexer] Erro crítico:", error);
        throw error;
    }
}

export async function recallRepoSnippet(query: string, topK: number = 5): Promise<string[]> {
    const memories = loadRepoMemories();
    if (memories.length === 0) return [];

    const queryVec = await getEmbedding(query);
    if (!queryVec || !queryVec.length) return [];

    // Computes Cosine Similarity (reusing simple logic)
    function cosineSimilarity(A: number[], B: number[]) {
        let dotproduct = 0; let normA = 0; let normB = 0;
        for (let i = 0; i < A.length; i++) {
            dotproduct += A[i] * B[i];
            normA += A[i] * A[i];
            normB += B[i] * B[i];
        }
        return normA === 0 || normB === 0 ? 0 : dotproduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const scored = memories.map(m => ({
        text: m.text,
        score: cosineSimilarity(queryVec, m.vector)
    })).sort((a, b) => b.score - a.score);

    return scored.filter(s => s.score > 0.45).slice(0, topK).map(s => s.text);
}
