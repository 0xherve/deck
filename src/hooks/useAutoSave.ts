import { useRef, useCallback, useEffect } from "react"
import { readBuffer, writeBuffer, saveFile } from "@/lib/file-buffer"

const DEBOUNCE_MS = 2500

export function useAutoSave(
  filePath: string | null,
  onDirtyChange: (dirty: boolean) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  const bufferedRef = useRef<string | null>(null)

  const save = useCallback(
    async (content: string) => {
      if (!filePath) return
      try {
        await saveFile(filePath, content)
        lastSavedRef.current = content
        bufferedRef.current = null
        onDirtyChange(false)
      } catch (e) {
        console.error("Auto-save failed:", e)
      }
    },
    [filePath, onDirtyChange]
  )

  const bufferChange = useCallback(
    (content: string) => {
      if (!filePath) return

      writeBuffer(filePath, content)
      bufferedRef.current = content
      onDirtyChange(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => save(content), DEBOUNCE_MS)
    },
    [filePath, save, onDirtyChange]
  )

  const getBufferedContent = useCallback((): string | null => {
    return filePath ? readBuffer(filePath) : null
  }, [filePath])

  useEffect(() => {
    return () => {
      if (!timerRef.current) return
      clearTimeout(timerRef.current)
      const buffered = bufferedRef.current
      if (filePath && buffered !== null && buffered !== lastSavedRef.current) {
        saveFile(filePath, buffered).catch(() => {})
      }
    }
  }, [filePath])

  return { bufferChange, getBufferedContent, saveNow: save }
}
