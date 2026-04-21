'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generateChatClient } from '@/lib/frontend-flows';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatInput } from '@/components/ChatInput';
import { MessageBubble } from '@/components/MessageBubble';
import { TrainingPanel } from '@/components/TrainingPanel';
import { BrainCircuit, Settings, Github } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modeloUsado?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [forceModel, setForceModel] = useState<string>('');
  const [showTraining, setShowTraining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await generateChatClient(content, forceModel);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.resposta || 'No response',
        modeloUsado: data.modeloUsado,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**System Error:** Could not connect to AI. \n\`\`\`text\n${error.message}\n\`\`\``,
        modeloUsado: 'System Error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0d14] text-gray-200">
      {/* Header */}
      <header className="flex-none bg-[#141822] border-b border-[#2d3345] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg shrink-0">
            <BrainCircuit size={20} className="text-white md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-md md:text-lg font-bold text-white tracking-wide truncate">DevBot Pro</h1>
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate">Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
          <div className="block">
            <ModelSelector value={forceModel} onChange={setForceModel} />
          </div>
          <button
            onClick={() => setShowTraining(true)}
            className="flex items-center space-x-2 bg-[#2d3345] hover:bg-gray-600 px-3 py-2 rounded text-sm transition-colors font-medium border border-transparent hover:border-gray-500"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Train Model</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto relative bg-[#0b0d14]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-75">
            <BrainCircuit size={48} className="text-[#2d3345] mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to DevBot Pro</h2>
            <p className="text-gray-400 max-w-md">
              Your resilient AI developer. Queries route to local models first for privacy and speed, falling back to cloud capabilities (Gemini 3 Pro) for complex architectural tasks.
            </p>
          </div>
        ) : (
          <div className="pb-8">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Footer / Input */}
      <div className="flex-none bg-[#141822]">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* Training Panel Overlay */}
      {showTraining && <TrainingPanel onClose={() => setShowTraining(false)} />}
    </div>
  );
}
