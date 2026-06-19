import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { PanelLeft, GitCompare, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { FileTree } from "@/components/FileTree"
import { ThemeToggle } from "@/components/ThemeToggle"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-primary">
            stageone
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      {!collapsed && (
        <>
          <nav className="space-y-1 px-2 py-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              to="/d/$"
              params={{ _splat: "" }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <GitCompare className="h-4 w-4" />
              Diffs
            </Link>
          </nav>

          {/* File tree */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
              Files
            </p>
            <FileTree />
          </div>
        </>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 border-t border-sidebar-border px-3 py-2">
          <ThemeToggle />
        </div>
      )}
    </aside>
  )
}
