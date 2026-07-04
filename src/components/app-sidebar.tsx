import { Link } from "@tanstack/react-router"
import { IconGitCompare, IconHome } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
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
import { useGitStatus } from "@/hooks/useGitStatus"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const gitStatus = useGitStatus()

  return (
    <Sidebar {...props}>
      <SidebarHeader 
        className="px-8 pt-4">
        <span className="px-2 font-mono text-sm font-semibold tracking-widest uppercase text-foreground">
          Deck
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
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
      <SidebarRail />
    </Sidebar>
  )
}
