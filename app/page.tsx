'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generateChatClient } from '@/lib/frontend-flows';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatInput } from '@/components/ChatInput';
import { MessageBubble } from '@/components/MessageBubble';
import { TrainingPanel } from '@/components/TrainingPanel';
import { ChatSessions } from '@/components/ChatSessions';
import { Settings, Menu, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modeloUsado?: string;
}

interface Session {
  id: string;
  title: string;
  created_at: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [forceModel, setForceModel] = useState<string>('');
  const [showTraining, setShowTraining] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
          if (data.sessions && data.sessions.length > 0 && !activeSessionId) {
            setActiveSessionId(data.sessions[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    };
    loadSessions();
  }, []);

  // Load history when session changes
  useEffect(() => {
    if (!activeSessionId) return;

    const loadHistory = async () => {
      setMessages([]);
      try {
        const res = await fetch(`/api/history?sessionId=${activeSessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.history) {
            setMessages(data.history);
          }
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    };
    loadHistory();
  }, [activeSessionId]);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nova Conversa' })
      });
      if (res.ok) {
        const data = await res.json();
        const newSession = { id: data.id, title: 'Nova Conversa', created_at: Date.now() };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(data.id);
        setShowMobileSidebar(false);
      }
    } catch (e) {
      console.error("Failed to create session:", e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
          const remaining = sessions.filter(s => s.id !== id);
          if (remaining.length > 0) setActiveSessionId(remaining[0].id);
          else handleNewChat();
        }
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

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
      const data = await generateChatClient(content, forceModel, activeSessionId);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.resposta || 'No response',
        modeloUsado: data.modeloUsado,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Update session title locally if it's the first message
      if (messages.length === 0) {
        const title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title } : s));
      }
    } catch (error: any) {
      let finalMessage = error.message;

      // Extract specific friendly errors to prevent scary UI dumps
      if (finalMessage.includes('CHAVE API INVÁLIDA')) {
         finalMessage = "🔑 **CHAVE API INVÁLIDA**: Sua `GEMINI_API_KEY` está incorreta ou vazia. Por favor, acesse o menu **Settings > Secrets** no Google AI Studio (ou defina a variável de ambiente) e insira uma chave válida.";
      } else if (finalMessage.includes('Falha de conexão com Ollama')) {
         finalMessage = "🔌 **Modelos Offline**: Não consegui conectar no Ollama (Ngrok). Se você está no AI Studio, tenha certeza de configurar também a Gemini Key.";
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalMessage,
        modeloUsado: 'Erro de Configuração',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="cyber-grid" />
      
      <div className="flex h-[100vh] w-full max-w-[1400px] mx-auto z-20 relative overflow-hidden">
        
        {/* Sessions Sidebar */}
        <ChatSessions 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onNew={handleNewChat}
          onDelete={handleDeleteSession}
          className="hidden md:flex"
        />

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 flex text-left">
             <div className="w-64 h-full">
                <ChatSessions 
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelect={(id) => { setActiveSessionId(id); setShowMobileSidebar(false); }}
                  onNew={() => { handleNewChat(); setShowMobileSidebar(false); }}
                  onDelete={handleDeleteSession}
                  className="flex"
                />
             </div>
             <div className="flex-1" onClick={() => setShowMobileSidebar(false)}>
                <button className="m-4 text-[#1effbc]"><X size={32} /></button>
             </div>
          </div>
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden terminal-container">
          {/* Terminal Header */}
          <div className="bg-[#0c1612] px-4 py-[14px] border-b-2 border-[#1f4a2c] flex items-center justify-between relative overflow-hidden terminal-header-scan">
            <div className="flex items-center gap-[10px] z-10">
              <button 
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden text-[#1effbc] mr-2"
              >
                <Menu size={20} />
              </button>
              <div className="hidden sm:flex items-center gap-[10px]">
                <div className="w-[12px] h-[12px] rounded-full bg-[#ff5f56] shadow-[0_0_8px_#ff5f56]" />
                <div className="w-[12px] h-[12px] rounded-full bg-[#ffbd2e] shadow-[0_0_8px_#ffbd2e]" />
                <div className="w-[12px] h-[12px] rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]" />
              </div>
            </div>
            
            <div className="flex items-center gap-[12px] text-[#1effbc] font-medium tracking-[2px] z-10">
              <i className="fas fa-terminal text-[1.2rem] glitch-icon"></i>
              <span className="glitch-text text-sm sm:text-base">DEVBOT://PRO</span>
            </div>

            <div className="flex items-center gap-3 z-10">
              <div className="w-24 sm:w-36">
                  <ModelSelector value={forceModel} onChange={setForceModel} />
              </div>
              <button
                 onClick={() => setShowTraining(true)}
                 title="Train Model"
                 className="text-[#1effbc] hover:text-white transition-colors"
              >
                 <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Console / Chat Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-[30px] py-[24px] flex flex-col gap-[20px] bg-[rgba(0,10,5,0.4)] scroll-smooth z-10 custom-scrollbar">
            {messages.length === 0 ? (
               <div className="message animate-[fadeInUp_0.3s_ease]">
                 <div className="w-[42px] h-[42px] rounded-[8px] bg-[#11231a] border-[1.5px] border-[#1effbc] flex items-center justify-center text-[#1effbc] text-[1.4rem] shadow-[0_0_12px_rgba(0,255,156,0.2)] shrink-0">
                   <i className="fas fa-robot"></i>
                 </div>
                 <div className="bg-[#0c1f16] border-[1.5px] border-[#1e5435] px-[20px] py-[16px] rounded-[18px] rounded-tl-[4px] text-[#c6ffe0] text-[0.9rem] leading-[1.6] shadow-[0_6px_0_#071009] break-words">
                   <span className="text-[#1effbc]">▸ sys.session.init [{activeSessionId}]</span><br/>
                   └─ Conexão estabelecida com sucesso.<br/>
                   └─ <span className="text-[#9effcf]">$ _ aguardando entrada de dados...</span><br/>
                   <br/>
                   O que vamos construir nesta sessão?
                 </div>
               </div>
            ) : (
               messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
               ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Hacker Component */}
          <div className="z-10 bg-[#0c1612]">
             <ChatInput 
               onSend={handleSend} 
               isLoading={isLoading} 
               selectedModel={forceModel}
               onModelChange={setForceModel}
             />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showTraining && <TrainingPanel onClose={() => setShowTraining(false)} />}
    </>
  );
}

