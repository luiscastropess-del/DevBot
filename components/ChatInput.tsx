'use client';

import React, { useState, FormEvent, useRef, useEffect } from 'react';

import { ModelSelector } from './ModelSelector';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModel: string;
  onModelChange: (val: string) => void;
}

const placeholders = [
  'digite um comando ou pergunta...',
  '> conectando ao ollama...',
  '> reescrevendo sistema de arquivos...',
  '> invadir mainframe...'
];

export function ChatInput({ onSend, isLoading, selectedModel, onModelChange }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="bg-[#0b1711] border-t-[2px] border-[#1f4a2c] flex flex-col rounded-b-[12px] md:rounded-b-[18px]">
       {/* Inline Mini-Bar for Model Selection 'in-conversation' */}
       <div className="px-6 py-2 border-b border-[#133e23] flex items-center gap-3">
          <span className="text-[0.65rem] text-[#2a9d5e] font-bold tracking-tighter uppercase whitespace-nowrap">target_engine:</span>
          <div className="w-full max-w-[200px]">
             <ModelSelector value={selectedModel} onChange={onModelChange} />
          </div>
          <div className="ml-auto flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-[#1effbc] rounded-full blink-led"></span>
             <span className="text-[0.65rem] text-[#1effbc] opacity-60 font-mono">STABLE_LINK</span>
          </div>
       </div>

       <form onSubmit={handleSubmit} className="px-[24px] py-[15px] flex gap-[16px] items-center">
          <span className="text-[#1effbc] text-[1.8rem] font-bold pulse-prompt hidden sm:block shrink-0">&gt;</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[placeholderIdx]}
            disabled={isLoading}
            rows={1}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-[#d0ffdd] font-mono text-[1rem] py-[12px] caret-[#1effbc] placeholder:text-[#2a6e4a] placeholder:italic resize-none overflow-hidden h-auto max-h-[120px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-[#133e23] border-[1.5px] border-[#1effbc] text-[#1effbc] w-[50px] h-[50px] rounded-[16px] flex items-center justify-center text-[1.4rem] cursor-pointer transition-all shadow-[0_4px_0_#0a1f12] hover:bg-[#1a5e33] hover:-translate-y-[2px] hover:shadow-[0_6px_0_#0a1f12,0_0_20px_#00ff9d55] active:translate-y-[2px] active:shadow-[0_2px_0_#0a1f12] disabled:opacity-50 shrink-0"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
       </form>
    </div>
  );
}
