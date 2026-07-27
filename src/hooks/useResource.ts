import { useState, useEffect, useRef, useCallback } from "react"

type ResponseFormat = "text" | "json"

interface UseResourceOptions {
  as?: ResponseFormat
  loadingDelayMs?: number
}

interface UseResourceResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useResource<T>(
  url: string | null,
  { as = "text", loadingDelayMs = 0 }: UseResourceOptions = {}
): UseResourceResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!url) return

    let cancelled = false

    setData(null)
    setError(null)

    if (loadingDelayMs > 0) {
      timerRef.current = setTimeout(() => {
        if (!cancelled) setLoading(true)
      }, loadingDelayMs)
    } else {
      setLoading(true)
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)
        return as === "json" ? res.json() : res.text()
      })
      .then((result: T) => {
        if (cancelled) return
        if (timerRef.current) clearTimeout(timerRef.current)
        setData(result)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        if (timerRef.current) clearTimeout(timerRef.current)
        setError(e instanceof Error ? e.message : "Request failed")
        setLoading(false)
      })

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url, nonce, as, loadingDelayMs])

  return { data, loading, error, refetch }
}
