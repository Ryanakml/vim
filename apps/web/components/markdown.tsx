"use client";

import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@workspace/ui/lib/utils";
import { FileText } from "lucide-react";

interface MarkdownProps {
  content: string;
  className?: string;
}

// Component for rendering inline knowledge badge [[Document Name]]
function KnowledgeBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/30 transition-colors">
      <FileText className="h-3 w-3" />
      {name}
    </span>
  );
}

// Custom text renderer to detect and render knowledge badges
function renderTextWithBadges(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string") return text;

  const parts: React.ReactNode[] = [];
  const badgePattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = badgePattern.exec(text)) !== null) {
    // Add text before badge
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add badge - match[1] is guaranteed to exist due to the regex pattern
    const documentName = match[1];
    if (documentName) {
      parts.push(
        <KnowledgeBadge key={`badge-${match.index}`} name={documentName} />,
      );
    }

    lastIndex = badgePattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Custom components for markdown elements
const markdownComponents: Components = {
  // Headings
  h1: ({ node, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-3 scroll-m-20" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xl font-bold mt-5 mb-2 scroll-m-20" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 scroll-m-20" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h4 className="text-base font-semibold mt-3 mb-2" {...props} />
  ),
  h5: ({ node, ...props }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1" {...props} />
  ),
  h6: ({ node, ...props }) => (
    <h6
      className="text-xs font-semibold mt-2 mb-1 text-muted-foreground"
      {...props}
    />
  ),

  // Paragraphs and text
  p: ({ node, children, ...props }) => (
    <p className="leading-7 mb-3 [&:not(:first-child)]:mt-0" {...props}>
      {Array.isArray(children)
        ? children.map((child, idx) =>
            typeof child === "string" ? (
              <React.Fragment key={idx}>
                {renderTextWithBadges(child)}
              </React.Fragment>
            ) : (
              child
            ),
          )
        : renderTextWithBadges(children)}
    </p>
  ),

  // Links
  a: ({ node, ...props }) => (
    <a
      className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),

  // Lists
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside space-y-2 mb-3 ml-2" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside space-y-2 mb-3 ml-2" {...props} />
  ),
  li: ({ node, children, ...props }) => (
    <li className="text-sm leading-6" {...props}>
      {Array.isArray(children)
        ? children.map((child, idx) =>
            typeof child === "string" ? (
              <React.Fragment key={idx}>
                {renderTextWithBadges(child)}
              </React.Fragment>
            ) : (
              child
            ),
          )
        : renderTextWithBadges(children)}
    </li>
  ),

  // Code blocks
  code: ((props: any) => {
    const { node, inline, children, ...rest } = props;
    if (inline) {
      return (
        <code
          className="relative rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-muted-foreground"
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="relative block rounded-lg bg-muted px-4 py-3 font-mono text-sm overflow-x-auto"
        {...rest}
      >
        {children}
      </code>
    );
  }) as any,

  pre: ({ node, ...props }) => (
    <pre
      className="relative rounded-lg bg-muted border border-border overflow-x-auto mb-4"
      {...props}
    />
  ),

  // Blockquotes
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-primary pl-4 py-1 mb-4 italic text-muted-foreground"
      {...props}
    />
  ),

  // Horizontal rule
  hr: ({ node, ...props }) => <hr className="my-4 border-border" {...props} />,

  // Tables (from remark-gfm)
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-muted border-b border-border" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-border" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr
      className="border-b border-border hover:bg-muted/50 transition-colors"
      {...props}
    />
  ),
  td: ({ node, ...props }) => <td className="px-3 py-2 text-sm" {...props} />,
  th: ({ node, ...props }) => (
    <th className="px-3 py-2 text-left font-semibold text-sm" {...props} />
  ),

  // Emphasis
  strong: ({ node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,

  // Strikethrough
  del: ({ node, ...props }) => (
    <del className="line-through text-muted-foreground" {...props} />
  ),

  // Images
  img: ({ node, ...props }) => (
    <img className="rounded-lg max-w-full h-auto my-4" {...props} />
  ),

  // Line breaks
  br: () => <br className="my-1" />,
};

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert prose-zinc max-w-none",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
