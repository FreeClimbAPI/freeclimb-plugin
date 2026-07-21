import { Command, Flags } from "@oclif/core"
import axios from "axios"
import chalk from "chalk"
import { getBaseUrl } from "@freeclimb/core"
import { cred } from "../credentials.js"
import * as Errors from "../errors.js"
import { prompts } from "../prompts.js"
import { isTTY } from "../ui/theme.js"

async function verifyCredentials(accountId: string, apiKey: string): Promise<boolean> {
    const baseUrl = getBaseUrl()
    try {
        await axios.get(`${baseUrl}/Accounts/${accountId}`, {
            auth: { username: accountId, password: apiKey },
            headers: { "Content-Type": "application/json" },
        })
        return true
    } catch {
        return false
    }
}

export class login extends Command {
    static description = `Log in to FreeClimb with your credentials. Alternatively you can set the ACCOUNT_ID and API_KEY environment variables. To learn how to put them in a file, run freeclimb data -h`

    static examples = [
        "<%= config.bin %> login",
        "<%= config.bin %> login --accountId AC1234567890abcdef --apiKey abc123def456 --yes",
    ]

    static flags = {
        help: Flags.help({ char: "h" }),
        accountId: Flags.string({ description: "FreeClimb Account ID (non-interactive login)" }),
        apiKey: Flags.string({ description: "FreeClimb API Key (non-interactive login)" }),
        yes: Flags.boolean({
            char: "y",
            description: "Skip confirmation prompt (required for non-interactive login)",
            default: false,
        }),
    }

    async run() {
        const { flags } = await this.parse(login)

        const verifyResponse = () => {
            const resp =
                "\n<---Your ACCOUNT_ID and API_KEY have been verified through Freeclimb.---> \n\nWhat Can I Do Next?\n\n  To check account information run: \n\t freeclimb accounts:get \n\n  To see all commands available through the api, run freeclimb with the help flag: \n\t freeclimb --help \n\n"
            this.log(chalk.green(resp))
        }
        const verifyErrorResponse = () => {
            const respError =
                "\n<---Inputted ACCOUNT_ID and API_KEY where not valid. Please try again.-->\n"
            this.log(chalk.red(respError))
        }

        const storeAndVerify = async (accountId: string, apiKey: string) => {
            await cred.removeCredentials()
            try {
                await cred.setCredentials(accountId, apiKey)
            } catch (error: any) {
                const err = new Errors.SetPasswordError()
                this.error(err.message, { exit: err.code })
            }
            if (await verifyCredentials(accountId, apiKey)) {
                verifyResponse()
            } else {
                verifyErrorResponse()
            }
        }

        if (flags.accountId && flags.apiKey) {
            if (!flags.yes) {
                this.error("Non-interactive login requires the --yes flag to confirm.", { exit: 2 })
            }
            await storeAndVerify(flags.accountId, flags.apiKey)
            return
        }

        if (flags.accountId || flags.apiKey) {
            this.error("Both --accountId and --apiKey must be provided for non-interactive login.", {
                exit: 2,
            })
        }

        if (!isTTY()) {
            this.error(
                "Login requires --accountId, --apiKey, and --yes flags in non-interactive mode.\n" +
                "Example: freeclimb login --accountId AC... --apiKey abc123 --yes\n" +
                "Alternatively, set ACCOUNT_ID and API_KEY environment variables.",
                { exit: 2 },
            )
        }

        this.log("You can find your Account ID and API Key at https://www.freeclimb.com/dashboard")
        const confirmation: boolean = await prompts.confirm(
            "If you are already logged in to the FreeClimb CLI on this computer, you will first be logged out of that account. Would you like to continue?"
        )

        if (confirmation) {
            const accountId = await prompts.password(
                "-> The Account ID of your FreeClimb Account"
            )

            const apiKey = await prompts.password(
                "-> Your API Key for your FreeClimb Account"
            )
            await storeAndVerify(accountId, apiKey)
            if (/^AC[0-9a-fA-F]{40}$/gm.exec(accountId) === null) {
                this.warn(
                    chalk.yellow(
                        "Your Account ID has been saved, but it does not appear to match the correct Account ID format"
                    )
                )
            }
            if (/^[0-9a-fA-F]{40}$/gm.exec(apiKey) === null) {
                this.warn(
                    chalk.yellow(
                        "Your API Key has been saved, but it does not appear to match the correct API Key format"
                    )
                )
            }
        } else {
            const err = new Errors.LoginCancelled()
            this.error(err.message, { exit: err.code })
        }
    }
}
