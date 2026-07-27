import { useParams, useSearch } from "@tanstack/react-router"
import { DiffViewer } from "@/components/DiffViewer"
import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"
import { useResource } from "@/hooks/useResource"

export function DiffViewRoute() {
  const params = useParams({ strict: false })
  const search = useSearch({ strict: false }) as Record<string, string>
  const filePath = (params as Record<string, string>)._splat ?? ""
  const staged = search.staged === "1"
  const url = filePath
    ? `/api/git-diff?path=${encodeURIComponent(filePath)}${staged ? "&staged=1" : ""}`
    : "/api/git-diff"
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
          <span className="font-medium">Git Diff</span>
          <span className="text-muted-foreground">{filePath || "HEAD"}</span>
          {filePath && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {staged ? "Staged" : "Unstaged"}
            </span>
          )}
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
