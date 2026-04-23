import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'vector_memory.json');

export async function GET() {
  try {
    if (await fs.access(MEMORY_FILE).then(() => true).catch(() => false)) {
      const data = await fs.readFile(MEMORY_FILE, 'utf-8');
      const memories = JSON.parse(data);
      
      // Transform memories to a more frontend-friendly format if needed
      // Currently, memories are stored as { text: string, vector: number[], timestamp: number }
      // where text is "Role: Content"
      
      const history = memories.map((m: any, idx: number) => {
        const firstColon = m.text.indexOf(':');
        const role = m.text.substring(0, firstColon).toLowerCase();
        const content = m.text.substring(firstColon + 1).trim();
        
        return {
          id: `hist-${idx}-${m.timestamp}`,
          role: role === 'usuário' ? 'user' : 'assistant',
          content: content,
          timestamp: m.timestamp
        };
      }).sort((a: any, b: any) => a.timestamp - b.timestamp);

      return NextResponse.json({ history });
    }
    return NextResponse.json({ history: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await fs.writeFile(MEMORY_FILE, JSON.stringify([], null, 2));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
