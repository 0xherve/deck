import { useState, useEffect, useCallback, useRef } from "react"
import { useWatch } from "@/hooks/useWatch"
import { discardBuffer } from "@/lib/file-buffer"

export function useDiskConflict(
  filePath: string | null,
  dirty: boolean,
  refetch: () => void,
  onResolved: () => void
) {
  const [changedOnDisk, setChangedOnDisk] = useState(false)
  const dirtyRef = useRef(dirty)

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    setChangedOnDisk(false)
  }, [filePath])

  useWatch(
    useCallback(
      (e) => {
        if (!filePath || e.path !== filePath) return
        if (dirtyRef.current) {
          setChangedOnDisk(true)
        } else {
          setChangedOnDisk(false)
          refetch()
        }
      },
      [filePath, refetch]
    )
  )

  const reload = useCallback(() => {
    setChangedOnDisk(false)
    if (filePath) discardBuffer(filePath)
    onResolved()
    refetch()
  }, [filePath, onResolved, refetch])

  return { changedOnDisk, reload }
}
