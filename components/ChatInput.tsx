'use client';

import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { Send, Terminal } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#0b0d14] border-t border-[#2d3345]">
      <div className="max-w-4xl mx-auto relative flex items-end bg-[#141822] rounded-lg border border-[#2d3345] focus-within:border-indigo-500 overflow-hidden px-3 py-2 shadow-inner">
        <Terminal className="text-gray-500 mb-2 mr-2 shrink-0" size={20} />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask DevBot Pro to code..."
          className="w-full max-h-48 resize-none bg-transparent text-gray-200 focus:outline-none py-1 placeholder-gray-600 font-mono text-sm leading-relaxed"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="ml-2 mb-1 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-transparent transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}
