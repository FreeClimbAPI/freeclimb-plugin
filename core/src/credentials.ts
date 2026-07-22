import { Entry } from "@napi-rs/keyring"
import { env } from "./environment.js"

const SERVICE_NAME = process.env.FREECLIMB_KEYRING_SERVICE || "FreeClimb"
const ACCOUNT_KEY = "accountId"
const API_KEY_KEY = "apiKey"

type KeyringEntry = Pick<Entry, "deletePassword" | "getPassword" | "setPassword">
type EntryFactory = (service: string, key: string) => KeyringEntry
type CredentialEnvironment = { accountId: string; apiKey: string }

export function createCredentialStore(
    entryFactory: EntryFactory = (service, key) => new Entry(service, key),
    environment: CredentialEnvironment = env,
) {
    function readKeyring(key: string): string | undefined {
        try {
            const val = entryFactory(SERVICE_NAME, key).getPassword()
            if (val) return val
        } catch {
        }
        return undefined
    }

    return {
        async removeCredentials() {
            try {
                entryFactory(SERVICE_NAME, ACCOUNT_KEY).deletePassword()
            } catch {
            }
            try {
                entryFactory(SERVICE_NAME, API_KEY_KEY).deletePassword()
            } catch {
            }
        },
        get accountId() {
            return (async () => readKeyring(ACCOUNT_KEY) ?? environment.accountId)()
        },
        get apiKey() {
            return (async () => readKeyring(API_KEY_KEY) ?? environment.apiKey)()
        },
        async setCredentials(accountId: string, apiKey: string) {
            entryFactory(SERVICE_NAME, ACCOUNT_KEY).setPassword(accountId)
            entryFactory(SERVICE_NAME, API_KEY_KEY).setPassword(apiKey)
        },
    }
}

export const cred = createCredentialStore()
