'use client';

import type { ReactNode } from 'react';
import AppleEmojiText from '@/components/chat/AppleEmojiText';

interface SpeechHighlightedTextProps {
  children: ReactNode;
  activeSentence?: string | null;
  activeWord?: string | null;
  activeWordIndex?: number | null;
}

function findSentence(text: string, activeSentence: string): { start: number; end: number } | null {
  const candidates = [activeSentence, activeSentence.replace(/[*_`#]/g, '')]
    .map(value => value.trim())
    .filter(Boolean);
  const normalizedText = text.toLocaleLowerCase();

  for (const candidate of candidates) {
    const start = normalizedText.indexOf(candidate.toLocaleLowerCase());
    if (start >= 0) return { start, end: start + candidate.length };
  }
  return null;
}

function findWord(
  text: string,
  sentence: { start: number; end: number },
  activeWord: string,
  activeWordIndex: number | null | undefined,
) {
  const sentenceText = text.slice(sentence.start, sentence.end);
  const target = activeWord.toLocaleLowerCase();
  const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;
  let match: RegExpExecArray | null;
  let wordIndex = 0;

  while ((match = wordPattern.exec(sentenceText)) !== null) {
    const isTargetWord = match[0].toLocaleLowerCase() === target;
    const isTargetOccurrence = activeWordIndex === null || activeWordIndex === undefined || wordIndex === activeWordIndex;
    if (isTargetWord && isTargetOccurrence) {
      return {
        start: sentence.start + match.index,
        end: sentence.start + match.index + match[0].length,
      };
    }
    wordIndex += 1;
  }
  return null;
}

export default function SpeechHighlightedText({ children, activeSentence, activeWord, activeWordIndex }: SpeechHighlightedTextProps) {
  // Aucun état intermédiaire ne doit colorer la phrase entière : le rectangle
  // apparaît uniquement lorsqu’un mot précis est en train d’être prononcé.
  if (!activeSentence || !activeWord || typeof children !== 'string') return <>{children}</>;

  const sentenceMatch = findSentence(children, activeSentence);
  if (!sentenceMatch) return <>{children}</>;
  const wordMatch = findWord(children, sentenceMatch, activeWord, activeWordIndex);
  if (!wordMatch) return <>{children}</>;
  const match = wordMatch;

  return (
    <>
      <AppleEmojiText text={children.slice(0, match.start)} />
      <mark className="rounded bg-gray-300/80 px-0.5 text-inherit shadow-[0_0_0_2px_rgba(209,213,219,0.45)] transition-colors duration-150" aria-current="true">
        <AppleEmojiText text={children.slice(match.start, match.end)} />
      </mark>
      <AppleEmojiText text={children.slice(match.end)} />
    </>
  );
}
