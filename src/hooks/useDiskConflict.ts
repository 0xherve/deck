import { useState, useEffect, useCallback, useRef } from "react"
import { useWatch } from "@/hooks/useWatch"
import { discardBuffer } from "@/lib/file-buffer"

export function useDiskConflict(
  filePath: string | null,
  dirty: boolean,
  refetch: () => void,
  onResolved: () => void
) {
  const [change, setChange] = useState<{ filePath: string | null; changed: boolean }>({
    filePath: null,
    changed: false,
  })
  const dirtyRef = useRef(dirty)
  const changedOnDisk = change.filePath === filePath ? change.changed : false

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useWatch(
    useCallback(
      (e) => {
        if (!filePath || e.path !== filePath) return
        if (dirtyRef.current) {
          setChange({ filePath, changed: true })
        } else {
          setChange({ filePath, changed: false })
          refetch()
        }
      },
      [filePath, refetch]
    )
  )

  const reload = useCallback(() => {
    setChange({ filePath, changed: false })
    if (filePath) discardBuffer(filePath)
    onResolved()
    refetch()
  }, [filePath, onResolved, refetch])

  return { changedOnDisk, reload }
}
