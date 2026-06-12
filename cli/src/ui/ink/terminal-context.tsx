import { createContext, useContext } from "react"

const TerminalWidthContext = createContext<number>(80)

export const TerminalWidthProvider = TerminalWidthContext.Provider

export function useTerminalWidth(): number {
    return useContext(TerminalWidthContext)
}
