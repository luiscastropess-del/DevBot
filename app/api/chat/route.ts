import { NextResponse } from 'next/server';
import { smartRouter, listarEstrutura, lerArquivo, escreverArquivo, statusGit, commitEPush } from '@/lib/flows';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt, forceModel, action, params, sessionId } = await req.json();

    // Directly handle specific filesystem actions
    if (action === 'listar') {
      const estrutura = await listarEstrutura(params?.diretorio || '.');
      return NextResponse.json({ resposta: typeof estrutura === 'string' ? estrutura : JSON.stringify(estrutura, null, 2), modeloUsado: 'filesystem-local' });
    } 
    
    if (action === 'ler') {
      const caminho = params?.caminho || prompt;
      if (!caminho) return NextResponse.json({ error: 'É necessário o caminho do arquivo.' }, { status: 400 });
      const conteudo = await lerArquivo(caminho);
      return NextResponse.json({ resposta: conteudo, modeloUsado: 'filesystem-local' });
    }

    if (action === 'escrever') {
      const { caminho, conteudo, mensagemCommit } = params || {};
      if (!caminho || !conteudo) return NextResponse.json({ error: 'Caminho e conteúdo são necessários.' }, { status: 400 });
      const response = await escreverArquivo(caminho, conteudo, mensagemCommit);
      return NextResponse.json({ resposta: typeof response === 'string' ? response : JSON.stringify(response, null, 2), modeloUsado: 'filesystem-local' });
    }

    if (action === 'git-status') {
      const status = await statusGit();
      return NextResponse.json({ resposta: JSON.stringify(status, null, 2), modeloUsado: 'filesystem-local' });
    }

    if (action === 'git-commit') {
      const { mensagem, arquivos } = params || {};
      if (!mensagem) return NextResponse.json({ error: 'A mensagem de commit é obrigatória.' }, { status: 400 });
      const commitRes = await commitEPush(mensagem, arquivos);
      return NextResponse.json({ resposta: JSON.stringify(commitRes, null, 2), modeloUsado: 'filesystem-local' });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Default chat logic with structure awareness and potential permissions write
    const permitirEscrita = params?.permitirEscrita || false;
    const MODELO_LOCAL = 'ollama/qwen2.5-coder:1.5b';
    const { resposta, modeloUsado } = await smartRouter(prompt, MODELO_LOCAL, true, permitirEscrita, sessionId);

    return NextResponse.json({ resposta, modeloUsado });
  } catch (error: any) {
    // Only log critical underlying errors, keep the console clean from API auth errors
    if (!error.message.includes('CHAVE API INVÁLIDA')) {
       console.error('AI Routing API Error:', error.message);
    }
    
    return NextResponse.json(
       { error: error.message },
       { status: 500 }
    );
  }
}
