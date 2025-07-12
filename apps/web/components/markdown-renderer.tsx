"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add syntax highlighting if needed
    const highlightCode = async () => {
      if (typeof window !== "undefined" && containerRef.current) {
        const Prism = (await import("prismjs")).default
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
        Prism.highlightAllUnder(containerRef.current)
      }
    }

    highlightCode()
  }, [content])

  return (
    <div ref={containerRef} className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="my-3 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "")
            return !inline && match ? (
              <pre className={`language-${match[1]} rounded-md p-4 my-4 overflow-auto`}>
                <code className={`language-${match[1]}`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-slate-100 rounded px-1 py-0.5 text-sm" {...props}>
                {children}
              </code>
            )
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-slate-100" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-slate-300" {...props} />,
          th: ({ node, ...props }) => <th className="border border-slate-300 px-4 py-2 text-left" {...props} />,
          td: ({ node, ...props }) => <td className="border border-slate-300 px-4 py-2" {...props} />,
          img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-md my-4" loading="lazy" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
