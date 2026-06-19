import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "@/components/Sidebar"

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
