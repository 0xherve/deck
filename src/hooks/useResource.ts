import { useState, useEffect, useRef, useCallback } from "react"

interface UseResourceOptions<T> {
  parse?: (res: Response) => Promise<T>
  loadingDelayMs?: number
}

interface UseResourceResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const defaultParse = async (res: Response) => (await res.text()) as unknown

export function useResource<T>(
  url: string | null,
  options: UseResourceOptions<T> = {}
): UseResourceResult<T> {
  const { parse = defaultParse as (res: Response) => Promise<T>, loadingDelayMs = 0 } = options
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
        return parse(res)
      })
      .then((result) => {
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
  }, [url, nonce, parse, loadingDelayMs])

  return { data, loading, error, refetch }
}
