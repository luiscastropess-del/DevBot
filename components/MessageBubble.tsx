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
    setSendingToGit(true);
    setGitStatus(null);
    try {
      // Find code blocks to extract if any, otherwise push markdown
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
      const match = message.content.match(codeBlockRegex);
      
      let finalContent = message.content;
      let pathTemplate = `docs/generated-${Date.now()}.md`;

      if (match && match[2]) {
        // If we found a code block, push just the code and use the appropriate extension
        const lang = match[1] || 'txt';
        let ext = lang;
        if (lang === 'typescript') ext = 'ts';
        if (lang === 'javascript') ext = 'js';
        if (lang === 'python') ext = 'py';
        finalContent = match[2].trim();
        pathTemplate = `src/auto-update-${Date.now()}.${ext}`;
      }

      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: 'luiscastropess-del/DevBot',
          path: pathTemplate,
          content: finalContent,
        }),
      });
      if (res.ok) {
        setGitStatus('Sent!');
      } else {
        const errorData = await res.json();
        console.error(errorData);
        setGitStatus('Failed');
      }
    } catch (err) {
      console.error(err);
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
