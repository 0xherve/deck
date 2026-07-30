import { createContext, useContext } from "react"

export const SCPanelContext = createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {},
})

export function useSCPanel() {
  return useContext(SCPanelContext)
}
