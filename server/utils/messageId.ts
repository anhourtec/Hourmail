/**
 * Decode a base64url slug back to the raw Message-ID (without angle brackets).
 */
export function decodeMessageId(slug: string): string | null {
  if (!slug) return null
  try {
    return Buffer.from(slug, 'base64url').toString('utf-8')
  } catch {
    return null
  }
}

/**
 * Check if a route param is a plain numeric UID.
 */
export function isNumericUid(param: string): boolean {
  return /^\d+$/.test(param)
}
