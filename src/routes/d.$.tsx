import { useState, useEffect, useCallback } from "react"
import { useParams } from "@tanstack/react-router"
import { DiffViewer } from "@/components/DiffViewer"
import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"

export function DiffViewRoute() {
  const params = useParams({ strict: false })
  const filePath = (params as Record<string, string>)._splat ?? ""
  const [patch, setPatch] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDiff = useCallback(() => {
    setLoading(true)
    setError(null)
    const url = filePath ? `/api/git-diff?path=${encodeURIComponent(filePath)}` : "/api/git-diff"
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch diff")
        return res.json()
      })
      .then((data: { patch: string }) => {
        setPatch(data.patch)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [filePath])

  useEffect(() => { fetchDiff() }, [fetchDiff])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Git Diff</span>
          <span className="text-muted-foreground">{filePath || "HEAD"}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={fetchDiff} disabled={loading}>
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading diff...
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && patch !== null && (
          <DiffViewer patch={patch} />
        )}
      </div>
    </div>
  )
}
