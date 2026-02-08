import nodemailer from 'nodemailer'
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

  const result = await transporter.sendMail({
    from: session.email,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
    inReplyTo: options.inReplyTo,
    attachments: options.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType
    }))
  })

  return { messageId: result.messageId }
}
