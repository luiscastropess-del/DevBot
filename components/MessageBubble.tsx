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
     <div className={`message animate-[fadeInUp_0.3s_ease] ${isUser ? 'user self-end flex-row-reverse' : ''} flex gap-4 max-w-[95%] md:max-w-[85%]`}>
       <div className={`w-[42px] h-[42px] rounded-[8px] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,255,156,0.2)] text-[1.4rem] border-[1.5px] ${isUser ? 'bg-[#1a2a22] border-[#3affb0] text-[#1effbc]' : 'bg-[#11231a] border-[#1effbc] text-[#1effbc]'}`}>
          {isUser ? <i className="fas fa-user-secret text-[1.1rem]"></i> : <i className="fas fa-robot text-[1.1rem]"></i>}
       </div>
       
       <div className={`border-[1.5px] px-[16px] py-[12px] md:px-[20px] md:py-[16px] text-[0.95rem] leading-[1.6] break-words flex flex-col justify-between
          ${isUser 
             ? 'bg-[#153621] border-[#2a9d5e] rounded-[18px] rounded-tr-[4px] text-[#e2ffed] shadow-[0_6px_0_#0c2013]' 
             : 'bg-[#0c1f16] border-[#1e5435] rounded-[18px] rounded-tl-[4px] text-[#c6ffe0] shadow-[0_6px_0_#071009]'
          }`}
       >
         <div className="markdown-body flex-1 overflow-x-auto min-w-0 pb-2">
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
           <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-[#1e5435] pt-3 gap-2">
             <div className="text-[0.7rem] text-[#2a9d5e] font-mono">
               SYS_MODEL: <span className="text-[#a0f0c0]">{message.modeloUsado || 'unknown'}</span>
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={handleSendToGitHub}
                 disabled={sendingToGit}
                 className="flex items-center gap-1.5 px-3 py-1 text-[0.75rem] text-[#b0ffd0] hover:text-[#1effbc] hover:bg-[#133e23] border border-transparent hover:border-[#2a9d5e] rounded transition-colors disabled:opacity-50"
                 title="Send to GitHub"
               >
                 <i className="fab fa-github"></i>
                 <span>{gitStatus || (sendingToGit ? 'Sending...' : 'Git Push')}</span>
               </button>
               <button
                 onClick={handleCopy}
                 className="flex items-center gap-1.5 px-3 py-1 text-[0.75rem] text-[#b0ffd0] hover:text-[#1effbc] hover:bg-[#133e23] border border-transparent hover:border-[#2a9d5e] rounded transition-colors"
               >
                 {copied ? <i className="fas fa-check text-emerald-400" /> : <i className="far fa-copy" />}
                 <span>{copied ? 'Copied' : 'Copy'}</span>
               </button>
             </div>
           </div>
         )}
       </div>
     </div>
  );
}
