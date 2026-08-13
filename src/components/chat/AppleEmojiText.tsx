'use client';

import React, { type ReactNode } from 'react';
import { emojiByUnified } from 'emoji-picker-react';

const APPLE_EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/';

type AppleEmojiTextProps = {
  text: string;
  className?: string;
  large?: boolean;
  emojiOnly?: boolean;
};

const graphemeSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

function toUnified(value: string) {
  return Array.from(value)
    .map(character => character.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-');
}

function getEmojiImageUrl(value: string) {
  const unified = toUnified(value);
  const withoutVariationSelector = unified.replace(/-fe0f/g, '');
  const exactEmoji = emojiByUnified(unified);
  const emoji = exactEmoji || emojiByUnified(withoutVariationSelector);
  if (!emoji) return null;

  const imageUnified = exactEmoji ? unified : emoji.u;
  return `${APPLE_EMOJI_CDN}${imageUnified}.png`;
}

function splitGraphemes(text: string) {
  if (graphemeSegmenter) return Array.from(graphemeSegmenter.segment(text), part => part.segment);
  return Array.from(text);
}

export function hasAppleEmoji(text: string) {
  return splitGraphemes(text).some(segment => Boolean(getEmojiImageUrl(segment)));
}

export function isOnlyAppleEmoji(text: string) {
  const segments = splitGraphemes(text.trim()).filter(segment => !/^\s+$/u.test(segment));
  return segments.length > 0 && segments.every(segment => Boolean(getEmojiImageUrl(segment)));
}

export default function AppleEmojiText({ text, className, large: forceLarge, emojiOnly = false }: AppleEmojiTextProps) {
  const large = forceLarge ?? isOnlyAppleEmoji(text);
  const isEmojiOnlyLayout = emojiOnly && forceLarge !== false;
  const segments = splitGraphemes(isEmojiOnlyLayout ? text.trim() : text)
    .filter(segment => !isEmojiOnlyLayout || !/^\\s+$/u.test(segment));
  const content = segments.map((segment, index) => {
    const imageUrl = getEmojiImageUrl(segment);
    if (!imageUrl) return <span key={`${segment}-${index}`}>{segment}</span>;

    return (
      <img
        key={`${segment}-${index}`}
        src={imageUrl}
        alt={segment}
        title={segment}
        draggable={false}
        className={`inline-block ${isEmojiOnlyLayout ? 'h-[1.75em] w-[1.75em]' : large ? 'h-[2.15em] w-[2.15em]' : 'h-[1.15em] w-[1.15em]'} select-none object-contain ${isEmojiOnlyLayout ? 'align-middle' : 'align-[-0.16em]'}`}
      />
    );
  });

  return (
    <span className={`${isEmojiOnlyLayout ? 'inline-flex items-center gap-[0.2em] align-middle' : ''} ${className ?? ''}`.trim()}>
      {content}
    </span>
  );
}

function renderAppleEmojiNode(node: ReactNode, key: string): ReactNode {
  if (typeof node === 'string') return <AppleEmojiText key={key} text={node} />;
  if (Array.isArray(node)) return node.map((child, index) => renderAppleEmojiNode(child, `${key}-${index}`));
  if (React.isValidElement<{ children?: ReactNode }>(node)) {
    return React.cloneElement(node, {
      children: renderAppleEmojiNode(node.props.children, `${key}-children`),
    });
  }
  return node;
}

export function AppleEmojiNodes({ children }: { children: ReactNode }) {
  return <>{renderAppleEmojiNode(children, 'apple-emoji')}</>;
}
