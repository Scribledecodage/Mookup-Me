'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from '@phosphor-icons/react';

export default function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg';
      case 'javascript': case 'js': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg';
      case 'typescript': case 'ts': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg';
      case 'html': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg';
      case 'css': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg';
      case 'react': return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg';
      case 'json': return 'https://www.vectorlogo.zone/logos/json/json-icon.svg';
      case 'php': return 'https://www.vectorlogo.zone/logos/php/php-icon.svg';
      default: return null;
    }
  };

  const iconUrl = getIcon(language);

  return match ? (
    <div className="message-code-block my-2 rounded-xl border border-gray-200 bg-[#fcfcfc] overflow-hidden shadow-sm">
      <div className="message-code-header flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          {iconUrl && <img src={iconUrl} alt={language} className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-medium text-gray-500 lowercase">{language || 'code'}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-800 transition-colors"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <div className="p-0">
        <SyntaxHighlighter
          style={ghcolors as any}
          language={language}
          PreTag="div"
          customStyle={{ 
            margin: 0, 
            padding: '12px', 
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
