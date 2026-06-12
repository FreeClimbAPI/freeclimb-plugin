import chalk from "chalk"
import { deleteTempApp, restoreAppUrls } from "./app-manager.js"
import { restoreNumber } from "./number-manager.js"
import { removeDevState, type DevState } from "./state.js"

type Logger = { log(msg: string): void }

let cleaning = false

export async function performCleanup(
    state: DevState,
    dataDir: string,
    logger: Logger,
    jsonMode: boolean,
): Promise<void> {
    if (cleaning) return
    cleaning = true

    let allSucceeded = true

    try {
        // Restore number assignments
        for (const assignment of state.numberAssignments) {
            try {
                await restoreNumber(assignment.phoneNumberId, assignment.previousApplicationId)
                if (!jsonMode) {
                    logger.log(
                        chalk.green(
                            `  ✔ Restored ${assignment.phoneNumberId} → ${assignment.previousApplicationId || "(unassigned)"}`,
                        ),
                    )
                }
            } catch (error: unknown) {
                allSucceeded = false
                const typedError = error as Error
                if (!jsonMode) {
                    logger.log(
                        chalk.yellow(
                            `  ⚠ Could not restore ${assignment.phoneNumberId}: ${typedError.message}`,
                        ),
                    )
                }
            }
        }

        // Restore existing app URLs if we modified a non-temporary app
        if (!state.isTemporary && state.previousAppUrls) {
            try {
                await restoreAppUrls(state.applicationId, state.previousAppUrls)
                if (!jsonMode) {
                    logger.log(
                        chalk.green(`  ✔ Restored application ${state.applicationId} webhook URLs`),
                    )
                }
            } catch (error: unknown) {
                allSucceeded = false
                const typedError = error as Error
                if (!jsonMode) {
                    logger.log(
                        chalk.yellow(
                            `  ⚠ Could not restore application URLs for ${state.applicationId}: ${typedError.message}`,
                        ),
                    )
                }
            }
        }

        // Delete temp application
        if (state.isTemporary) {
            try {
                await deleteTempApp(state.applicationId)
                if (!jsonMode) {
                    logger.log(chalk.green(`  ✔ Deleted temp application ${state.applicationId}`))
                }
            } catch (error: unknown) {
                allSucceeded = false
                const typedError = error as Error
                if (!jsonMode) {
                    logger.log(
                        chalk.yellow(
                            `  ⚠ Could not delete application ${state.applicationId}: ${typedError.message}`,
                        ),
                    )
                }
            }
        }

        // Only remove state file if all cleanup succeeded — allows retry on failure
        if (allSucceeded) {
            removeDevState(dataDir)
        } else if (!jsonMode) {
            logger.log(
                chalk.yellow(
                    `  ⚠ State file retained for retry — run 'freeclimb dev' to re-attempt cleanup`,
                ),
            )
        }
    } finally {
        cleaning = false
    }
}

export function registerCleanupHandlers(
    getState: () => DevState | null,
    dataDir: string,
    logger: Logger,
    jsonMode: boolean,
    onDone: () => void,
): void {
    const handler = async () => {
        const state = getState()
        if (state) {
            if (!jsonMode) logger.log(chalk.dim("\nCleaning up..."))
            await performCleanup(state, dataDir, logger, jsonMode)
        }
        onDone()
    }

    process.on("SIGINT", handler)
    process.on("SIGTERM", handler)
}
