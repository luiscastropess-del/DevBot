import { NextResponse } from 'next/server';
import { smartRouter } from '@/lib/flows';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt, forceModel } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { resposta, modeloUsado } = await smartRouter(prompt, forceModel);

    return NextResponse.json({ resposta, modeloUsado });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
