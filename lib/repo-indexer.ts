// Stub – sem dependências externas (modo offline)

export async function recallRepoSnippet(query: string, topK: number = 5): Promise<string[]> {
  console.log('[RepoIndexer] recallRepoSnippet (modo offline, retornando vazio)');
  return [];
}

export async function indexGitHubRepo(repoUrl: string) {
  console.log('[RepoIndexer] indexGitHubRepo ignorado (modo offline)');
  return { success: false, count: 0 };
}
