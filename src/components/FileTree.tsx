import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useVirtualizer } from "@tanstack/react-virtual"
import { IconChevronRight, IconFile, IconFolder } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { GitStatusEntry } from "@/hooks/useGitStatus"

type TreeEntry = {
  name: string
  type: "file" | "directory"
  path: string
  children?: TreeEntry[]
}

type FlatRow = {
  entry: TreeEntry
  depth: number
}

function flattenTree(
  entries: TreeEntry[],
  expanded: Set<string>,
  depth: number = 0
): FlatRow[] {
  const rows: FlatRow[] = []
  for (const entry of entries) {
    rows.push({ entry, depth })
    if (entry.type === "directory" && expanded.has(entry.path) && entry.children) {
      rows.push(...flattenTree(entry.children, expanded, depth + 1))
    }
  }
  return rows
}

interface FileTreeProps {
  gitStatus?: GitStatusEntry[]
}

export function FileTree({ gitStatus = [] }: FileTreeProps) {
  const [tree, setTree] = useState<TreeEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of gitStatus) map.set(f.path, f.status)
    return map
  }, [gitStatus])

  const flatRows = useMemo(() => flattenTree(tree, expanded), [tree, expanded])

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  })

  const toggleDir = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  useEffect(() => {
    const fetchTree = () =>
      fetch("/api/tree")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data) => setTree(data))
        .catch((err) => setError(err.message))

    fetchTree()

    const es = new EventSource("/api/watch")
    es.onmessage = () => { fetchTree() }
    es.onerror = () => { es.close() }

    return () => { es.close() }
  }, [])

  if (error) {
    return <p className="px-3 py-2 text-xs text-destructive">Failed to load file tree</p>
  }

  if (tree.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">Loading...</p>
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { entry, depth } = flatRows[virtualRow.index]
          const isDir = entry.type === "directory"
          const status = statusMap.get(entry.path)

          if (isDir) {
            const isExpanded = expanded.has(entry.path)
            return (
              <button
                key={entry.path}
                onClick={() => toggleDir(entry.path)}
                className="absolute left-0 flex w-full items-center gap-2 px-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
                style={{
                  top: `${virtualRow.start}px`,
                  height: "32px",
                  paddingLeft: `${depth * 16 + 8}px`,
                }}
              >
                <IconChevronRight
                  size={14}
                  className={cn(
                    "shrink-0 text-muted-foreground/60 transition-transform duration-150",
                    isExpanded && "rotate-90"
                  )}
                />
                <IconFolder size={16} className="shrink-0 text-muted-foreground/70" />
                <span className="truncate">{entry.name}</span>
              </button>
            )
          }

          return (
            <button
              key={entry.path}
              onClick={() => navigate({ to: "/v/$", params: { _splat: entry.path } })}
              className="absolute left-0 flex w-full items-center gap-2 px-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
              style={{
                top: `${virtualRow.start}px`,
                height: "32px",
                paddingLeft: `${depth * 16 + 24}px`,
              }}
            >
              <IconFile size={16} className="shrink-0 text-muted-foreground/60" />
              <span className="truncate flex-1 text-left">{entry.name}</span>
              {status && (
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{status}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
