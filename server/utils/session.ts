import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto'
import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie } from 'h3'

const SESSION_COOKIE = 'hourinbox_session'
const ACCOUNTS_COOKIE = 'hourinbox_accounts'
const SESSION_TTL = 60 * 60 * 24 // 24 hours

export interface SessionData {
  email: string
  orgId: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  useTls: boolean
}

function getSessionSecret(): string {
  return process.env.NUXT_SESSION_SECRET || 'default-dev-secret-change-in-production!!'
}

function deriveKey(): Buffer {
  // Derive a 32-byte key from the session secret using SHA-256
  return createHash('sha256').update(getSessionSecret()).digest()
}

export function encryptPassword(plaintext: string): string {
  const key = deriveKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptPassword(ciphertext: string): string {
  const key = deriveKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    // Backwards compat: old base64-only format
    return Buffer.from(ciphertext, 'base64').toString()
  }
  const iv = Buffer.from(parts[0]!, 'base64')
  const authTag = Buffer.from(parts[1]!, 'base64')
  const encrypted = Buffer.from(parts[2]!, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_TTL,
  path: '/'
}

// --- Account token helpers ---

function getAccountTokens(event: H3Event): string[] {
  const raw = getCookie(event, ACCOUNTS_COOKIE)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return raw ? [raw] : []
  }
}

function setAccountTokens(event: H3Event, tokens: string[]) {
  if (tokens.length === 0) {
    deleteCookie(event, ACCOUNTS_COOKIE)
  } else {
    setCookie(event, ACCOUNTS_COOKIE, JSON.stringify(tokens), cookieOptions)
  }
}

// --- Session CRUD ---

export async function createSession(event: H3Event, data: SessionData): Promise<string> {
  const token = generateSessionToken()

  await redis.set(
    `session:${token}`,
    JSON.stringify(data),
    'EX',
    SESSION_TTL
  )

  // Set as active session
  setCookie(event, SESSION_COOKIE, token, cookieOptions)

  // Add to accounts list (avoid duplicates for same email)
  let existing = getAccountTokens(event)

  // If no accounts cookie exists yet, preserve the current active session token
  // (handles upgrade from single-account to multi-account)
  const currentToken = getCookie(event, SESSION_COOKIE)
  if (existing.length === 0 && currentToken) {
    const currentSession = await redis.get(`session:${currentToken}`)
    if (currentSession) {
      existing = [currentToken]
    }
  }

  // Remove any existing token for the same email
  const cleaned: string[] = []
  for (const t of existing) {
    const sess = await redis.get(`session:${t}`)
    if (sess) {
      const parsed = JSON.parse(sess) as SessionData
      if (parsed.email !== data.email) {
        cleaned.push(t)
      } else {
        // Clean up old token's password
        await redis.del(`password:${t}`)
        await redis.del(`session:${t}`)
      }
    }
  }
  cleaned.push(token)
  setAccountTokens(event, cleaned)

  return token
}

export async function getUserSession(event: H3Event): Promise<SessionData | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const data = await redis.get(`session:${token}`)
  if (!data) return null

  return JSON.parse(data) as SessionData
}

export async function destroySession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    await redis.del(`session:${token}`)

    // Remove from accounts list
    const tokens = getAccountTokens(event).filter(t => t !== token)
    setAccountTokens(event, tokens)

    // Switch to next available account or clear
    if (tokens.length > 0) {
      setCookie(event, SESSION_COOKIE, tokens[0]!, cookieOptions)
    } else {
      deleteCookie(event, SESSION_COOKIE)
    }
  }
}

// --- Multi-account helpers ---

export async function getAllAccounts(event: H3Event): Promise<{ email: string; organization?: string; domain?: string; active: boolean }[]> {
  const tokens = getAccountTokens(event)
  const activeToken = getCookie(event, SESSION_COOKIE)
  const accounts: { email: string; organization?: string; domain?: string; active: boolean }[] = []

  for (const token of tokens) {
    const data = await redis.get(`session:${token}`)
    if (data) {
      const session = JSON.parse(data) as SessionData
      const org = await prisma.organization.findUnique({
        where: { id: session.orgId },
        select: { name: true, domain: true }
      })
      accounts.push({
        email: session.email,
        organization: org?.name,
        domain: org?.domain,
        active: token === activeToken
      })
    }
  }

  return accounts
}

export async function switchAccount(event: H3Event, email: string): Promise<boolean> {
  const tokens = getAccountTokens(event)

  for (const token of tokens) {
    const data = await redis.get(`session:${token}`)
    if (data) {
      const session = JSON.parse(data) as SessionData
      if (session.email === email) {
        setCookie(event, SESSION_COOKIE, token, cookieOptions)
        return true
      }
    }
  }

  return false
}

export async function removeAccount(event: H3Event, email: string): Promise<void> {
  const tokens = getAccountTokens(event)
  const activeToken = getCookie(event, SESSION_COOKIE)

  for (const token of tokens) {
    const data = await redis.get(`session:${token}`)
    if (data) {
      const session = JSON.parse(data) as SessionData
      if (session.email === email) {
        // Clean up session and password
        await redis.del(`session:${token}`)
        await redis.del(`password:${token}`)

        // Remove from accounts list
        const remaining = tokens.filter(t => t !== token)
        setAccountTokens(event, remaining)

        // If this was the active account, switch to next
        if (token === activeToken) {
          if (remaining.length > 0) {
            setCookie(event, SESSION_COOKIE, remaining[0]!, cookieOptions)
          } else {
            deleteCookie(event, SESSION_COOKIE)
          }
        }
        return
      }
    }
  }
}
