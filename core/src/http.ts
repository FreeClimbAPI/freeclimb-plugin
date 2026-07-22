import axios, { AxiosInstance, AxiosError, Method } from "axios"
import { randomUUID } from "crypto"
import { Environment } from "./environment.js"
import { cred } from "./credentials.js"
import { getRequestLimiter, type RequestLimiter } from "./request-limiter.js"

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_REQUESTS_PER_SECOND = 5
const DEFAULT_MAX_CONCURRENT_REQUESTS = 2
const DEFAULT_BASE_URL = "https://www.freeclimb.com/apiserver"
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT"])
const REQUEST_ID_KEY = "fcRequestId"
const RETRY_COUNT_KEY = "fcRetryCount"
const RELEASE_KEY = "fcRelease"

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

function getPositiveInteger(name: string, fallback: number): number {
    const envVal = Environment.getString(name)
    if (envVal) {
        const parsed = Number(envVal)
        if (Number.isInteger(parsed) && parsed > 0) return parsed
    }
    return fallback
}

function getRequestsPerSecond(): number {
    return getPositiveInteger("FREECLIMB_REQUESTS_PER_SECOND", DEFAULT_REQUESTS_PER_SECOND)
}

function getMaxConcurrentRequests(): number {
    return getPositiveInteger(
        "FREECLIMB_MAX_CONCURRENT_REQUESTS",
        DEFAULT_MAX_CONCURRENT_REQUESTS,
    )
}

