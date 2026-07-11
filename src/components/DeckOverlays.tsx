import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

interface TreeEntry {
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

interface QuickOpenProps {
  open: boolean
  onClose: () => void
}

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [files, setFiles] = useState<string[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setIndex(0)
    fetch("/api/tree")
      .then((r) => r.json())
      .then((tree: TreeEntry[]) => setFiles(flattenFiles(tree)))
      .catch(() => setFiles([]))
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files.slice(0, 50)
    return files.filter((f) => f.toLowerCase().includes(q)).slice(0, 50)
  }, [files, query])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open) return null

  const openFile = (path: string) => {
    navigate({ to: "/v/$", params: { _splat: path } })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-popover shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, filtered.length - 1))
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            }
            if (e.key === "Enter" && filtered[index]) {
              e.preventDefault()
              openFile(filtered[index])
            }
          }}
          placeholder="Open file…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-muted-foreground">No files</li>
          ) : (
            filtered.map((path, i) => (
              <li
                key={path}
                className={cn(
                  "cursor-pointer px-4 py-1.5 font-mono text-sm",
                  i === index ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
                onClick={() => openFile(path)}
              >
                {path}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

export interface PaletteCommand {
  id: string
  label: string
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setIndex(0)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open) return null

  const run = (cmd: PaletteCommand) => {
    cmd.run()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-popover shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, filtered.length - 1))
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            }
            if (e.key === "Enter" && filtered[index]) {
              e.preventDefault()
              run(filtered[index])
            }
          }}
          placeholder="Run command…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-64 overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              className={cn(
                "cursor-pointer px-4 py-1.5 text-sm",
                i === index ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
              onClick={() => run(cmd)}
            >
              {cmd.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
