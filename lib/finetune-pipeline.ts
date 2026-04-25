import { spawn } from 'child_process';
import path from 'path';

export async function iniciarFinetune() {
  return new Promise(async (resolve, reject) => {
    let output = '';

    const runScript = () => {
      // Trigger the Python fine-tuning script
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'finetune_qwen.py');
      const pythonProcess = spawn('python3', [scriptPath]);

      pythonProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log(`[Fine-Tune]: ${msg}`);
        output += msg;
      });

      pythonProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error(`[Fine-Tune ERR]: ${msg}`);
        output += msg;
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          let errorMessage = `Fine-Tuning failed with code ${code}.`;
          
          if (output.includes('ModuleNotFoundError')) {
            errorMessage = `ERRO DE DEPENDÊNCIA: O ambiente Python não possui os módulos necessários (transformers, unsloth, etc). Tentamos instalar, mas falhou. Detalhes: ${output.substring(output.indexOf('ModuleNotFoundError'))}`;
          } else if (code === 1 && output.trim() === '') {
            errorMessage = `ERRO CRÍTICO: O processo foi encerrado abruptamente (Code 1). Provavelmente FALTA DE MEMÓRIA (RAM). Note que o Fine-Tuning de LLMs requer mais do que 1GB de RAM.`;
          }
          
          reject(new Error(errorMessage));
        } else {
          resolve({ success: true, log: output });
        }
      });
    };

    // First, try to install requirements
    console.log(`[Fine-Tune]: Installing dependencies from requirements.txt...`);
    const pipProcess = spawn('pip3', ['install', '-r', 'requirements.txt']);
    
    pipProcess.stdout.on('data', (d) => console.log(`[Pip]: ${d}`));
    pipProcess.stderr.on('data', (d) => console.error(`[Pip ERR]: ${d}`));

    pipProcess.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[Pip]: Warning: Pip finished with non-zero code ${code}. Proceeding to script anyway.`);
      }
      runScript();
    });
  });
}
