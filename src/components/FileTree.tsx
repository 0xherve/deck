import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react"
import { themeToTreeStyles, type TreeThemeStyles } from "@pierre/trees"
import type { GitStatus, GitStatusEntry as PierreGitStatusEntry } from "@pierre/trees"
import { resolveTheme } from "@pierre/diffs"
import { useTheme } from "@/components/theme-provider"
import { tokensFor } from "@/lib/theme-tokens"
import type { GitStatusEntry } from "@/hooks/useGitStatus"
import { useWatch } from "@/hooks/useWatch"

interface TreeEntry {
  name: string
  path: string
  type: "file" | "directory"
}

function toModelPath(entry: TreeEntry): string {
  return entry.type === "directory" ? `${entry.path}/` : entry.path
}

async function fetchDir(dirPath: string): Promise<TreeEntry[]> {
  const url = dirPath ? `/api/tree?path=${encodeURIComponent(dirPath)}` : "/api/tree"
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function mapGitStatus(status: GitStatusEntry["status"]): GitStatus {
  switch (status) {
    case "A":
      return "added"
    case "D":
      return "deleted"
    case "U":
      return "untracked"
    default:
      return "modified"
  }
}

interface FileTreeProps {
  gitStatus?: GitStatusEntry[]
  /** Filter query, owned by the sidebar so the input can be styled as our own. */
  search?: string
}

export function FileTree({ gitStatus = [], search = "" }: FileTreeProps) {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as Record<string, string>
  const activePath = params._splat ?? ""
  const { resolvedTheme } = useTheme()
  const shikiTheme = tokensFor(resolvedTheme).shikiTheme
  const [treeStyle, setTreeStyle] = useState<TreeThemeStyles | undefined>(undefined)

  const loadedDirs = useRef<Set<string>>(new Set())
  const loadingDirs = useRef<Set<string>>(new Set())

  const pierreGitStatus = useMemo<PierreGitStatusEntry[]>(
    () => gitStatus.map((f) => ({ path: f.path, status: mapGitStatus(f.status) })),
    [gitStatus]
  )

  const { model } = useFileTree({
    paths: [],
    initialExpansion: "closed",
    // The tree's built-in search bar is suppressed; the sidebar renders its own
    // input and drives the model through setSearch.
    search: false,
    fileTreeSearchMode: "hide-non-matches",
    gitStatus: pierreGitStatus,
    onSelectionChange: (selectedPaths) => {
      const path = selectedPaths[0]
      if (!path) return
      const item = model.getItem(path)
      if (item && !item.isDirectory()) {
        navigate({ to: "/v/$", params: { _splat: path } })
      }
    },
  })

  const loadDir = useCallback(async (dirPath: string) => {
    if (loadedDirs.current.has(dirPath) || loadingDirs.current.has(dirPath)) return
    loadingDirs.current.add(dirPath)
    try {
      const entries = await fetchDir(dirPath)
      loadedDirs.current.add(dirPath)
      model.batch(entries.map((entry) => ({ path: toModelPath(entry), type: "add" as const })))
    } catch {
      // leave unloaded; a future expand attempt can retry
    } finally {
      loadingDirs.current.delete(dirPath)
    }
  }, [model])

  useEffect(() => {
    loadDir("")
  }, [loadDir])

  useEffect(() => {
    const unsubscribe = model.subscribe(() => {
      const total = model.getVisibleCount()
      const rows = model.getVisibleRows(0, total)
      for (const row of rows) {
        if (row.kind === "directory" && row.isExpanded) {
          loadDir(row.path)
        }
      }
    })
    return unsubscribe
  }, [model, loadDir])

  useEffect(() => {
    model.setGitStatus(pierreGitStatus)
  }, [model, pierreGitStatus])

  useEffect(() => {
    model.setSearch(search.trim() || null)
  }, [model, search])

  useWatch(
    useCallback(
      (e) => {
        // Only structural changes (create/delete/rename) affect the tree
        // shape; plain content edits don't need a tree refresh.
        if (e.event !== "rename") return
        const dirPath = e.path.includes("/") ? e.path.slice(0, e.path.lastIndexOf("/")) : ""
        loadedDirs.current.delete(dirPath)
        loadDir(dirPath)
      },
      [loadDir]
    )
  )

  useEffect(() => {
    if (!activePath) return
    model.focusPath(activePath)
    model.scrollToPath(activePath, { focus: false })
  }, [model, activePath])

  useEffect(() => {
    let cancelled = false
    resolveTheme(shikiTheme).then((resolved) => {
      if (cancelled) return
      setTreeStyle(themeToTreeStyles(resolved))
    })
    return () => {
      cancelled = true
    }
  }, [shikiTheme])

  // The tree ships its own shiki-derived palette; the -override vars pin its
  // surface colors to deck's so there is a single visual system.
  const deckOverrides = {
    // themeToTreeStyles emits literal background/color/border declarations from
    // the shiki theme, which outrank the --*-override vars below. Neutralize
    // them so the tree paints on the sidebar's own surface.
    backgroundColor: "transparent",
    color: "var(--color-sidebar-foreground)",
    borderColor: "transparent",
    "--trees-bg-override": "var(--color-sidebar)",
    "--trees-bg-muted-override": "var(--color-sidebar-accent)",
    "--trees-fg-override": "var(--color-sidebar-foreground)",
    "--trees-fg-muted-override": "var(--color-muted-foreground)",
    "--trees-accent-override": "var(--color-primary)",
    // The tree is the sidebar's main surface, not a card inside it: drop its
    // own frame so it reads as one panel rather than a box within a box.
    "--trees-border-color-override": "transparent",
    "--trees-border-radius-override": "0px",
  } as React.CSSProperties

  return (
    <div className="h-full">
      <PierreFileTree
        model={model}
        style={{ height: "100%", ...treeStyle, ...deckOverrides }}
      />
    </div>
  )
}
