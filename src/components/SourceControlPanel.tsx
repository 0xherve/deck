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
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSCPanel } from "@/routes/__root"

type GitFile = { path: string; status: "M" | "A" | "D" | "U"; staged: boolean }

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed")
  return res.json()
}

export function SourceControlPanel() {
  const { open } = useSCPanel()
  const navigate = useNavigate()
  const [branch, setBranch] = useState("")
  const [files, setFiles] = useState<GitFile[]>([])
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    fetch("/api/git-status").then((r) => r.json()).then(setFiles).catch(() => setFiles([]))
    fetch("/api/git-branch").then((r) => r.json()).then((d) => setBranch(d.branch ?? "")).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const staged = files.filter((f) => f.staged)
  const unstaged = files.filter((f) => !f.staged)

  if (!open) return null

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
        <IconGitBranch size={14} className="text-muted-foreground" />
        <span className="truncate">{branch || "no branch"}</span>
      </div>

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
            <FileSection title="Staged Changes" files={staged} onToggle={(f) => run(() => postJson("/api/git-unstage", { paths: [f.path] }))} toggleIcon={<IconMinus size={12} />} onOpen={(f) => navigate({ to: "/d/$", params: { _splat: f.path } })} />
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
    case "M": return "text-yellow-500"
    case "A": return "text-green-500"
    case "D": return "text-red-500"
    default: return "text-muted-foreground"
  }
}
