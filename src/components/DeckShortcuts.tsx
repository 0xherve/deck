import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTheme } from "@/components/theme-provider"
import { useSCPanel } from "@/routes/__root"
import { useTabs } from "@/stores/tabs"
import { triggerSave } from "@/stores/save-actions"
import { cn } from "@/lib/utils"
import { FileTypeIcon, splitFilePath } from "@/lib/file-icons"

type TreeEntry = {
  name: string
  path: string
  type: "file" | "directory"
  children?: TreeEntry[]
}

function flattenFiles(nodes: TreeEntry[]): string[] {
  const out: string[] = []
  for (const n of nodes) {
    if (n.type === "file") out.push(n.path)
    if (n.children) out.push(...flattenFiles(n.children))
  }
  return out
}

type PaletteItem = {
  id: string
  label: string
  hint?: string
  run: () => void
}

type Mode = "quick-open" | "palette" | null

export function DeckShortcuts() {
  const navigate = useNavigate()
  const { state, dispatch } = useTabs()
  const { setTheme, theme } = useTheme()
  const { toggle: toggleSC } = useSCPanel()
  const [mode, setMode] = useState<Mode>(null)
  const [query, setQuery] = useState("")
  const [files, setFiles] = useState<string[]>([])
  const [gitFiles, setGitFiles] = useState<string[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [currentBranch, setCurrentBranch] = useState("")
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const modeRef = useRef<Mode>(null)
  const indexRef = useRef(0)

  modeRef.current = mode
  indexRef.current = index

  useEffect(() => {
    if (!mode) return
    setQuery("")
    setIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [mode])

  useEffect(() => {
    if (mode !== "quick-open") return
    fetch("/api/tree")
      .then((r) => r.json())
      .then((tree: TreeEntry[]) => setFiles(flattenFiles(tree)))
      .catch(() => setFiles([]))
  }, [mode])

  useEffect(() => {
    if (mode !== "palette") return
    fetch("/api/git-status")
      .then((r) => r.json())
      .then((rows: { path: string }[]) => setGitFiles(rows.map((r) => r.path)))
      .catch(() => setGitFiles([]))
    fetch("/api/git-branches")
      .then((r) => r.json())
      .then((d: { current?: string; branches?: string[] }) => {
        setCurrentBranch(d.current ?? "")
        setBranches(d.branches ?? [])
      })
      .catch(() => {
        setCurrentBranch("")
        setBranches([])
      })
  }, [mode])

  const closeActiveTab = useCallback(() => {
    const path = state.activeTab
    if (!path) return
    dispatch({ type: "CLOSE_TAB", path })
    const remaining = state.tabs.filter((t) => t.path !== path)
    if (remaining.length > 0) {
      const idx = state.tabs.findIndex((t) => t.path === path)
      const next = remaining[Math.min(idx, remaining.length - 1)]
      navigate({ to: "/v/$", params: { _splat: next.path } })
    } else {
      navigate({ to: "/" })
    }
  }, [state.activeTab, state.tabs, dispatch, navigate])

  const runGit = async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Request failed")
  }

  const paletteItems: PaletteItem[] = useMemo(() => {
    const active = state.activeTab
    const items: PaletteItem[] = [
      { id: "save", label: "Save", hint: "⌘S", run: () => void triggerSave() },
      { id: "close", label: "Close Tab", hint: "⌥W", run: closeActiveTab },
      {
        id: "theme",
        label: "Toggle Theme",
        hint: "d",
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      { id: "sc", label: "Toggle Source Control", run: toggleSC },
    ]
    if (active && gitFiles.includes(active)) {
      items.push({
        id: "diff",
        label: "Open Diff for Current File",
        run: () => navigate({ to: "/d/$", params: { _splat: active } }),
      })
    }
    for (const branch of branches) {
      if (branch === currentBranch) continue
      items.push({
        id: `checkout-${branch}`,
        label: `Checkout Branch: ${branch}`,
        run: () => {
          void runGit("/api/git-checkout", { branch }).catch((e) => {
            window.alert(e instanceof Error ? e.message : "Checkout failed")
          })
        },
      })
    }
    items.push({
      id: "branch-create",
      label: "Create Branch…",
      run: () => {
        const name = window.prompt("New branch name")
        if (!name?.trim()) return
        void runGit("/api/git-branch-create", { name: name.trim() }).catch((e) => {
          window.alert(e instanceof Error ? e.message : "Create branch failed")
        })
      },
    })
    return items
  }, [
    state.activeTab,
    theme,
    gitFiles,
    branches,
    currentBranch,
    navigate,
    setTheme,
    toggleSC,
    closeActiveTab,
  ])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files.slice(0, 50)
    return files.filter((f) => f.toLowerCase().includes(q)).slice(0, 50)
  }, [files, query])

  const filteredPalette = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return paletteItems
    return paletteItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [paletteItems, query])

  const items = mode === "quick-open" ? filteredFiles : mode === "palette" ? filteredPalette : []
  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0

  const runSelection = useCallback(() => {
    const currentMode = modeRef.current
    if (!currentMode) return
    const i = indexRef.current
    if (currentMode === "quick-open") {
      const q = query.trim().toLowerCase()
      const list = q
        ? files.filter((f) => f.toLowerCase().includes(q)).slice(0, 50)
        : files.slice(0, 50)
      const path = list[i]
      if (path) navigate({ to: "/v/$", params: { _splat: path } })
    } else {
      const q = query.trim().toLowerCase()
      const list = q
        ? paletteItems.filter((item) => item.label.toLowerCase().includes(q))
        : paletteItems
      list[i]?.run()
    }
    setMode(null)
  }, [files, paletteItems, query, navigate])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          setMode(null)
          return
        }
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)))
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setIndex((i) => Math.max(i - 1, 0))
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          runSelection()
        }
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void triggerSave()
        return
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        setMode("palette")
        return
      }
      if (mod && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        setMode("quick-open")
        return
      }
      if (e.altKey && e.key.toLowerCase() === "w") {
        e.preventDefault()
        closeActiveTab()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeActiveTab, runSelection])

  if (!mode) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh]"
      onClick={() => setMode(null)}
    >
      <div
        className={cn(
          "w-full overflow-hidden border border-border bg-background text-foreground shadow-2xl",
          mode === "quick-open" ? "max-w-xl" : "max-w-lg rounded-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
          placeholder={mode === "quick-open" ? "Search files by name…" : "Run command…"}
          className="w-full border-b border-border bg-muted/20 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {mode === "quick-open" &&
            filteredFiles.map((path, i) => {
              const { name, dir } = splitFilePath(path)
              return (
                <li
                  key={path}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm",
                    i === safeIndex
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    navigate({ to: "/v/$", params: { _splat: path } })
                    setMode(null)
                  }}
                >
                  <FileTypeIcon name={name} type="file" size={18} />
                  <span className="shrink-0">{name}</span>
                  {dir && (
                    <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground/60">
                      {dir}
                    </span>
                  )}
                </li>
              )
            })}
          {mode === "palette" &&
            filteredPalette.map((item, i) => (
              <li
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-4 py-2 text-sm",
                  i === safeIndex ? "bg-sidebar-accent text-foreground" : "hover:bg-sidebar-accent/60"
                )}
                onMouseEnter={() => setIndex(i)}
                onClick={() => {
                  item.run()
                  setMode(null)
                }}
              >
                <span>{item.label}</span>
                {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
              </li>
            ))}
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
          )}
        </ul>
      </div>
    </div>
  )
}
