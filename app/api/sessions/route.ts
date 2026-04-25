import { NextResponse } from 'next/server';
import { getSessions, createSession, deleteSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await getSessions();
    // If no sessions, create the first one
    if (sessions.length === 0) {
      await createSession('Início');
      const newSessions = await getSessions();
      return NextResponse.json({ sessions: newSessions });
    }
    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    const id = await createSession(title);
    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
