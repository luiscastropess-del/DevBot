// Stub – sem dependência do Google GenAI (evita erros de módulo nativo no Termux)
import fs from 'fs';
import path from 'path';

export interface MemoryNode {
  text: string;
  vector: number[];
  timestamp: number;
}

// Retorna vetor vazio (offline)
export async function getEmbedding(text: string): Promise<number[]> {
  console.log('[VectorStore] getEmbedding chamado (modo offline, retornando vazio)');
  return [];
}

export async function remember(role: string, text: string): Promise<void> {
  console.log('[VectorStore] Lembrando (modo offline, ignorando)');
}

export async function recall(query: string, topK: number = 3): Promise<string[]> {
  console.log('[VectorStore] recall chamado (modo offline, retornando vazio)');
  return [];
}
