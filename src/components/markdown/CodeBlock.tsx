import { useEffect, useState, useCallback } from "react"
import { IconCheck, IconCopy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { tokensFor } from "@/lib/theme-tokens"

const htmlCache = new Map<string, string>()

async function highlight(code: string, lang: string): Promise<string> {
  const light = tokensFor("light").shikiTheme
  const dark = tokensFor("dark").shikiTheme
  const { getSingletonHighlighter } = await import("shiki")
  const highlighter = await getSingletonHighlighter({
    themes: [light, dark],
    langs: [],
  })

  let resolvedLang = lang
  if (lang && !highlighter.getLoadedLanguages().includes(lang)) {
    try {
      await highlighter.loadLanguage(lang as never)
    } catch {
      resolvedLang = "text"
    }
  }

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    themes: { light, dark },
  })
}

interface CodeBlockProps {
  code: string
  lang: string
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const cacheKey = `${lang} ${code}`
  const [html, setHtml] = useState<string | null>(() => htmlCache.get(cacheKey) ?? null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (htmlCache.has(cacheKey)) return
    let cancelled = false

    highlight(code, lang)
      .then((result) => {
        htmlCache.set(cacheKey, result)
        if (!cancelled) setHtml(result)
      })
      .catch(() => {
        if (!cancelled) setHtml(null)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, code, lang])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

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
          <code className="text-foreground">{code}</code>
        </pre>
      )}
    </div>
  )
}
