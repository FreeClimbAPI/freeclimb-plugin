import { DashboardDataManager as CoreDashboardDataManager } from "@freeclimb/core"
import type { StateUpdate } from "@freeclimb/core"

export { validateSourceBindings } from "@freeclimb/core"

export class DashboardDataManager extends CoreDashboardDataManager {
    constructor(
        onUpdate: (updates: StateUpdate[]) => void,
        onError?: (source: string, error: Error) => void,
    ) {
        super(onUpdate, onError, {
            onWarn: (message) => process.stderr.write(`${message}\n`),
        })
    }
}
