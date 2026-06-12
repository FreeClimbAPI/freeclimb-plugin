import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs"
import { join } from "path"

export interface NumberAssignment {
    phoneNumberId: string
    previousApplicationId: string | null
}

export interface PreviousAppUrls {
    callConnectUrl: string | null
    smsUrl: string | null
    statusCallbackUrl: string | null
    voiceUrl: string | null
}

export interface DevState {
    applicationId: string
    createdAt: string
    isTemporary: boolean
    numberAssignments: NumberAssignment[]
    pid: number
    previousAppUrls: PreviousAppUrls | null
    tunnelUrl: string
}

function stateFilePath(dataDir: string): string {
    return join(dataDir, "dev-state.json")
}

export function readDevState(dataDir: string): DevState | null {
    const filePath = stateFilePath(dataDir)
    if (!existsSync(filePath)) return null

    try {
        const raw = readFileSync(filePath, "utf-8")
        return JSON.parse(raw) as DevState
    } catch {
        return null
    }
}

export function writeDevState(dataDir: string, state: DevState): void {
    const filePath = stateFilePath(dataDir)
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8")
}

export function removeDevState(dataDir: string): void {
    const filePath = stateFilePath(dataDir)
    try {
        unlinkSync(filePath)
    } catch {
        // File may not exist
    }
}

export function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0)
        return true
    } catch {
        return false
    }
}
