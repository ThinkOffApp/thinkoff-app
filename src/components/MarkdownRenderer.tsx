import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Render LaTeX math to HTML
function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#ff6b6b',
      trust: true,
    });
  } catch (e) {
    console.warn('KaTeX error:', e);
    return `<span class="text-red-400">${latex}</span>`;
  }
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let key = 0;

    // Split by lines for block-level elements
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    let inDisplayMath = false;
    let mathContent = '';

    for (const line of lines) {
      // Display math blocks: $$...$$
      if (line.trim() === '$$') {
        if (inDisplayMath) {
          // End of math block
          const html = renderMath(mathContent.trim(), true);
          elements.push(
            <div
              key={key++}
              className="my-4 text-center overflow-x-auto py-2"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
          mathContent = '';
        }
        inDisplayMath = !inDisplayMath;
        continue;
      }

      if (inDisplayMath) {
        mathContent += line + '\n';
        continue;
      }

      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={key++} className="bg-black/30 p-3 rounded-lg my-2 overflow-x-auto">
              <code className="text-sm font-mono text-green-300">{codeContent}</code>
            </pre>
          );
          codeContent = '';
        }
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      // Headings
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={key++} className="text-base font-bold mt-2 mb-1">{parseInline(line.slice(5))}</h4>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg font-bold mt-3 mb-1">{parseInline(line.slice(4))}</h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-xl font-bold mt-4 mb-2">{parseInline(line.slice(3))}</h2>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key++} className="text-2xl font-bold mt-4 mb-2">{parseInline(line.slice(2))}</h1>
        );
        continue;
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={key++} className="ml-4 list-disc">{parseInline(line.trim().slice(2))}</li>
        );
        continue;
      }

      // Numbered lists
      const numberedMatch = line.trim().match(/^(\d+)\.\s(.*)$/);
      if (numberedMatch) {
        elements.push(
          <li key={key++} className="ml-4 list-decimal">{parseInline(numberedMatch[2])}</li>
        );
        continue;
      }

      // Regular paragraph
      if (line.trim()) {
        elements.push(
          <p key={key++} className="mb-2">{parseInline(line)}</p>
        );
      }
    }

    return elements;
  };

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Display math: $$...$$ (inline single-line)
      const displayMathMatch = remaining.match(/^\$\$(.+?)\$\$/);
      if (displayMathMatch) {
        const html = renderMath(displayMathMatch[1], true);
        parts.push(
          <span
            key={key++}
            className="block my-2 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        remaining = remaining.slice(displayMathMatch[0].length);
        continue;
      }

      // LaTeX display math: \[...\]
      const latexDisplayMatch = remaining.match(/^\\\[(.+?)\\\]/);
      if (latexDisplayMatch) {
        const html = renderMath(latexDisplayMatch[1], true);
        parts.push(
          <span
            key={key++}
            className="block my-2 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        remaining = remaining.slice(latexDisplayMatch[0].length);
        continue;
      }

      // LaTeX inline math: \(...\)
      const latexInlineMatch = remaining.match(/^\\\((.+?)\\\)/);
      if (latexInlineMatch) {
        const html = renderMath(latexInlineMatch[1], false);
        parts.push(
          <span
            key={key++}
            className="inline-block align-middle mx-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        remaining = remaining.slice(latexInlineMatch[0].length);
        continue;
      }

      // Inline math: $...$ (not followed by space, must have closing $)
      // Be careful not to match currency like "$5" alone
      const inlineMathMatch = remaining.match(/^\$([^$\s][^$]*?)\$/);
      if (inlineMathMatch) {
        const html = renderMath(inlineMathMatch[1], false);
        parts.push(
          <span
            key={key++}
            className="inline-block align-middle mx-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        remaining = remaining.slice(inlineMathMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
      if (boldMatch) {
        parts.push(
          <strong key={key++} className="font-bold">
            {parseInline(boldMatch[1] || boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_ (but not inside math)
      const italicMatch = remaining.match(/^\*([^*]+?)\*|^_([^_]+?)_/);
      if (italicMatch) {
        parts.push(
          <em key={key++} className="italic">
            {parseInline(italicMatch[1] || italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-pink-300">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = remaining.match(/^~~(.+?)~~/);
      if (strikeMatch) {
        parts.push(
          <span key={key++} className="line-through text-gray-500">
            {strikeMatch[1]}
          </span>
        );
        remaining = remaining.slice(strikeMatch[0].length);
        continue;
      }

      // Links: [text](url)
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular character
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return parts;
  };

  return (
    <div className={`markdown-content ${className}`}>
      {renderMarkdown(content)}
    </div>
  );
}
