import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  IconGitBranch,
  IconGitCommit,
  IconUpload,
  IconDownload,
  IconPackage,
  IconPackageImport,
  IconPlus,
  IconMinus,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSCPanel } from "@/routes/__root"
import { discardBuffer } from "@/lib/file-buffer"
import { useTabs } from "@/stores/tabs"

type GitFile = { path: string; status: "M" | "A" | "D" | "U"; staged: boolean }

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Request failed")
  return data
}

export function SourceControlPanel() {
  const { open } = useSCPanel()
  const navigate = useNavigate()
  const { state, dispatch } = useTabs()
  const [branch, setBranch] = useState("")
  const [branches, setBranches] = useState<string[]>([])
  const [files, setFiles] = useState<GitFile[]>([])
  const [message, setMessage] = useState("")
  const [newBranch, setNewBranch] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetch("/api/git-status").then((r) => r.json()).then(setFiles).catch(() => setFiles([]))
    fetch("/api/git-branches")
      .then((r) => r.json())
      .then((d) => {
        setBranch(d.current ?? "")
        setBranches(d.branches ?? [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  const staged = files.filter((f) => f.staged)
  const unstaged = files.filter((f) => !f.staged)

  const hasBufferedEdits = state.tabs.some((t) => t.dirty)
  const hasWorkingTreeChanges = files.length > 0
  const switchBlocked = hasBufferedEdits || hasWorkingTreeChanges

  const reconcileTabsAfterSwitch = useCallback(async () => {
    const survivals = await Promise.all(
      state.tabs.map(async (tab) => {
        const res = await fetch(`/api/file-meta?path=${encodeURIComponent(tab.path)}`)
        discardBuffer(tab.path)
        return { path: tab.path, exists: res.ok }
      })
    )

    for (const { path, exists } of survivals) {
      if (exists) {
        dispatch({ type: "SET_DIRTY", path, dirty: false })
      } else {
        dispatch({ type: "CLOSE_TAB", path })
      }
    }

    const activeSurvives = survivals.some((s) => s.path === state.activeTab && s.exists)
    if (activeSurvives && state.activeTab) {
      navigate({ to: "/v/$", params: { _splat: state.activeTab } })
    } else {
      navigate({ to: "/" })
    }
  }, [state.tabs, state.activeTab, dispatch, navigate])

  const switchBranch = useCallback(
    async (name: string) => {
      await postJson("/api/git-checkout", { branch: name })
      await reconcileTabsAfterSwitch()
    },
    [reconcileTabsAfterSwitch]
  )

  const createBranch = useCallback(
    async (name: string) => {
      await postJson("/api/git-branch-create", { name })
      await reconcileTabsAfterSwitch()
    },
    [reconcileTabsAfterSwitch]
  )

  if (!open) return null

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <IconGitBranch size={14} className="text-muted-foreground" />
          <span className="truncate font-medium">{branch || "no branch"}</span>
        </div>
        <div className="mt-2 flex gap-1">
          <input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder="New branch name"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !newBranch.trim()}
            onClick={() =>
              run(async () => {
                await createBranch(newBranch.trim())
                setNewBranch("")
              })
            }
          >
            Create
          </Button>
        </div>
        {branches.length > 0 && (
          <div
            className={cn(
              "mt-2 max-h-24 overflow-y-auto rounded-md border border-border",
              switchBlocked && "pointer-events-none opacity-50"
            )}
          >
            {branches.map((b) => (
              <button
                key={b}
                type="button"
                disabled={busy || switchBlocked || b === branch}
                onClick={() => run(() => switchBranch(b))}
                className={cn(
                  "block w-full truncate px-2 py-1 text-left text-xs hover:bg-sidebar-accent",
                  b === branch && "bg-sidebar-accent font-medium"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        )}
        {switchBlocked && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Commit or discard changes below before switching branches.
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => postJson("/api/git-stage", { paths: unstaged.map((f) => f.path) }))} title="Stage All">
          <IconPlus size={14} /> Stage All
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => postJson("/api/git-unstage", { paths: staged.map((f) => f.path) }))} title="Unstage All">
          <IconMinus size={14} /> Unstage All
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => run(() => postJson("/api/git-push"))} title="Push">
          <IconUpload size={14} />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => run(() => postJson("/api/git-pull"))} title="Pull">
          <IconDownload size={14} />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => run(() => postJson("/api/git-stash", { action: "push" }))} title="Stash">
          <IconPackage size={14} />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => run(() => postJson("/api/git-stash", { action: "pop" }))} title="Stash Pop">
          <IconPackageImport size={14} />
        </Button>
      </div>

      <div className="border-b border-border p-2">
        <textarea
          placeholder="Commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-16 w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          className="mt-2 w-full gap-1.5"
          disabled={busy || !message.trim() || staged.length === 0}
          onClick={() => run(async () => {
            await postJson("/api/git-commit", { message })
            setMessage("")
          })}
        >
          <IconGitCommit size={14} /> Commit
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No changes
          </div>
        ) : (
          <>
            <FileSection title="Staged Changes" files={staged} onToggle={(f) => run(() => postJson("/api/git-unstage", { paths: [f.path] }))} toggleIcon={<IconMinus size={12} />} onOpen={(f) => navigate({ to: "/d/$", params: { _splat: f.path }, search: { staged: "1" } })} />
            <FileSection title="Changes" files={unstaged} onToggle={(f) => run(() => postJson("/api/git-stage", { paths: [f.path] }))} toggleIcon={<IconPlus size={12} />} onOpen={(f) => navigate({ to: "/d/$", params: { _splat: f.path } })} />
          </>
        )}
      </div>
    </div>
  )
}

function FileSection({
  title,
  files,
  onToggle,
  toggleIcon,
  onOpen,
}: {
  title: string
  files: GitFile[]
  onToggle: (f: GitFile) => void
  toggleIcon: React.ReactNode
  onOpen: (f: GitFile) => void
}) {
  if (files.length === 0) return null
  return (
    <div>
      <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
        {title} ({files.length})
      </div>
      {files.map((f) => {
        const name = f.path.split("/").pop() || f.path
        return (
          <div
            key={f.path}
            className="group flex cursor-pointer items-center gap-2 px-3 py-1 text-sm hover:bg-sidebar-accent"
            onClick={() => onOpen(f)}
            title={f.path}
          >
            <span className="truncate flex-1">{name}</span>
            <span className={cn("shrink-0 text-xs font-mono", statusColor(f.status))}>{f.status}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(f)
              }}
            >
              {toggleIcon}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function statusColor(status: GitFile["status"]) {
  switch (status) {
    case "M": return "text-chart-2"
    case "A": return "text-primary"
    case "D": return "text-destructive"
    default: return "text-muted-foreground"
  }
}
