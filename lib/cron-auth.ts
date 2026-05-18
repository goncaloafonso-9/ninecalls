import { timingSafeEqual } from 'crypto'

/**
 * Validates cron/internal requests.
 * Vercel cron jobs and internal endpoint calls use Authorization: Bearer CRON_JOBS.
 * Set CRON_JOBS in .env.local and in Vercel environment variables.
 */
export function validateCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_JOBS
  if (!secret) {
    console.error('[cron-auth] CRON_JOBS not configured')
    return false
  }
  if (!authHeader) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(authHeader)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
