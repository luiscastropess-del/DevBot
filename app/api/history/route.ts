import { NextResponse } from 'next/server';
import { getHistory, clearHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const messages = await getHistory();
    
    const history = messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      modeloUsado: m.modelo_usado,
      timestamp: m.timestamp
    }));

    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearHistory();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
