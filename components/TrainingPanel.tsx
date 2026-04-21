'use client';

import React, { useState } from 'react';
import { X, PlayCircle, Loader2 } from 'lucide-react';

interface TrainingPanelProps {
  onClose: () => void;
}

export function TrainingPanel({ onClose }: TrainingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>('');

  const startFineTuning = async () => {
    setLoading(true);
    setLog('Starting fine-tuning pipeline...\n');
    try {
      const res = await fetch('/api/finetune', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLog((prev) => prev + '\n' + (data.log || 'Success!'));
      } else {
        setLog((prev) => prev + '\nError: ' + data.details);
      }
    } catch (err: any) {
      setLog((prev) => prev + '\nNetwork or Server Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#141822] border-l border-[#2d3345] p-6 shadow-2xl flex flex-col z-50 text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Model Training</h2>
        <button onClick={onClose} className="p-1 hover:bg-[#2d3345] rounded">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mb-4">
        <p className="text-sm text-gray-400 mb-4">
          Launch the continuous learning pipeline using QLoRA. This will process historical high-quality responses to fine-tune the local Qwen2.5-Coder model.
        </p>
        
        <button
          onClick={startFineTuning}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 px-4 rounded font-medium transition-colors"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
          <span>{loading ? 'Training in Progress...' : 'Start Fine-Tuning'}</span>
        </button>

        {log && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Training Logs:</h3>
            <pre className="bg-[#0b0d14] p-3 rounded text-xs text-green-400 overflow-x-auto whitespace-pre-wrap max-h-64">
              {log}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
