import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Simple JSON-backed Vector DB to avoid compilation errors on cloud functions
const MEMORY_FILE = path.join(process.cwd(), 'vector_memory.json');

export interface MemoryNode {
  text: string;
  vector: number[];
  timestamp: number;
}

// Computes Cosine Similarity between two arrays of floats
function cosineSimilarity(A: number[], B: number[]) {
    let dotproduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < A.length; i++) {
        dotproduct += A[i] * B[i];
        normA += A[i] * A[i];
        normB += B[i] * B[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotproduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Uses Gemini to generate text vectors (embeddings)
export async function getEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("API Key required for embeddings.");
    
    // Fallback safely to not break things if limits are reached
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: text,
        });
        
        // Return mapped floats. GenAI usually nests them inside the Object
        return response.embeddings?.[0]?.values || [];
    } catch (error) {
        console.error("Vector Embedding Failed:", error);
        return [];
    }
}

function loadMemories(): MemoryNode[] {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    try {
        const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveMemories(memories: MemoryNode[]) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

// Stores a new conversation chunk into the Vector Memory pool
export async function remember(role: string, text: string) {
    try {
        const fullText = `${role}: ${text}`;
        const vector = await getEmbedding(fullText);
        
        if (!vector || !vector.length) return;
        
        const mems = loadMemories();
        mems.push({ text: fullText, vector, timestamp: Date.now() });
        saveMemories(mems);
        console.log(`[Vector Memory] Document saved! Memory pool size: ${mems.length}`);
    } catch (e) {
        console.error("Failed to save memory:", e);
    }
}

// Retrieves top K most similar past conversations
export async function recall(query: string, topK: number = 3): Promise<string[]> {
    try {
        const mems = loadMemories();
        if (mems.length === 0) return [];
        
        const queryVec = await getEmbedding(query);
        if (!queryVec || !queryVec.length) return [];

        const scored = mems.map(m => ({
            text: m.text,
            score: cosineSimilarity(queryVec, m.vector)
        })).sort((a, b) => b.score - a.score);

        // Filter out low scores (Threshold 0.4 requires some degree of semantic relevance)
        const relevant = scored.filter(s => s.score > 0.4);
        const topResults = relevant.slice(0, topK).map(s => s.text);
        
        if (topResults.length > 0) {
            console.log(`[Vector Memory] Retrieved ${topResults.length} pertinent records for context.`);
        }
        
        return topResults;
    } catch (e) {
        console.error("Failed to recall memory:", e);
        return [];
    }
}
