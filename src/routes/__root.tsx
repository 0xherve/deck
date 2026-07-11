import { Outlet } from "@tanstack/react-router"
import { createContext, useContext, useMemo, useReducer, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DeckShortcuts } from "@/components/DeckShortcuts"
import { SourceControlPanel } from "@/components/SourceControlPanel"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TabsContext, tabsReducer } from "@/stores/tabs"

const SCPanelContext = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} })
export const useSCPanel = () => useContext(SCPanelContext)

export function RootLayout() {
  const [state, dispatch] = useReducer(tabsReducer, { tabs: [], activeTab: null })
  const [open, setOpen] = useState(false)
  const scPanel = useMemo(() => ({ open, toggle: () => setOpen((o) => !o) }), [open])

  return (
    <TabsContext.Provider value={{ state, dispatch }}>
      <SCPanelContext.Provider value={scPanel}>
        <SidebarProvider className="h-screen overflow-hidden bg-background text-foreground">
          <AppSidebar />
          <main className="flex flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
          <SourceControlPanel />
          <DeckShortcuts />
        </SidebarProvider>
      </SCPanelContext.Provider>
    </TabsContext.Provider>
  )
}
