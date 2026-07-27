import { useRef, useCallback, useEffect } from "react"

const DEBOUNCE_MS = 2500

export function useAutoSave(
  filePath: string | null,
  onDirtyChange: (dirty: boolean) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)

  const bufferKey = filePath ? `deck:buffer:${filePath}` : null

  const save = useCallback(
    async (content: string) => {
      if (!filePath) return
      try {
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content }),
        })
        lastSavedRef.current = content
        if (bufferKey) sessionStorage.removeItem(bufferKey)
        onDirtyChange(false)
      } catch (e) {
        console.error("Auto-save failed:", e)
      }
    },
    [filePath, bufferKey, onDirtyChange]
  )

  const bufferChange = useCallback(
    (content: string) => {
      if (!bufferKey) return

      sessionStorage.setItem(bufferKey, content)
      onDirtyChange(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => save(content), DEBOUNCE_MS)
    },
    [bufferKey, save, onDirtyChange]
  )

  const getBufferedContent = useCallback((): string | null => {
    if (!bufferKey) return null
    return sessionStorage.getItem(bufferKey)
  }, [bufferKey])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (bufferKey) {
          const buffered = sessionStorage.getItem(bufferKey)
          if (buffered && buffered !== lastSavedRef.current) {
            fetch("/api/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: filePath, content: buffered }),
            })
              .then(() => sessionStorage.removeItem(bufferKey))
              .catch(() => {})
          }
        }
      }
    }
  }, [filePath, bufferKey])

  return { bufferChange, getBufferedContent, saveNow: save }
}
