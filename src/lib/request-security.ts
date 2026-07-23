/**
 * Reads the `CHATBOT_ALLOWED_ORIGINS` environment variable.
 *
 * Value must be a comma-separated list of full URL origins
 * (e.g. `https://lab.amoura.design`).
 *
 * Wildcards, `endsWith`, and patterns are intentionally NOT supported.
 * Each entry is compared by exact URL origin match.
 */
function getAllowedOrigins(): Set<string> {
  const raw = process.env.CHATBOT_ALLOWED_ORIGINS?.trim()
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
}

/**
 * Strict origin validation.
 *
 * - Accepts same-origin requests (Origin === Host)
 * - Accepts origins listed in `CHATBOT_ALLOWED_ORIGINS`
 *     (exact match; no wildcards, no `endsWith`)
 * - Returns false for unknown, malformed, or absent origins
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  // Same-origin
  if (originHost === host) return true

  // Whitelist (exact origin match)
  const allowed = getAllowedOrigins()
  return allowed.has(origin)
}

/**
 * @deprecated Use `isAllowedOrigin()` instead.
 * Kept for backward compatibility and existing tests.
 */
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

// ── Rate limiting ───────────────────────────────────────────────────────────

type RateEntry = { count: number; resetAt: number }

export class WindowRateLimiter {
  private readonly entries = new Map<string, RateEntry>()

  consume(key: string, limit = 12, windowMs = 60_000) {
    const now = Date.now()
    const current = this.entries.get(key)
    const entry =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current
    entry.count += 1
    this.entries.set(key, entry)
    return {
      allowed: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
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

// ── Structured security logging ─────────────────────────────────────────────

type SecurityLog = {
  requestId: string
  originAllowed: boolean
  mode: 'mock' | 'live' | 'unknown'
  rateLimited: boolean
  status: number
  durationMs: number
}

/**
 * Writes a single structured security log line to stderr.
 *
 * Intentionally does NOT log:
 *   - Message content
 *   - API keys
 *   - Raw IP addresses
 *
 * In production, route this to your log aggregator.
 */
export function writeSecurityLog(log: SecurityLog): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...log,
  })
  // stderr is the conventional target for structured logs in Node.js serverless
  process.stderr.write(`${line}\n`)
}
