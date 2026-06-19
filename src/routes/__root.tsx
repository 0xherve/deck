import { Outlet } from "@tanstack/react-router"
import { useReducer } from "react"
import { Sidebar } from "@/components/Sidebar"
import { TabsContext, tabsReducer } from "@/stores/tabs"

export function RootLayout() {
  const [state, dispatch] = useReducer(tabsReducer, { tabs: [], activeTab: null })

  return (
    <TabsContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </TabsContext.Provider>
  )
}
