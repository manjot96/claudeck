const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_FAILURES = 5

type FailureRecord = { count: number; windowStart: number }

export function createAuthChecker(token: string) {
  const failures = new Map<string, FailureRecord>()

  function isRateLimited(ip: string): boolean {
    const record = failures.get(ip)
    if (!record) return false
    if (Date.now() - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      failures.delete(ip)
      return false
    }
    return record.count >= MAX_FAILURES
  }

  function recordFailure(ip: string): void {
    const now = Date.now()
    const record = failures.get(ip)
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      failures.set(ip, { count: 1, windowStart: now })
    } else {
      record.count++
    }
  }

  function isValid(authHeader: string | null, ip: string): boolean {
    if (isRateLimited(ip)) return false
    const valid = authHeader === `Bearer ${token}`
    if (!valid) recordFailure(ip)
    return valid
  }

  function isValidWs(tokenParam: string, ip: string): boolean {
    if (isRateLimited(ip)) return false
    const valid = tokenParam === token
    if (!valid) recordFailure(ip)
    return valid
  }

  return { isValid, isValidWs }
}
