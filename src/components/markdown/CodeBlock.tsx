import { useEffect, useState, useCallback } from "react"
import { IconCheck, IconCopy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { tokensFor } from "@/lib/theme-tokens"

const htmlCache = new Map<string, string>()
const HTML_CACHE_LIMIT = 100

function readCachedHtml(key: string): string | null {
  const cached = htmlCache.get(key)
  if (!cached) return null

  htmlCache.delete(key)
  htmlCache.set(key, cached)
  return cached
}

function writeCachedHtml(key: string, html: string) {
  htmlCache.set(key, html)
  while (htmlCache.size > HTML_CACHE_LIMIT) {
    const oldest = htmlCache.keys().next().value
    if (!oldest) break
    htmlCache.delete(oldest)
  }
}

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
  const [htmlState, setHtmlState] = useState(() => ({
    cacheKey,
    html: readCachedHtml(cacheKey),
  }))
  const [copied, setCopied] = useState(false)
  const html = htmlState.cacheKey === cacheKey ? htmlState.html : readCachedHtml(cacheKey)

  if (htmlState.cacheKey !== cacheKey) {
    setHtmlState({ cacheKey, html })
  }

  useEffect(() => {
    if (html !== null) return
    let cancelled = false

    highlight(code, lang)
      .then((result) => {
        writeCachedHtml(cacheKey, result)
        if (!cancelled) setHtmlState({ cacheKey, html: result })
      })
      .catch(() => {
        if (!cancelled) setHtmlState({ cacheKey, html: null })
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, code, html, lang])

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
