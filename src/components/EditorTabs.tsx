import { useTabs } from "@/stores/tabs"
import { useNavigate } from "@tanstack/react-router"
import { IconX, IconGitCompare } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"
import { useSCPanel } from "@/routes/__root"

export function EditorTabs() {
  const { state, dispatch } = useTabs()
  const navigate = useNavigate()
  const { toggle } = useSCPanel()

  if (state.tabs.length === 0) return null

  return (
    <div className="flex w-full items-center border-b border-border bg-muted/30">
      <div className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto">
      {state.tabs.map((tab) => {
        const fileName = tab.path.split("/").pop() || tab.path
        const isActive = tab.path === state.activeTab

        return (
          <div
            key={tab.path}
            className={cn(
              "group flex items-center gap-1 border-r border-border pl-3 pr-1 py-2 text-xs cursor-pointer",
              isActive
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:bg-card/50"
            )}
            onClick={() => {
              dispatch({ type: "SET_ACTIVE", path: tab.path })
              navigate({ to: "/v/$", params: { _splat: tab.path } })
            }}
          >
            {tab.dirty && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
            <span className="truncate max-w-32">{fileName}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ type: "CLOSE_TAB", path: tab.path })
                if (isActive) {
                  const remaining = state.tabs.filter((t) => t.path !== tab.path)
                  if (remaining.length > 0) {
                    const idx = state.tabs.findIndex((t) => t.path === tab.path)
                    const next = remaining[Math.min(idx, remaining.length - 1)]
                    navigate({ to: "/v/$", params: { _splat: next.path } })
                  } else {
                    navigate({ to: "/" })
                  }
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-0"
            >
              <IconX size={12} />
            </Button>
          </div>
        )
      })}
      </div>
      <div className="ml-auto flex shrink-0 items-center pr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="gap-1.5 rounded-none border-l border-border"
        >
          <IconGitCompare size={14} />
          Changes
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}
