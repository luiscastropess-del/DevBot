'use client';
import React from 'react';

interface ModelSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

const FORCED_MODEL = 'ollama/deepseek-coder-v2';

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  if (value !== FORCED_MODEL) {
    onChange(FORCED_MODEL);
  }
  return (
    <div className="relative inline-block text-left w-full">
      <select
        value={FORCED_MODEL}
        disabled
        className="block appearance-none w-full text-[11px] md:text-xs bg-gray-800 text-green-400 border border-green-500/30 rounded px-2 py-1 opacity-80"
      >
        <option value={FORCED_MODEL}>DeepSeek Coder V2 (Ngrok)</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-green-400">
        <i className="fas fa-lock text-[12px]"></i>
      </div>
    </div>
  );
}
