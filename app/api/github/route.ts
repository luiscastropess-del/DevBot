import { NextResponse } from 'next/server';
import { enviarParaGitHub } from '@/lib/flows';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { repo, path, content, message } = await req.json();

    if (!repo || !path || !content) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const data = await enviarParaGitHub(repo, path, content, message || 'Update from DevBot Pro');

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'GitHub update failed', details: error.message },
      { status: 500 }
    );
  }
}
