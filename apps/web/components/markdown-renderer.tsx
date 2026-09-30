"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { assetUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

interface MarkdownRendererProps {
  content: string
  className?: string
  /**
   * Inline mode for short text such as answer options: no block margins, paragraphs render as
   * spans, and images stay small.
   */
  inline?: boolean
}

const hasCode = (text: string) => text.includes("```") || /`[^`]+`/.test(text)

export function MarkdownRenderer({ content, className, inline = false }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Syntax highlighting only when there is code, so plain questions don't load Prism
    if (!hasCode(content) || !containerRef.current) return
    let cancelled = false
    const highlightCode = async () => {
      const Prism = (await import("prismjs")).default
      // Order matters: tsx needs jsx and typescript, cpp needs c
      await import("prismjs/components/prism-javascript")
      await import("prismjs/components/prism-typescript")
      await import("prismjs/components/prism-jsx")
      await import("prismjs/components/prism-tsx")
      await import("prismjs/components/prism-css")
      await import("prismjs/components/prism-python")
      await import("prismjs/components/prism-java")
      await import("prismjs/components/prism-c")
      await import("prismjs/components/prism-cpp")
      await import("prismjs/themes/prism.css")
      if (!cancelled && containerRef.current) Prism.highlightAllUnder(containerRef.current)
    }
    highlightCode()
    return () => {
      cancelled = true
    }
  }, [content])

  const Wrapper = inline ? "span" : "div"
  return (
    <Wrapper ref={containerRef as React.Ref<HTMLDivElement & HTMLSpanElement>} className={cn("markdown-body", inline && "inline", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
          p: ({ node, ...props }) => (inline ? <span {...props} /> : <p className="my-3 leading-relaxed" {...props} />),
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-violet-700 underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-violet-200 pl-4 italic my-4 text-slate-600" {...props} />
          ),
          // react-markdown 10 no longer passes `inline`; the code renderer below draws its own <pre>
          pre: ({ children }) => <>{children}</>,
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "")
            const isBlock = Boolean(match) || String(children).includes("\n")
            return isBlock ? (
              <pre className={`language-${match?.[1] ?? "text"} rounded-lg p-4 my-4 overflow-auto bg-slate-50 text-sm ring-1 ring-inset ring-slate-200`}>
                <code className={`language-${match?.[1] ?? "text"}`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-slate-100 rounded px-1 py-0.5 text-[0.9em]" {...props}>
                {children}
              </code>
            )
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse overflow-hidden rounded-lg text-sm ring-1 ring-slate-200" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-slate-200 last:border-0" {...props} />,
          th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold text-slate-700" {...props} />,
          td: ({ node, ...props }) => <td className="px-3 py-2 tabular-nums" {...props} />,
          // Question images are stored by the API; relative /api/... paths point at it
          img: ({ node, src, alt, ...props }) => (
            <img
              {...props}
              src={assetUrl(typeof src === "string" ? src : undefined)}
              alt={alt ?? ""}
              loading="lazy"
              decoding="async"
              className={cn(
                "h-auto rounded-lg ring-1 ring-slate-200",
                inline ? "inline-block max-h-24 align-middle" : "my-4 max-h-[28rem] max-w-full bg-white"
              )}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Wrapper>
  )
}
