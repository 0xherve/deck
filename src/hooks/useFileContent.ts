import { useState, useEffect, useRef } from "react"

export function useFileContent(filePath: string | null) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!filePath) return

    let cancelled = false

    setContent(null)
    setError(null)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!cancelled) setLoading(true)
    }, 150)

    fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)
        return res.text()
      })
      .then((text) => {
        if (cancelled) return
        if (timerRef.current) clearTimeout(timerRef.current)
        setContent(text)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        if (timerRef.current) clearTimeout(timerRef.current)
        setError(e.message)
        setLoading(false)
      })

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [filePath])

  return { content, loading, error }
}
