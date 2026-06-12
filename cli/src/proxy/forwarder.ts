import axios from "axios"

export interface ForwardResult {
    body: unknown
    headers: Record<string, string>
    latencyMs: number
    statusCode: number
}

export interface ForwardError {
    code: string
    error: string
}

export type ForwardResponse = ForwardResult | ForwardError

export function isForwardError(r: ForwardResponse): r is ForwardError {
    return "error" in r
}

export async function forwardRequest(
    targetPort: number,
    method: string,
    path: string,
    headers: Record<string, string>,
    body: unknown,
): Promise<ForwardResponse> {
    const start = Date.now()
    try {
        const response = await axios({
            method: method as any,
            url: `http://localhost:${targetPort}${path}`,
            headers,
            data: body,
            timeout: 30_000,
            // Accept any status — we want to capture 4xx/5xx from the user's app too
            validateStatus: () => true,
        })
        // Capture response headers for transparent forwarding
        // AxiosHeaders stores headers internally — use toJSON() to extract them
        const responseHeaders: Record<string, string> = {}
        const h = response.headers
        const plain = typeof h.toJSON === "function" ? h.toJSON() : h
        for (const [key, value] of Object.entries(plain as Record<string, unknown>)) {
            if (typeof value === "string") {
                responseHeaders[key] = value
            } else if (Array.isArray(value)) {
                responseHeaders[key] = value.join(", ")
            }
        }

        return {
            statusCode: response.status,
            body: response.data,
            headers: responseHeaders,
            latencyMs: Date.now() - start,
        }
    } catch (error: unknown) {
        const typedError = error as { code?: string; message?: string }
        return {
            error: typedError.message || "Unknown error",
            code: typedError.code || "UNKNOWN",
        }
    }
}
