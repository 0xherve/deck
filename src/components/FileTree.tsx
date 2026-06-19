import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

type TreeEntry = {
  name: string
  type: "file" | "directory"
  path: string
  children?: TreeEntry[]
}

function TreeNode({ entry, depth }: { entry: TreeEntry; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const isMarkdown = /\.mdx?$/.test(entry.name)

  if (entry.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              expanded && "rotate-90"
            )}
          />
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => navigate({ to: `/v/${entry.path}` })}
      className={cn(
        "flex w-full items-center gap-1 rounded px-2 py-1 text-sm hover:bg-sidebar-accent",
        isMarkdown ? "text-sidebar-primary" : "text-sidebar-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="h-3.5 w-3.5 shrink-0" />
      <File className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{entry.name}</span>
    </button>
  )
}

export function FileTree() {
  const [tree, setTree] = useState<TreeEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/tree")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setTree(data))
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <p className="px-3 py-2 text-xs text-destructive">
        Failed to load file tree
      </p>
    )
  }

  if (tree.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map((entry) => (
        <TreeNode key={entry.path} entry={entry} depth={0} />
      ))}
    </div>
  )
}
