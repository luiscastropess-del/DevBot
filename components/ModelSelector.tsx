'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="relative inline-block text-left">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block appearance-none w-full max-w-[120px] md:max-w-[200px] text-xs md:text-sm bg-[#1e2330] border border-[#2d3345] hover:border-gray-500 px-2 md:px-4 py-2 pr-6 md:pr-8 rounded leading-tight focus:outline-none focus:shadow-outline text-gray-200 truncate"
      >
        <option value="">Auto (Smart Routing)</option>
        <option value="ollama/devbot-pro">Local: DevBot Pro (Custom)</option>
        <option value="ollama/qwen3-coder:cloud">Ollama Cloud: Qwen 3 Coder</option>
        <option value="googleai/gemini-3.1-pro-preview">Cloud: Gemini 3.1 Pro (Recommended)</option>
        <option value="googleai/gemini-3-flash-preview">Cloud: Gemini 3 Flash</option>
        <option value="googleai/gemini-3.1-flash-lite-preview">Cloud: Gemini 3.1 Flash Lite</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <ChevronDown size={16} />
      </div>
    </div>
  );
}
