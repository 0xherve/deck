import { Outlet } from "@tanstack/react-router"
import { useReducer } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TabsContext, tabsReducer } from "@/stores/tabs"

export function RootLayout() {
  const [state, dispatch] = useReducer(tabsReducer, { tabs: [], activeTab: null })

  return (
    <TabsContext.Provider value={{ state, dispatch }}>
      <SidebarProvider className="h-screen overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </SidebarProvider>
    </TabsContext.Provider>
  )
}
