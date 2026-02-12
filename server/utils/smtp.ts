import nodemailer from 'nodemailer'
import { randomBytes } from 'crypto'
import type { SessionData } from './session'

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export interface SendMailOptions {
  to: string
  cc?: string
  bcc?: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  inReplyTo?: string
  attachments?: MailAttachment[]
}

/**
 * Extract base64 data: URLs from HTML, replace with cid: references,
 * and return the modified HTML + inline attachments for nodemailer.
 */
function extractInlineImages(html: string): { html: string, inlineAttachments: { filename: string, content: Buffer, contentType: string, cid: string }[] } {
  const inlineAttachments: { filename: string, content: Buffer, contentType: string, cid: string }[] = []

  const processed = html.replace(
    /src="data:(image\/[^;]+);base64,([^"]+)"/g,
    (_match, mimeType: string, base64Data: string) => {
      const ext = mimeType.split('/')[1] || 'png'
      const cid = `img-${randomBytes(8).toString('hex')}@inline`
      const filename = `image-${inlineAttachments.length + 1}.${ext}`

      inlineAttachments.push({
        filename,
        content: Buffer.from(base64Data, 'base64'),
        contentType: mimeType,
        cid
      })

      return `src="cid:${cid}"`
    }
  )

  return { html: processed, inlineAttachments }
}

function buildAttachments(fileAttachments?: MailAttachment[], inlineAttachments?: { filename: string, content: Buffer, contentType: string, cid: string }[]) {
  const all: Record<string, unknown>[] = []
  for (const a of fileAttachments || []) {
    all.push({ filename: a.filename, content: a.content, contentType: a.contentType })
  }
  for (const a of inlineAttachments || []) {
    all.push({ filename: a.filename, content: a.content, contentType: a.contentType, cid: a.cid, contentDisposition: 'inline' })
  }
  return all.length > 0 ? all : undefined
}

export async function sendMail(
  session: SessionData,
  password: string,
  options: SendMailOptions
): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: session.smtpHost,
    port: session.smtpPort,
    secure: session.tlsMode === 'tls',
    requireTLS: session.tlsMode === 'starttls',
    auth: {
      user: session.email,
      pass: password
    },
    tls: { rejectUnauthorized: session.rejectUnauthorized }
  })

  // Extract inline base64 images and convert to CID attachments
  let html = options.html
  let inlineAttachments: { filename: string, content: Buffer, contentType: string, cid: string }[] = []
  if (html) {
    const extracted = extractInlineImages(html)
    html = extracted.html
    inlineAttachments = extracted.inlineAttachments
  }

  const result = await transporter.sendMail({
    from: session.email,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html,
    replyTo: options.replyTo,
    inReplyTo: options.inReplyTo,
    attachments: buildAttachments(options.attachments, inlineAttachments)
  })

  return { messageId: result.messageId }
}

/**
 * Build a raw RFC 2822 message buffer using nodemailer (for IMAP Sent folder).
 * Properly handles CID inline images so they display in the Sent copy.
 */
export async function buildRawMessage(
  from: string,
  options: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    html?: string
    text?: string
    inReplyTo?: string
    messageId?: string
  }
): Promise<Buffer> {
  let html = options.html
  let inlineAttachments: { filename: string, content: Buffer, contentType: string, cid: string }[] = []
  if (html) {
    const extracted = extractInlineImages(html)
    html = extracted.html
    inlineAttachments = extracted.inlineAttachments
  }

  // streamTransport + buffer: true gives us the raw MIME message as a Buffer
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true })

  const info = await transport.sendMail({
    from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html,
    text: options.text,
    inReplyTo: options.inReplyTo,
    messageId: options.messageId,
    date: new Date(),
    attachments: inlineAttachments.length > 0
      ? inlineAttachments.map(a => ({ filename: a.filename, content: a.content, contentType: a.contentType, cid: a.cid, contentDisposition: 'inline' as const }))
      : undefined
  })

  return info.message as Buffer
}
