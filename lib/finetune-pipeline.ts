import { spawn } from 'child_process';
import path from 'path';

export async function iniciarFinetune() {
  return new Promise((resolve, reject) => {
    // Trigger the Python fine-tuning script
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'finetune_qwen.py');
    const pythonProcess = spawn('python3', [scriptPath]);

    let output = '';

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
        reject(new Error(`Fine-Tuning failed with code ${code}. Log: ${output}`));
      } else {
        resolve({ success: true, log: output });
      }
    });
  });
}
