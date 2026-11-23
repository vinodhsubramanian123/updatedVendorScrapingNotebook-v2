import React from 'react';

function renderInlineTokens(text, keyPrefix) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|(?<![\w/])_[^_\n]+_(?![\w/]))/g;
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold text-inherit">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${idx++}`} className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5 break-all">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('_') && token.endsWith('_')) {
      parts.push(
        <em key={`${keyPrefix}-i-${idx++}`} className="italic text-slate-500">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/**
 * Lightweight, XSS-safe Markdown renderer (headings, bold, inline code, bullet lists).
 */
export default function MarkdownText({ text, className = '' }) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let listItems = [];

  const flushList = (keyIdx) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${keyIdx}`} className="list-disc pl-4 space-y-0.5 my-1">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineTokens(item, `li-${keyIdx}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(idx);
      return;
    }
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      flushList(idx);
      blocks.push(
        <div key={`h-${idx}`} className="font-bold mt-1.5 mb-0.5 text-inherit">
          {renderInlineTokens(headingMatch[1], `h-${idx}`)}
        </div>
      );
      return;
    }
    const quoteMatch = line.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushList(idx);
      blocks.push(
        <blockquote key={`q-${idx}`} className="my-1 border-l-2 border-blue-300 bg-blue-50/50 pl-2.5 py-1 text-slate-600 rounded-r">
          {renderInlineTokens(quoteMatch[1], `q-${idx}`)}
        </blockquote>
      );
      return;
    }
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }
    flushList(idx);
    blocks.push(
      <p key={`p-${idx}`} className="my-0.5">
        {renderInlineTokens(line, `p-${idx}`)}
      </p>
    );
  });
  flushList(lines.length);

  return <div className={className}>{blocks}</div>;
}
