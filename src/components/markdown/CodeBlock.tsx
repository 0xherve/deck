import { useEffect, useState, useCallback } from "react"
import { IconCheck, IconCopy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { MermaidDiagram } from "@/components/markdown/MermaidDiagram"

let highlighterPromise: ReturnType<typeof loadHighlighter> | null = null

async function loadHighlighter() {
  const { getSingletonHighlighter } = await import("shiki")
  return getSingletonHighlighter({
    themes: ["github-dark", "github-light"],
    langs: [],
  })
}

function getHighlighter() {
  if (!highlighterPromise) highlighterPromise = loadHighlighter()
  return highlighterPromise
}

interface CodeBlockProps {
  code: string
  lang: string
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (lang === "mermaid") return
    let cancelled = false

    getHighlighter().then(async (highlighter) => {
      const loaded = highlighter.getLoadedLanguages()
      if (lang && !loaded.includes(lang)) {
        try {
          await highlighter.loadLanguage(lang as never)
        } catch {
          // Unknown language: fall back to plain text.
        }
      }
      if (cancelled) return
      try {
        setHtml(
          highlighter.codeToHtml(code, {
            lang: highlighter.getLoadedLanguages().includes(lang) ? lang : "text",
            theme: isDark ? "github-dark" : "github-light",
          })
        )
      } catch {
        setHtml(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [code, lang, isDark])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  if (lang === "mermaid") {
    return <MermaidDiagram code={code} />
  }

  return (
    <div className="group/code relative my-4">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/code:opacity-100"
      >
        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      </Button>
      {html ? (
        <div
          className="[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:text-sm [&_pre]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
