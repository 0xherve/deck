import { useState, useEffect } from "react"

export interface GitStatusEntry {
  path: string
  status: "M" | "U" | "D" | "A"
}

export function useGitStatus() {
  const [files, setFiles] = useState<GitStatusEntry[]>([])

  useEffect(() => {
    let cancelled = false

    fetch("/api/git-status")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: GitStatusEntry[]) => {
        if (!cancelled) setFiles(data)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [])

  return files
}
