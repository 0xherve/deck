import { useEffect, useId, useRef, useState } from "react"
import { useTheme } from "@/components/theme-provider"

interface MermaidDiagramProps {
  code: string
}

type Mermaid = typeof import("mermaid").default

let mermaidPromise: Promise<Mermaid> | null = null
let configuredTheme: string | null = null

async function getMermaid(theme: "dark" | "default"): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => mermaid)
  }
  const mermaid = await mermaidPromise
  if (configuredTheme !== theme) {
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict" })
    configuredTheme = theme
  }
  return mermaid
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "-")
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    let cancelled = false

    getMermaid(resolvedTheme === "dark" ? "dark" : "default").then(async (mermaid) => {
      if (cancelled) return
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
  }, [code, id, resolvedTheme])

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-destructive">
        {error}
      </pre>
    )
  }

  return <div ref={containerRef} className="my-4 flex justify-center [&_svg]:max-w-full" />
}
