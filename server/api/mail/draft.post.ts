export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const token = getCookie(event, 'hourmail_session')!
  const encryptedPassword = await redis.get(`password:${token}`)
  if (!encryptedPassword) {
    throw createError({ statusCode: 401, message: 'Session expired' })
  }

  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'Missing body' })
  }

  const { to, cc, bcc, subject, html, replaceUid } = body as {
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    html?: string
    replaceUid?: number
  }

  // Build a minimal RFC 2822 message for the draft
  const lines: string[] = []
  lines.push(`From: ${session.email}`)
  if (to) lines.push(`To: ${to}`)
  if (cc) lines.push(`Cc: ${cc}`)
  if (bcc) lines.push(`Bcc: ${bcc}`)
  lines.push(`Subject: ${subject || '(no subject)'}`)
  lines.push(`Date: ${new Date().toUTCString()}`)
  lines.push(`MIME-Version: 1.0`)

  if (html) {
    lines.push(`Content-Type: text/html; charset=utf-8`)
    lines.push(``)
    lines.push(html)
  } else {
    lines.push(`Content-Type: text/plain; charset=utf-8`)
    lines.push(``)
    lines.push('')
  }

  const rawMessage = lines.join('\r\n')
  const password = decryptPassword(encryptedPassword)

  try {
    const result = await appendDraft(session, password, rawMessage, replaceUid || undefined)
    // Invalidate Drafts folder cache so it shows the new draft immediately
    invalidateMailCache(session.email).catch(() => {})
    return { success: true, uid: result.uid, folder: result.folder }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
