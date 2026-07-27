import { Link } from "@tanstack/react-router"
import { IconGitCommit } from "@tabler/icons-react"
import { useResource } from "@/hooks/useResource"

interface Commit {
  hash: string
  shortHash: string
  author: string
  date: string
  subject: string
}

export function HistoryRoute() {
  const { data: commits, loading, error } = useResource<Commit[]>("/api/git-log", { as: "json" })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <span className="font-medium text-sm">History</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading history...
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && commits?.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No commits yet
          </div>
        )}
        {commits?.map((commit) => (
          <Link
            key={commit.hash}
            to="/h/$"
            params={{ _splat: commit.hash }}
            className="flex items-start gap-2 border-b border-border px-4 py-2 text-sm hover:bg-sidebar-accent"
          >
            <IconGitCommit size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate">{commit.subject}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{commit.shortHash}</span>
                {" · "}
                <span>{commit.author}</span>
                {" · "}
                <span>{new Date(commit.date).toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
