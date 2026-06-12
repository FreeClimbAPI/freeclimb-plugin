import { Entry } from "@napi-rs/keyring"
import { env } from "./environment.js"

const SERVICE_NAME = "FreeClimb"
const ACCOUNT_KEY = "accountId"
const API_KEY_KEY = "apiKey"

export const cred = {
    async removeCredentials() {
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
        return (async () => {
            try {
                const val = new Entry(SERVICE_NAME, ACCOUNT_KEY).getPassword()
                if (val) return val
                return env.accountId
            } catch {
                return env.accountId
            }
        })()
    },
    get apiKey() {
        return (async () => {
            try {
                const val = new Entry(SERVICE_NAME, API_KEY_KEY).getPassword()
                if (val) return val
                return env.apiKey
            } catch {
                return env.apiKey
            }
        })()
    },
    async setCredentials(accountId: string, apiKey: string) {
        new Entry(SERVICE_NAME, ACCOUNT_KEY).setPassword(accountId)
        new Entry(SERVICE_NAME, API_KEY_KEY).setPassword(apiKey)
    },
}
