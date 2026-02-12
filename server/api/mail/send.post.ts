import { buildRawMessage } from '../../utils/smtp'

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

  const password = decryptPassword(encryptedPassword)

  // Check content type to determine if this is a multipart form (with attachments) or JSON
  const contentType = getHeader(event, 'content-type') || ''
  let to: string, cc: string | undefined, bcc: string | undefined
  let subject: string, text: string | undefined, html: string | undefined
  let replyTo: string | undefined, inReplyTo: string | undefined
  let attachments: { filename: string, content: Buffer, contentType: string }[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({ statusCode: 400, message: 'Invalid form data' })
    }

    const fields: Record<string, string> = {}
    const files: { filename: string, content: Buffer, contentType: string }[] = []

    for (const part of formData) {
      if (part.filename) {
        files.push({
          filename: part.filename,
          content: part.data,
          contentType: part.type || 'application/octet-stream'
        })
      } else if (part.name) {
        fields[part.name] = part.data.toString('utf-8')
      }
    }

    to = fields.to || ''
    cc = fields.cc || undefined
    bcc = fields.bcc || undefined
    subject = fields.subject || ''
    text = fields.text || undefined
    html = fields.html || undefined
    replyTo = fields.replyTo || undefined
    inReplyTo = fields.inReplyTo || undefined
    attachments = files
  } else {
    const body = await readBody(event)
    to = body.to
    cc = body.cc
    bcc = body.bcc
    subject = body.subject
    text = body.text
    html = body.html
    replyTo = body.replyTo
    inReplyTo = body.inReplyTo
  }

  if (!to || !subject) {
    throw createError({ statusCode: 400, message: 'Recipient (to) and subject are required' })
  }

  try {
    const result = await sendMail(session, password, {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      replyTo,
      inReplyTo,
      attachments
    })

    // Best-effort: append sent message to IMAP Sent folder
    try {
      const rawMessage = await buildRawMessage(session.email, {
        to,
        cc,
        bcc,
        subject,
        html,
        text,
        inReplyTo,
        messageId: result.messageId
      })
      await appendToSent(session, password, rawMessage)
    } catch {
      // Silent — email was already sent via SMTP
    }

    await invalidateMailCache(session.email)
    return { success: true, messageId: result.messageId }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `SMTP error: ${error.message}` })
  }
})
