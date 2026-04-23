import { NextResponse } from 'next/server';
import { smartRouter, listarEstrutura, lerArquivo } from '@/lib/flows';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt, forceModel, action } = await req.json();

    // Directly handle specific filesystem actions
    if (action === 'listar') {
      const estrutura = await listarEstrutura(prompt || '.');
      return NextResponse.json({ resposta: typeof estrutura === 'string' ? estrutura : JSON.stringify(estrutura, null, 2), modeloUsado: 'filesystem-local' });
    } 
    
    if (action === 'ler') {
      if (!prompt) return NextResponse.json({ error: 'É necessário o caminho do arquivo no prompt.' }, { status: 400 });
      const conteudo = await lerArquivo(prompt);
      return NextResponse.json({ resposta: conteudo, modeloUsado: 'filesystem-local' });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Default chat logic with structure awareness True by default
    const { resposta, modeloUsado } = await smartRouter(prompt, forceModel, true);

    return NextResponse.json({ resposta, modeloUsado });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
