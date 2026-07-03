import { useState, useEffect } from "react"

interface FileMeta {
  size: number
  isImage: boolean
  isBinary: boolean
  ext: string
}

export function useFileMeta(filePath: string | null) {
  const [meta, setMeta] = useState<FileMeta | null>(null)

  useEffect(() => {
    if (!filePath) return
    let cancelled = false

    fetch(`/api/file-meta?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data) setMeta(data)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [filePath])

  return meta
}
