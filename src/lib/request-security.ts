export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'local'
}

type RateEntry = { count: number; resetAt: number }

class WindowRateLimiter {
  private readonly entries = new Map<string, RateEntry>()

  consume(key: string, limit = 12, windowMs = 60_000) {
    const now = Date.now()
    const current = this.entries.get(key)
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current
    entry.count += 1
    this.entries.set(key, entry)
    return {
      allowed: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    }
  }
}

const globalRateLimit = globalThis as typeof globalThis & {
  __portableChatbotRateLimiter?: WindowRateLimiter
}

export const chatbotRateLimiter =
  globalRateLimit.__portableChatbotRateLimiter || new WindowRateLimiter()

if (process.env.NODE_ENV !== 'production') {
  globalRateLimit.__portableChatbotRateLimiter = chatbotRateLimiter
}
