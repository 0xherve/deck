import { useEffect, useRef, useState } from "react"
import { IconCheck, IconChevronDown, IconGitBranch } from "@tabler/icons-react"

interface BranchesResponse {
  current: string
  branches: string[]
}

export function BranchSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string>("")
  const [branches, setBranches] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/git-branches")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BranchesResponse | null) => {
        if (cancelled || !data) return
        setCurrent(data.current)
        setBranches(data.branches)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  async function checkout(branch: string) {
    if (branch === current || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/git-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Checkout failed")
        return
      }
      // A checkout rewrites the working tree wholesale; a reload is the
      // cheapest way to resync every cached view (tree, status, open file).
      window.location.reload()
    } catch {
      setError("Checkout failed")
    } finally {
      setBusy(false)
    }
  }

  // Reserve the row's height while loading so the nav below doesn't jump.
  if (!current) {
    return <div className="h-8 w-full rounded-md bg-sidebar-accent/30" aria-hidden />
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        <IconGitBranch size={14} className="shrink-0 text-muted-foreground" />
        <span className="truncate">{current}</span>
        <IconChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full min-w-48 overflow-y-auto rounded-md border border-sidebar-border bg-sidebar p-1 shadow-lg"
        >
          {branches.map((branch) => (
            <button
              key={branch}
              type="button"
              role="option"
              aria-selected={branch === current}
              disabled={busy}
              onClick={() => checkout(branch)}
              className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-ring disabled:opacity-50"
            >
              <IconCheck
                size={14}
                className={branch === current ? "shrink-0" : "shrink-0 opacity-0"}
              />
              <span className="truncate">{branch}</span>
            </button>
          ))}
          {error && (
            <div className="px-2 py-2 text-xs text-destructive">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
