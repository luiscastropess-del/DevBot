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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToGitHub = async () => {
    // ... execution logic remains the same
    setSendingToGit(true);
    setGitStatus(null);
    try {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
      const match = message.content.match(codeBlockRegex);
      
      let finalContent = message.content;
      let pathTemplate = `docs/generated-${Date.now()}.md`;

      if (match && match[2]) {
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
      if (res.ok) setGitStatus('Sent!');
      else setGitStatus('Failed');
    } catch (err) {
      setGitStatus('Error');
    } finally {
      setSendingToGit(false);
      setTimeout(() => setGitStatus(null), 3000);
    }
  };

  const CodeComponent = ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const [blockCopied, setBlockCopied] = useState(false);

    const handleBlockCopy = () => {
      navigator.clipboard.writeText(codeString);
      setBlockCopied(true);
      setTimeout(() => setBlockCopied(false), 2000);
    };

    if (inline) {
       return <code className="bg-[#11231a] text-[#1effbc] px-1 rounded" {...props}>{children}</code>;
    }

    return (
      <div className="relative group my-4">
        <div className="rounded-lg overflow-hidden border border-[#1e5435] bg-[#071009]">
           <pre className={`${className} p-4 pb-12 overflow-x-auto`} {...props}>
             <code>{children}</code>
           </pre>
           <button
             onClick={handleBlockCopy}
             className="absolute bottom-2 right-4 flex items-center gap-2 px-3 py-1 text-[0.65rem] font-mono bg-[#0b1711] border border-[#1e5435] text-[#1effbc] hover:border-[#1effbc] transition-all rounded"
           >
             {blockCopied ? <><Check size={12} /> COPIED</> : <><Copy size={12} /> COPY_CODE</>}
           </button>
        </div>
      </div>
    );
  };

  return (
     <div className={`message animate-[fadeInUp_0.3s_ease] mx-auto flex gap-4 w-full max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
       <div className={`w-[42px] h-[42px] rounded-[8px] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,255,156,0.2)] text-[1.4rem] border-[1.5px] ${isUser ? 'bg-[#1a2a22] border-[#3affb0] text-[#1effbc]' : 'bg-[#11231a] border-[#1effbc] text-[#1effbc]'}`}>
          {isUser ? <i className="fas fa-user-secret text-[1.1rem]"></i> : <i className="fas fa-robot text-[1.1rem]"></i>}
       </div>
       
       <div className={`border-[1.5px] px-[16px] py-[12px] md:px-[20px] md:py-[16px] text-[0.95rem] leading-[1.6] break-words flex flex-col justify-between flex-1
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
                components={{
                  code: CodeComponent
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
         </div>

         {!isUser && (
           <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between border-t border-[#1e5435] pt-3 gap-3 bg-[#0a1a12] -mx-[16px] -mb-[12px] md:-mx-[20px] md:-mb-[16px] px-4 py-2 rounded-b-[16px]">
             <div className="flex items-center gap-2 text-[0.7rem] font-mono text-[#1effbc]">
               <span className="w-2 h-2 bg-[#1effbc] rounded-full blink-led"></span>
               <span className="opacity-70">CORE_ENGINE:</span>
               <span className="text-[#a0f0c0] font-bold tracking-wider">{message.modeloUsado || 'UNKNOWN_PROCESS'}</span>
             </div>
             
             <div className="flex items-center gap-3">
               <button
                 onClick={handleSendToGitHub}
                 disabled={sendingToGit}
                 className="flex items-center gap-2 px-3 py-1.5 text-[0.7rem] text-[#b0ffd0] hover:text-[#1effbc] hover:bg-[#133e23] border border-[#1e5435] hover:border-[#1effbc] rounded-[4px] transition-all disabled:opacity-50 group"
                 title="Send to GitHub"
               >
                 <i className="fab fa-github group-hover:scale-110 transition-transform"></i>
                 <span>{gitStatus || (sendingToGit ? 'CONNECTING...' : 'GIT_PUSH')}</span>
               </button>
               
               <button
                 onClick={() => handleCopy(message.content)}
                 className="flex items-center gap-2 px-3 py-1.5 text-[0.7rem] text-[#b0ffd0] hover:text-[#1effbc] hover:bg-[#133e23] border border-[#1e5435] hover:border-[#1effbc] rounded-[4px] transition-all group"
                 title="Copy Content"
               >
                 {copied ? (
                   <>
                     <i className="fas fa-check text-[#1effbc]"></i>
                     <span>COPIED</span>
                   </>
                 ) : (
                   <>
                     <i className="far fa-copy group-hover:scale-110 transition-transform"></i>
                     <span>COPY_RAW</span>
                   </>
                 )}
               </button>
             </div>
           </div>
         )}
       </div>
     </div>
  );
}
