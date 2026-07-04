import { createContext, useContext } from "react"

export interface Tab {
  path: string
  dirty: boolean
}

export interface TabsState {
  tabs: Tab[]
  activeTab: string | null
}

export type TabsAction =
  | { type: "OPEN_TAB"; path: string }
  | { type: "CLOSE_TAB"; path: string }
  | { type: "SET_ACTIVE"; path: string }
  | { type: "SET_DIRTY"; path: string; dirty: boolean }

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case "OPEN_TAB": {
      const exists = state.tabs.some((t) => t.path === action.path)
      if (exists) {
        return { ...state, activeTab: action.path }
      }
      return {
        tabs: [...state.tabs, { path: action.path, dirty: false }],
        activeTab: action.path,
      }
    }
    case "CLOSE_TAB": {
      const filtered = state.tabs.filter((t) => t.path !== action.path)
      let activeTab = state.activeTab
      if (state.activeTab === action.path) {
        const idx = state.tabs.findIndex((t) => t.path === action.path)
        activeTab = filtered[Math.min(idx, filtered.length - 1)]?.path ?? null
      }
      sessionStorage.removeItem(`deck:buffer:${action.path}`)
      return { tabs: filtered, activeTab }
    }
    case "SET_ACTIVE":
      return { ...state, activeTab: action.path }
    case "SET_DIRTY":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.path === action.path ? { ...t, dirty: action.dirty } : t
        ),
      }
    default:
      return state
  }
}

export const TabsContext = createContext<{
  state: TabsState
  dispatch: React.Dispatch<TabsAction>
} | null>(null)

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("useTabs must be used within TabsProvider")
  return ctx
}
