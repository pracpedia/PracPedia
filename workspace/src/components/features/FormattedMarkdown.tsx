'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface FormattedMarkdownProps {
  content: string;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="max-w-none text-slate-300 text-xs sm:text-[13.5px] leading-relaxed space-y-3 font-sans math-styled break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt }) => (
            <div className="my-4 mx-auto rounded-xl overflow-hidden border border-white/10 bg-slate-950 p-2 max-w-2xl max-w-full shadow-xl shadow-black/40">
              <img
                src={src as string}
                alt={alt || "Explanation Graph"}
                className="w-full max-h-[360px] object-contain mx-auto rounded-lg select-none max-w-full"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              {alt && (
                <div className="text-center text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-wider font-semibold break-words">
                  📊 {alt}
                </div>
              )}
            </div>
          ),
          h1: ({ children }) => (
            <h1 className="text-sm sm:text-base font-black text-white mt-1.5 mb-1 pb-1 border-b border-white/5 flex items-center gap-2 break-words">
              <span className="w-1.5 h-4 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-full shrink-0" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs sm:text-[12px] font-extrabold tracking-wider text-cyan-400 uppercase font-mono mt-2 mb-1 flex items-center gap-1.5 break-words">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[12px] font-bold text-[#fbbf24] mt-2 mb-1 flex items-center gap-1 font-mono break-words">
              {children}
            </h3>
          ),
          p: ({ children }) => {
            return <div className="text-slate-300 leading-relaxed font-normal mb-1.5 break-words">{children}</div>;
          },
          ul: ({ children }) => (
            <ul className="space-y-1 my-1.5 pl-1 break-words">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 my-1.5 pl-5 text-slate-300 break-words">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-1.5 ml-1 font-sans break-words">
              <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0 animate-pulse" />
              <div className="flex-1 text-slate-300 font-medium break-words">{children}</div>
            </li>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded bg-slate-900 border border-white/10 text-cyan-400 font-mono text-[11px] break-words" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-2 p-2 rounded-xl bg-slate-950/80 border border-cyan-500/15 font-mono text-cyan-300 select-all overflow-x-auto text-[11px] leading-relaxed shadow-inner max-w-full">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          strong: ({ children }) => (
            <strong className="text-amber-300 font-bold break-words">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500/50 pl-2 py-0.5 my-1.5 text-slate-400 italic break-words">
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
