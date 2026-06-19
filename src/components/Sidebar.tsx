import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { IconLayoutSidebar, IconGitCompare, IconHome } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { FileTree } from "@/components/FileTree"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
        collapsed ? "w-12" : "w-64"
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        {!collapsed && (
          <span className="font-mono text-xs font-medium tracking-wide uppercase text-muted-foreground">
            stageone
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconLayoutSidebar size={14} />
        </Button>
      </div>

      {!collapsed && (
        <>
          <nav className="space-y-0.5 px-2 py-1.5">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <IconHome size={15} className="shrink-0" />
              Home
            </Link>
            <Link
              to="/d/$"
              params={{ _splat: "" }}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <IconGitCompare size={15} className="shrink-0" />
              Changes
            </Link>
          </nav>

          <div className="flex-1 overflow-y-auto border-t border-sidebar-border px-2 pt-2">
            <FileTree />
          </div>
        </>
      )}

      {!collapsed && (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <ThemeToggle />
        </div>
      )}
    </aside>
  )
}
