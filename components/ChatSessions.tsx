'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  created_at: number;
}

interface ChatSessionsProps {
  sessions: Session[];
  activeSessionId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function ChatSessions({ sessions, activeSessionId, onSelect, onNew, onDelete, className = "" }: ChatSessionsProps) {
  return (
    <div className={`flex flex-col h-full bg-[#08120e] border-r border-[#1f4a2c] w-64 ${className}`}>
      <div className="p-4 border-b border-[#1f4a2c]">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-[#133e23] border border-[#1effbc] text-[#1effbc] py-2 rounded-md hover:bg-[#1a5e33] transition-all shadow-[0_0_10px_rgba(30,255,188,0.2)]"
        >
          <Plus size={16} />
          <span className="text-xs font-mono tracking-wider">NOVO_CHAT</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center justify-between p-3 cursor-pointer border-b border-[#0e2b1a] transition-colors ${
              activeSessionId === session.id ? 'bg-[#11231a] text-[#1effbc]' : 'hover:bg-[#0c1f16] text-[#6cb08a]'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={14} className={activeSessionId === session.id ? 'text-[#1effbc]' : 'text-[#2a6e4a]'} />
              <span className="text-xs truncate font-mono">{session.title}</span>
            </div>
            
            {sessions.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-1"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-[#1f4a2c] text-[10px] text-[#2a6e4a] font-mono text-center">
        DEVBOT_PRO_STORAGE-v1.0
      </div>
    </div>
  );
}