export function getBaseUrl(): string {
    return Environment.getString("FREECLIMB_CLI_BASE_URL") || DEFAULT_BASE_URL
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoffWithJitter(attempt: number): number {
    const base = Math.min(1000 * 2 ** attempt, 30_000)
    return base * (0.5 + Math.random() * 0.5)
}

function retryAfterDelay(value: unknown): number | undefined {
    if (typeof value !== "string" && typeof value !== "number") return undefined
    const raw = String(value).trim()
    if (!raw) return undefined

    const seconds = Number(raw)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

    const timestamp = Date.parse(raw)
    if (Number.isNaN(timestamp)) return undefined
    return Math.max(0, timestamp - Date.now())
}

function canRetry(method: unknown): boolean {
    return RETRYABLE_METHODS.has(String(method ?? "GET").toUpperCase())
}

export function generateRequestId(): string {
    return randomUUID()
}

export function getRequestId(config: any): string | undefined {
    return config?.[REQUEST_ID_KEY]
}

function releaseRequest(config: any): void {
    const release = config?.[RELEASE_KEY]
    if (typeof release !== "function") return
    delete config[RELEASE_KEY]
    release()
}

function attachResilience(
    instance: AxiosInstance,
    maxRetries: number,
    limiter: RequestLimiter,
): void {
    instance.interceptors.request.use(async (config) => {
        const requestId = generateRequestId()
        config.headers["X-Request-Id"] = requestId
        ;(config as any)[REQUEST_ID_KEY] = requestId
        ;(config as any)[RELEASE_KEY] = await limiter.acquire()
        return config
    })

    instance.interceptors.response.use(
        (response) => {
            releaseRequest(response.config)
            return response
        },
        async (error: AxiosError) => {
            const config = error.config as any
            if (!config) throw error

            releaseRequest(config)
            config[RETRY_COUNT_KEY] = config[RETRY_COUNT_KEY] || 0

            const status = error.response?.status
            const isRetryable = status !== undefined && RETRYABLE_STATUS_CODES.has(status)
            const isNetworkError = !error.response && error.code !== "ECONNABORTED"
            const nextAttempt = config[RETRY_COUNT_KEY] + 1
            const fallbackDelay = backoffWithJitter(nextAttempt)

            if (status === 429) {
                const delay =
                    retryAfterDelay(error.response?.headers?.["retry-after"]) ?? fallbackDelay
                limiter.applyCooldown(delay)
            }

            if (
                canRetry(config.method) &&
                (isRetryable || isNetworkError) &&
                config[RETRY_COUNT_KEY] < maxRetries
            ) {
                config[RETRY_COUNT_KEY] = nextAttempt
                if (status !== 429) await sleep(fallbackDelay)
                return instance.request(config)
            }

            throw error
        },
    )
}

const clientCache = new Map<string, AxiosInstance>()

function cacheKey(flavor: string, accountId: string | undefined, apiKey: string | undefined) {
    return [
        flavor,
        accountId,
        apiKey,
        getBaseUrl(),
        getTimeout(),
        getMaxRetries(),
        getRequestsPerSecond(),
        getMaxConcurrentRequests(),
    ].join("\u0000")
}

function limiterKey(accountId: string | undefined): string {
    return [
        getBaseUrl(),
        accountId ?? "public",
        getRequestsPerSecond(),
        getMaxConcurrentRequests(),
    ].join("\u0000")
}

function createLimiter(accountId: string | undefined): RequestLimiter {
    return getRequestLimiter(limiterKey(accountId), {
        requestsPerSecond: getRequestsPerSecond(),
        maxConcurrent: getMaxConcurrentRequests(),
    })
}

function getCachedClient(key: string, build: () => AxiosInstance): AxiosInstance {
    const cached = clientCache.get(key)
    if (cached) return cached
    const instance = build()
    clientCache.set(key, instance)
    if (clientCache.size > 8) {
        const oldest = clientCache.keys().next().value
        if (oldest !== undefined && oldest !== key) clientCache.delete(oldest)
    }
    return instance
}

export async function createApiAxios(): Promise<AxiosInstance> {
    const accountId = await cred.accountId
    const apiKey = await cred.apiKey

    return getCachedClient(cacheKey("api", accountId, apiKey), () => {
        const instance = axios.create({
            baseURL: `${getBaseUrl()}/Accounts/${accountId}`,
            auth: {
                username: accountId,
                password: apiKey,
            },
            headers: {
                "Content-Type": "application/json",
            },
            timeout: getTimeout(),
        })
        attachResilience(instance, getMaxRetries(), createLimiter(accountId))
        return instance
    })
}

async function createPublicAxios(useAuth: boolean): Promise<AxiosInstance> {
    const accountId = useAuth ? (await cred.accountId) || "" : undefined
    const apiKey = useAuth ? (await cred.apiKey) || "" : undefined

    return getCachedClient(cacheKey(useAuth ? "public-auth" : "public", accountId, apiKey), () => {
        const instance = axios.create({
            baseURL: getBaseUrl(),
            headers: {
                "Content-Type": "application/json",
            },
            timeout: getTimeout(),
            ...(useAuth
                ? {
                      auth: {
                          username: accountId as string,
                          password: apiKey as string,
                      },
                  }
                : {}),
        })
        attachResilience(instance, getMaxRetries(), createLimiter(accountId))
        return instance
    })
}

export interface ApiResponse<T = unknown> {
    status: number
    statusText: string
    data: T
    headers: Record<string, unknown>
    requestId?: string
}

export interface ApiRequestOptions {
    method: Method
    path: string
    params?: Record<string, unknown>
    data?: unknown
    timeout?: number
}

export interface PublicRequestOptions extends ApiRequestOptions {
    auth?: boolean
}

export class FreeClimbHttpError extends Error {
    readonly status?: number

    readonly data?: unknown

    readonly headers?: Record<string, unknown>

    readonly statusText?: string

    readonly code?: string

    readonly requestId?: string

    readonly isNetworkError: boolean

    constructor(details: {
        message: string
        status?: number
        data?: unknown
        headers?: Record<string, unknown>
        statusText?: string
        code?: string
        requestId?: string
        isNetworkError?: boolean
    }) {
        super(details.message)
        this.name = "FreeClimbHttpError"
        this.status = details.status
        this.data = details.data
        this.headers = details.headers
        this.statusText = details.statusText
        this.code = details.code
        this.requestId = details.requestId
        this.isNetworkError = details.isNetworkError ?? false
    }

    get response():
        | { status: number; data: unknown; headers?: Record<string, unknown>; statusText?: string }
        | undefined {
        if (this.status === undefined) return undefined
        return {
            status: this.status,
            data: this.data,
            headers: this.headers,
            statusText: this.statusText,
        }
    }
}

function normalizeError(error: unknown): FreeClimbHttpError {
    if (error instanceof FreeClimbHttpError) return error

    if (axios.isAxiosError(error)) {
        const requestId = getRequestId(error.config)

        if (error.response) {
            return new FreeClimbHttpError({
                message: `Request failed with status ${error.response.status}`,
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers as Record<string, unknown>,
                statusText: error.response.statusText,
                code: error.code,
                requestId,
            })
        }

        return new FreeClimbHttpError({
            message: error.message,
            code: error.code,
            requestId,
            isNetworkError: true,
        })
    }

    return new FreeClimbHttpError({
        message: error instanceof Error ? error.message : String(error),
    })
}

async function execute<T>(
    client: AxiosInstance,
    options: ApiRequestOptions,
): Promise<ApiResponse<T>> {
    try {
        const response = await client.request<T>({
            url: options.path,
            method: options.method,
            params: options.params,
            data: options.data,
            ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
        })

        return {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers as Record<string, unknown>,
            requestId: getRequestId(response.config),
        }
    } catch (error) {
        throw normalizeError(error)
    }
}

async function executeWithAuthRefresh<T>(
    createClient: () => Promise<AxiosInstance>,
    options: ApiRequestOptions,
): Promise<ApiResponse<T>> {
    const client = await createClient()
    try {
        return await execute<T>(client, options)
    } catch (error) {
        if (
            error instanceof FreeClimbHttpError &&
            error.status === 401 &&
            canRetry(options.method)
        ) {
            clientCache.clear()
            const freshClient = await createClient()
            return execute<T>(freshClient, options)
        }
        throw error
    }
}

export async function apiRequest<T = unknown>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    return executeWithAuthRefresh<T>(createApiAxios, options)
}

export async function publicRequest<T = unknown>(
    options: PublicRequestOptions,
): Promise<ApiResponse<T>> {
    const useAuth = options.auth ?? false
    if (!useAuth) {
        const client = await createPublicAxios(false)
        return execute<T>(client, options)
    }
    return executeWithAuthRefresh<T>(() => createPublicAxios(true), options)
}
