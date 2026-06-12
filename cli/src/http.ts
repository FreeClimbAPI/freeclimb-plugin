import axios, { AxiosInstance, AxiosError } from "axios"
import { randomUUID } from "crypto"
import { Environment } from "./environment.js"
import { cred } from "./credentials.js"

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 3
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

function getMaxRetries(): number {
    const envVal = Environment.getString("FREECLIMB_MAX_RETRIES")
    if (envVal) {
        const parsed = parseInt(envVal, 10)
        if (!isNaN(parsed) && parsed >= 0) return parsed
    }
    return DEFAULT_MAX_RETRIES
}

function getTimeout(): number {
    const envVal = Environment.getString("FREECLIMB_TIMEOUT")
    if (envVal) {
        const parsed = parseInt(envVal, 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return DEFAULT_TIMEOUT
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoffWithJitter(attempt: number): number {
    const base = Math.min(1000 * 2 ** attempt, 30_000)
    return base * (0.5 + Math.random() * 0.5)
}

export function generateRequestId(): string {
    return randomUUID()
}

// Metadata keys stored on the axios config object
const REQUEST_ID_KEY = "fcRequestId"
const RETRY_COUNT_KEY = "fcRetryCount"

export async function createApiAxios(): Promise<AxiosInstance> {
    const accountId = await cred.accountId
    const apiKey = await cred.apiKey
    const baseURL =
        Environment.getString("FREECLIMB_CLI_BASE_URL") || "https://www.freeclimb.com/apiserver"
    const timeout = getTimeout()
    const maxRetries = getMaxRetries()

    const instance = axios.create({
        baseURL: `${baseURL}/Accounts/${accountId}`,
        auth: {
            username: accountId,
            password: apiKey,
        },
        headers: {
            "Content-Type": "application/json",
        },
        timeout,
    })

    // Add request ID to every request
    instance.interceptors.request.use((config) => {
        const requestId = generateRequestId()
        config.headers["X-Request-Id"] = requestId
        ;(config as any)[REQUEST_ID_KEY] = requestId
        return config
    })

    // Retry interceptor for transient errors
    instance.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as any
        if (!config) throw error

        config[RETRY_COUNT_KEY] = config[RETRY_COUNT_KEY] || 0

        const status = error.response?.status
        const isRetryable = status !== undefined && RETRYABLE_STATUS_CODES.has(status)
        const isNetworkError = !error.response && error.code !== "ECONNABORTED"

        if ((isRetryable || isNetworkError) && config[RETRY_COUNT_KEY] < maxRetries) {
            config[RETRY_COUNT_KEY] += 1
            const delay = backoffWithJitter(config[RETRY_COUNT_KEY])
            await sleep(delay)
            return instance.request(config)
        }

        throw error
    })

    return instance
}

export function getRequestId(config: any): string | undefined {
    return config?.[REQUEST_ID_KEY]
}
