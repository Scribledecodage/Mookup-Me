'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from '@phosphor-icons/react';
import SpeechHighlightedText from '@/components/SpeechHighlightedText';

const LANG_ICONS: Record<string, string> = {
  python:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  js:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  ts:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  html:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  css:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  react:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  json:       'https://www.vectorlogo.zone/logos/json/json-icon.svg',
  php:        'https://www.vectorlogo.zone/logos/php/php-icon.svg',
  bash:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg',
  sh:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg',
  sql:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  go:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg',
  java:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  cpp:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
  c:          'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg',
  rust:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg',
};

function BotCodeBlock({ children, className }: any) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] ?? '';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => setIsDark(mediaQuery.matches);
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);
  const iconUrl = LANG_ICONS[language.toLowerCase()];
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline code
  if (!match) {
    return (
      <code className="bot-inline-code bg-gray-100 text-gray-800 text-[13px] font-mono px-1 py-0.5 rounded border border-gray-200">
        {children}
      </code>
    );
  }

  // Bloc de code
  return (
    <div className="bot-code-block my-2 border border-gray-200 rounded overflow-hidden">
      {/* Header minimaliste */}
      <div className="bot-code-header flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          {iconUrl && <img src={iconUrl} alt={language} className="w-3.5 h-3.5" />}
          <span className="text-[11px] text-gray-500 font-mono">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {copied
            ? <><Check size={12} className="text-green-500" /><span className="text-green-500">Copié</span></>
            : <><Copy size={12} />Copier</>
          }
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        style={(isDark ? oneDark : oneLight) as any}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '12px 14px',
          background: isDark ? '#151922' : '#ffffff',
          color: isDark ? '#e5e7eb' : undefined,
          fontSize: '13px',
          lineHeight: '1.6',
          borderRadius: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface BotMessageProps {
  text: string;
  activeSpeechSentence?: string | null;
  activeSpeechWord?: string | null;
  activeSpeechWordIndex?: number | null;
}

export default function BotMessage({ text, activeSpeechSentence = null, activeSpeechWord = null, activeSpeechWordIndex = null }: BotMessageProps) {
  return (
    <div className="bot-message-content w-full min-w-0 max-w-full overflow-hidden text-[15px] text-gray-800 leading-relaxed break-words [overflow-wrap:anywhere] space-y-1.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphes
          p: ({ children }) => (
            <p className="bot-message-paragraph block w-full mb-1.5 last:mb-0 text-gray-800">
              <SpeechHighlightedText activeSentence={activeSpeechSentence} activeWord={activeSpeechWord} activeWordIndex={activeSpeechWordIndex}>{children}</SpeechHighlightedText>
            </p>
          ),

          // Titres
          h1: ({ children }) => (
            <h1 className="bot-message-heading text-[18px] font-semibold text-gray-900 mt-3 mb-1.5 border-b border-gray-200 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="bot-message-heading text-[16px] font-semibold text-gray-900 mt-2.5 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="bot-message-heading text-[14px] font-semibold text-gray-700 mt-2 mb-0.5">
              {children}
            </h3>
          ),

          // Listes
          ul: ({ children }) => (
            <ul className="ml-4 mb-1.5 space-y-0.5 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-4 mb-1.5 space-y-0.5 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="bot-message-list-item flex items-start gap-2 text-gray-800">
              <span className="mt-[9px] w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              <span>{children}</span>
            </li>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 py-0.5 my-1.5 text-gray-500 text-[14px] italic">
              {children}
            </blockquote>
          ),

          // Séparateur
          hr: () => (
            <hr className="my-2 border-none border-t border-gray-200" />
          ),

          // Gras / italique
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-600">{children}</em>
          ),

          // Lien
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
            >
              {children}
            </a>
          ),

          // Tableau
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-gray-200 rounded text-[13px]">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[12px] font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-gray-700 border-t border-gray-100 border-r border-gray-100 last:border-r-0">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-gray-50">{children}</tr>
          ),

          // Code
          code: BotCodeBlock,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
