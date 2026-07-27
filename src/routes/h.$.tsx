import { useParams } from "@tanstack/react-router"
import { DiffViewer } from "@/components/DiffViewer"
import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"
import { useResource } from "@/hooks/useResource"

export function CommitDiffRoute() {
  const params = useParams({ strict: false })
  const hash = (params as Record<string, string>)._splat ?? ""
  const url = hash ? `/api/git-show?hash=${encodeURIComponent(hash)}` : null
  const {
    data,
    loading,
    error,
    refetch: fetchDiff,
  } = useResource<{ patch: string }>(url, { as: "json" })
  const patch = data?.patch ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Commit</span>
          <span className="font-mono text-muted-foreground">{hash.slice(0, 12)}</span>
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
