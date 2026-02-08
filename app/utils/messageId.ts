/**
 * Encode a raw Message-ID (e.g. "<CABx+XJWx@mail.gmail.com>") into a URL-safe slug.
 * Strips angle brackets, then base64url-encodes.
 */
export function encodeMessageId(messageId: string | undefined | null): string | null {
  if (!messageId) return null
  const stripped = messageId.replace(/^<|>$/g, '')
  return btoa(stripped).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a URL slug back to the raw Message-ID (without angle brackets).
 */
export function decodeMessageId(slug: string): string | null {
  if (!slug) return null
  try {
    const base64 = slug.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64)
  } catch {
    return null
  }
}

/**
 * Check if a route param is a plain numeric UID (for backwards compat).
 */
export function isNumericUid(param: string): boolean {
  return /^\d+$/.test(param)
}
