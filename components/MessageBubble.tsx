'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, Github, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  modeloUsado?: string;
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [sendingToGit, setSendingToGit] = useState(false);
  const [gitStatus, setGitStatus] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToGitHub = async () => {
    // This is a naive implementation for demo purposes. 
    // In a real scenario, you'd extract code blocks specifically.
    setSendingToGit(true);
    setGitStatus(null);
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: 'owner/repo-name', // Hardcoded for demo, would come from config
          path: `generated/code-${Date.now()}.md`,
          content: message.content,
        }),
      });
      if (res.ok) {
        setGitStatus('Sent!');
      } else {
        setGitStatus('Failed');
      }
    } catch (err) {
      setGitStatus('Error');
    } finally {
      setSendingToGit(false);
      setTimeout(() => setGitStatus(null), 3000);
    }
  };

  return (
    <div className={`py-6 px-4 md:px-0 ${isUser ? 'bg-[#0b0d14]' : 'bg-[#141822] border-y border-[#1e2330]'}`}>
      <div className="max-w-4xl mx-auto flex gap-4">
        <div className="shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Bot size={18} className="text-[#0b0d14]" />
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-x-auto min-w-0">
          <div className="markdown-body text-gray-200">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          {!isUser && (
            <div className="mt-4 flex items-center justify-between border-t border-[#2d3345] pt-3">
              <div className="text-xs text-gray-500 font-mono">
                Model: <span className="text-gray-400">{message.modeloUsado || 'unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendToGitHub}
                  disabled={sendingToGit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#2d3345] rounded transition-colors disabled:opacity-50"
                  title="Send to GitHub"
                >
                  <Github size={14} />
                  <span>{gitStatus || (sendingToGit ? 'Sending...' : 'Git Push')}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#2d3345] rounded transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
