import { useEffect, useId, useRef, useState } from "react"
import { useTheme } from "@/components/theme-provider"

interface MermaidDiagramProps {
  code: string
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "-")
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  useEffect(() => {
    let cancelled = false

    import("mermaid").then(async ({ default: mermaid }) => {
      if (cancelled) return
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "strict",
      })
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, code)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render diagram")
      }
    })

    return () => {
      cancelled = true
    }
  }, [code, id, isDark])

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-destructive">
        {error}
      </pre>
    )
  }

  return <div ref={containerRef} className="my-4 flex justify-center [&_svg]:max-w-full" />
}
