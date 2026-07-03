import { Link } from "@tanstack/react-router"
import { IconGitCompare, IconHome } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { FileTree } from "@/components/FileTree"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useGitStatus } from "@/hooks/useGitStatus"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const gitStatus = useGitStatus()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <span className="px-2 font-mono text-xs font-medium tracking-wide uppercase text-muted-foreground">
          stageone
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/" />}>
                <IconHome />
                Home
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/d/$" params={{ _splat: "" }} />}>
                <IconGitCompare />
                Changes
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent className="h-full">
            <FileTree gitStatus={gitStatus} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
