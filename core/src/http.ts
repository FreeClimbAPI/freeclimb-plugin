import axios, { AxiosInstance, AxiosError, Method } from "axios"
import { randomUUID } from "crypto"
import { Environment } from "./environment.js"
import { cred } from "./credentials.js"

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_URL = "https://www.freeclimb.com/apiserver"
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const REQUEST_ID_KEY = "fcRequestId"
const RETRY_COUNT_KEY = "fcRetryCount"

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

function getBaseUrl(): string {
    return Environment.getString("FREECLIMB_CLI_BASE_URL") || DEFAULT_BASE_URL
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

export function getRequestId(config: any): string | undefined {
    return config?.[REQUEST_ID_KEY]
}

function attachResilience(instance: AxiosInstance, maxRetries: number): void {
    instance.interceptors.request.use((config) => {
        const requestId = generateRequestId()
        config.headers["X-Request-Id"] = requestId
        ;(config as any)[REQUEST_ID_KEY] = requestId
        return config
    })

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
}

export async function createApiAxios(): Promise<AxiosInstance> {
    const accountId = await cred.accountId
    const apiKey = await cred.apiKey

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

    attachResilience(instance, getMaxRetries())
    return instance
}

async function createPublicAxios(useAuth: boolean): Promise<AxiosInstance> {
    const instance = axios.create({
        baseURL: getBaseUrl(),
        headers: {
            "Content-Type": "application/json",
        },
        timeout: getTimeout(),
        ...(useAuth
            ? {
                  auth: {
                      username: (await cred.accountId) || "",
                      password: (await cred.apiKey) || "",
                  },
              }
            : {}),
    })

    attachResilience(instance, getMaxRetries())
    return instance
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

export async function apiRequest<T = unknown>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const client = await createApiAxios()
    return execute<T>(client, options)
}

export async function publicRequest<T = unknown>(
    options: PublicRequestOptions,
): Promise<ApiResponse<T>> {
    const client = await createPublicAxios(options.auth ?? false)
    return execute<T>(client, options)
}
