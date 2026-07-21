export interface RequestLimiterOptions {
    maxConcurrent: number
    requestsPerSecond: number
}

type Release = () => void

interface PendingRequest {
    resolve: (release: Release) => void
}

const WINDOW_MS = 1000

export class RequestLimiter {
    private active = 0
    private cooldownUntil = 0
    private queue: PendingRequest[] = []
    private starts: number[] = []
    private timer: ReturnType<typeof setTimeout> | undefined

    constructor(private readonly options: RequestLimiterOptions) {}

    acquire(): Promise<Release> {
        return new Promise((resolve) => {
            this.queue.push({ resolve })
            this.drain()
        })
    }

    applyCooldown(delayMs: number): void {
        if (!Number.isFinite(delayMs) || delayMs <= 0) return
        this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delayMs)
        this.schedule()
    }

    private drain(): void {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = undefined
        }

        const now = Date.now()
        this.starts = this.starts.filter((startedAt) => startedAt > now - WINDOW_MS)

        while (
            this.queue.length > 0 &&
            this.active < this.options.maxConcurrent &&
            this.starts.length < this.options.requestsPerSecond &&
            now >= this.cooldownUntil
        ) {
            const pending = this.queue.shift()
            if (!pending) break

            this.active += 1
            this.starts.push(now)
            let released = false
            pending.resolve(() => {
                if (released) return
                released = true
                this.active -= 1
                this.drain()
            })
        }

        this.schedule()
    }

    private schedule(): void {
        if (this.timer || this.queue.length === 0 || this.active >= this.options.maxConcurrent) {
            return
        }

        const now = Date.now()
        const rateAvailableAt =
            this.starts.length >= this.options.requestsPerSecond
                ? this.starts[0] + WINDOW_MS
                : now
        const availableAt = Math.max(now, this.cooldownUntil, rateAvailableAt)

        if (availableAt <= now) {
            queueMicrotask(() => this.drain())
            return
        }

        this.timer = setTimeout(() => {
            this.timer = undefined
            this.drain()
        }, availableAt - now)
    }
}

const limiterCache = new Map<string, RequestLimiter>()

export function getRequestLimiter(
    key: string,
    options: RequestLimiterOptions,
): RequestLimiter {
    const cached = limiterCache.get(key)
    if (cached) return cached

    const limiter = new RequestLimiter(options)
    limiterCache.set(key, limiter)
    if (limiterCache.size > 16) {
        const oldest = limiterCache.keys().next().value
        if (oldest !== undefined && oldest !== key) limiterCache.delete(oldest)
    }
    return limiter
}
