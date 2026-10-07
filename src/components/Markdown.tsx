"use client";

import React from "react";

// Lightweight markdown renderer: # / ## / ### headings, - bullets, 1. lists,
// **bold**, *italic*, [text](url), bare URLs, --- rule. Plain-text safe.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Tokenize: links first, then bold/italic inside
  const nodes: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = linkRe.exec(text))) {
    if (m.index > last) nodes.push(...renderEmphasis(text.slice(last, m.index), `${keyBase}-t${i}`));
    const label = m[1];
    const url = m[2] || m[3];
    nodes.push(
      <a
        key={`${keyBase}-a${i}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-500"
      >
        {label || url}
      </a>
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(...renderEmphasis(text.slice(last), `${keyBase}-e`));
  return nodes;
}

function renderEmphasis(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, idx) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${keyBase}-${idx}`} className="font-semibold text-slate-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return (
        <em key={`${keyBase}-${idx}`} className="italic">
          {p.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={`${keyBase}-${idx}`}>{p}</React.Fragment>;
  });
}

export default function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = (text || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="leading-relaxed">
        {renderInline(it, `l${key}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="ml-5 list-decimal space-y-1 text-sm text-slate-700">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="ml-5 list-disc space-y-1 text-sm text-slate-700">
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();

    if (!line.trim()) {
      blocks.push(<div key={key++} className="h-2" />);
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={key++} className="mt-3 text-sm font-bold text-slate-900">
          {renderInline(line.slice(4), `h4${key}`)}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key++} className="mt-3 border-b border-slate-100 pb-1 text-base font-bold text-slate-900">
          {renderInline(line.slice(3), `h3${key}`)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={key++} className="mt-4 border-b border-slate-200 pb-1 text-lg font-bold text-slate-900">
          {renderInline(line.slice(2), `h2${key}`)}
        </h2>
      );
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-3 border-slate-200" />);
      continue;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-slate-700">
        {renderInline(line, `p${key}`)}
      </p>
    );
  }
  flushList();

  return <div className={className}>{blocks}</div>;
}
