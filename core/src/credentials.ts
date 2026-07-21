import { Entry } from "@napi-rs/keyring"
import { env } from "./environment.js"

const SERVICE_NAME = process.env.FREECLIMB_KEYRING_SERVICE || "FreeClimb"
const ACCOUNT_KEY = "accountId"
const API_KEY_KEY = "apiKey"

const keyringCache = new Map<string, string>()

export function clearCredentialCache(): void {
    keyringCache.clear()
}

function readKeyring(key: string): string | undefined {
    const cached = keyringCache.get(key)
    if (cached !== undefined) return cached
    try {
        const val = new Entry(SERVICE_NAME, key).getPassword()
        if (val) {
            keyringCache.set(key, val)
            return val
        }
    } catch {
    }
    return undefined
}

export const cred = {
    async removeCredentials() {
        keyringCache.clear()
        try {
            new Entry(SERVICE_NAME, ACCOUNT_KEY).deletePassword()
        } catch {
        }
        try {
            new Entry(SERVICE_NAME, API_KEY_KEY).deletePassword()
        } catch {
        }
    },
    get accountId() {
        return (async () => readKeyring(ACCOUNT_KEY) ?? env.accountId)()
    },
    get apiKey() {
        return (async () => readKeyring(API_KEY_KEY) ?? env.apiKey)()
    },
    async setCredentials(accountId: string, apiKey: string) {
        new Entry(SERVICE_NAME, ACCOUNT_KEY).setPassword(accountId)
        new Entry(SERVICE_NAME, API_KEY_KEY).setPassword(apiKey)
        keyringCache.set(ACCOUNT_KEY, accountId)
        keyringCache.set(API_KEY_KEY, apiKey)
    },
}
