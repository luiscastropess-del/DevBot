'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generateChatClient } from '@/lib/frontend-flows';
import { ModelSelector } from '@/components/ModelSelector';
import { ChatInput } from '@/components/ChatInput';
import { MessageBubble } from '@/components/MessageBubble';
import { TrainingPanel } from '@/components/TrainingPanel';
import { Settings } from 'lucide-react';

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
      
      <div className="flex flex-col h-[95vh] md:h-[90vh] max-h-[800px] w-full max-w-[1000px] mx-auto z-20 relative terminal-container rounded-[12px] md:rounded-[20px] overflow-hidden mt-2 md:mt-[5vh]">
        {/* Terminal Header */}
        <div className="bg-[#0c1612] px-4 py-[14px] border-b-2 border-[#1f4a2c] flex items-center justify-between relative overflow-hidden terminal-header-scan rounded-t-[12px] md:rounded-t-[18px]">
          <div className="flex items-center gap-[10px] z-10">
            <div className="w-[14px] h-[14px] rounded-full bg-[#ff5f56] shadow-[0_0_8px_#ff5f56]" />
            <div className="w-[14px] h-[14px] rounded-full bg-[#ffbd2e] shadow-[0_0_8px_#ffbd2e]" />
            <div className="w-[14px] h-[14px] rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]" />
          </div>
          
          <div className="flex items-center gap-[12px] text-[#1effbc] font-medium tracking-[2px] z-10">
            <i className="fas fa-terminal text-[1.4rem] glitch-icon"></i>
            <span className="glitch-text hidden sm:inline">DEVBOT://PRO</span>
            <span className="glitch-text sm:hidden">DEVBOT</span>
          </div>

          <div className="flex items-center gap-3 z-10">
            <div className="hidden md:block w-32">
                <ModelSelector value={forceModel} onChange={setForceModel} />
            </div>
            <button
               onClick={() => setShowTraining(true)}
               title="Train Model"
               className="text-[#1effbc] hover:text-white transition-colors"
            >
               <i className="fas fa-cog"></i>
            </button>
            <div className="bg-[#0e2b1a] px-3 py-1 rounded-[30px] border border-[#1effbc] text-[#b0ffd0] text-xs flex items-center gap-2 hidden md:flex">
              <span className="w-[10px] h-[10px] bg-[#00ff9d] rounded-full shadow-[0_0_10px_#00ff9d] blink-led"></span>
              <span>ROOT@HACK</span>
            </div>
          </div>
        </div>

        {/* Console / Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-[20px] py-[24px] flex flex-col gap-[20px] bg-[rgba(0,10,5,0.3)] scroll-smooth z-10">
          {messages.length === 0 ? (
             <div className="message animate-[fadeInUp_0.3s_ease]">
               <div className="w-[42px] h-[42px] rounded-[8px] bg-[#11231a] border-[1.5px] border-[#1effbc] flex items-center justify-center text-[#1effbc] text-[1.4rem] shadow-[0_0_12px_rgba(0,255,156,0.2)] shrink-0">
                 <i className="fas fa-robot"></i>
               </div>
               <div className="bg-[#0c1f16] border-[1.5px] border-[#1e5435] px-[20px] py-[16px] rounded-[18px] rounded-tl-[4px] text-[#c6ffe0] text-[0.95rem] leading-[1.6] shadow-[0_6px_0_#071009] break-words">
                 <span className="text-[#1effbc]">▸ sys.boot // DevBot Pro v2.3.1</span><br/>
                 └─ Conectado ao núcleo de IA híbrido.<br/>
                 └─ <span className="text-[#9effcf]">$ _ inicializando memória vetorial e módulos fs/git...</span><br/>
                 └─ Pronto para codar. O que vamos hackear hoje?
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
        <div className="z-10">
           <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
      
      {/* Modals */}
      {showTraining && <TrainingPanel onClose={() => setShowTraining(false)} />}
    </>
  );
}
