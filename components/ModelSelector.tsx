'use client';

import React from 'react';

interface ModelSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="relative inline-block text-left w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block appearance-none w-full text-[11px] md:text-xs bg-[#0b1711] border border-[#1e5435] hover:border-[#3affb0] px-2 md:px-3 py-1.5 pr-6 md:pr-8 rounded-[4px] leading-tight focus:outline-none focus:shadow-outline text-[#a0f0c0] font-mono shadow-[inset_0_0_8px_#000] cursor-pointer"
      >
        <option value="">[AUTO: ROUTER]</option>
        <option value="luiscastropess/devbot-pro:latest">[CUSTOM] DevBot Pro (Cloud)</option>
        <option value="ollama/qwen2.5-coder:7b">[NGROK] Qwen 2.5 Coder 7B</option>
        <option value="ollama/devbot-pro">[LOCAL] DevBot Pro</option>
        <option value="googleai/gemini-1.5-pro">[CLOUD] Gemini 1.5 Pro</option>
        <option value="googleai/gemini-1.5-flash">[CLOUD] Gemini 1.5 Flash</option>
        <option value="googleai/gemini-1.5-flash-8b">[CLOUD] Gemini 1.5 Flash 8B</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2a9d5e]">
        <i className="fas fa-caret-down text-[14px]"></i>
      </div>
    </div>
  );
}
