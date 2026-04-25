import { NextResponse } from 'next/server';
import { indexGitHubRepo } from '@/lib/repo-indexer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    // This may take a while, in a real production we would use a background job.
    // For now, we index and return.
    const result = await indexGitHubRepo(repoUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Core Base Indexer Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
