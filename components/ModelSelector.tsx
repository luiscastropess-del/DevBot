'use client';
import React from 'react';

interface ModelSelectorProps { value: string; onChange: (val: string) => void; }

const MODELS = [
  { id: 'ollama/deepseek-coder-v2', label: 'DeepSeek Coder V2 (Ngrok)' },
  { id: 'ollama/qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (Ngrok)' },
  { id: 'ollama/qwen2.5-coder:1.5b', label: 'Qwen 2.5 Coder 1.5B (Local)' },
];

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const isValid = MODELS.some(m => m.id === value);
  if (!isValid && MODELS.length > 0) onChange(MODELS[0].id);

  return (
    <div className="relative inline-block text-left w-full">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="block appearance-none w-full text-[11px] md:text-xs bg-gray-800 text-green-400 border border-green-500/30 rounded px-2 py-1">
        {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-green-400">
        <i className="fas fa-caret-down text-[12px]"></i>
      </div>
    </div>
  );
}
