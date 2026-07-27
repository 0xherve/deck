import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { IconGitCompare, IconHome, IconLayoutSidebar, IconSearch } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { FileTree } from "@/components/FileTree"
import { BranchSwitcher } from "@/components/BranchSwitcher"
import { useGitStatus } from "@/hooks/useGitStatus"

function useRepoName() {
  const [name, setName] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/repo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name: string } | null) => {
        if (!cancelled && data) setName(data.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return name
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const gitStatus = useGitStatus()
  const repoName = useRepoName()
  const { toggleSidebar } = useSidebar()
  const [search, setSearch] = useState("")

  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-sidebar-foreground">
            {repoName || "Deck"}
          </span>
          {gitStatus.length > 0 && (
            <span
              className="rounded-full bg-sidebar-accent px-2 py-0.5 font-mono text-xs leading-none text-muted-foreground"
              title={`${gitStatus.length} uncommitted change${gitStatus.length === 1 ? "" : "s"}`}
            >
              {gitStatus.length}
            </span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
          >
            <IconLayoutSidebar size={16} />
          </button>
        </div>

        <BranchSwitcher />

        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link to="/" />}>
              <IconHome size={16} />
              Home
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link to="/d/$" params={{ _splat: "" }} />}>
              <IconGitCompare size={16} />
              Changes
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="relative">
          <IconSearch
            size={14}
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Go to file"
            aria-label="Filter files"
            className="h-8 w-full rounded-md border border-sidebar-border bg-transparent pr-2 pl-7 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus-visible:border-sidebar-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 px-0 py-0">
          <SidebarGroupContent className="h-full">
            <FileTree gitStatus={gitStatus} search={search} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
