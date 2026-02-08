import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { ParsedMail } from 'mailparser'
import net from 'net'
import tls from 'tls'
import type { SessionData } from './session'

interface ImapEnvelopeAddress {
  name?: string
  address?: string
  mailbox?: string
  host?: string
}

interface MailparserAddress {
  name?: string
  address?: string
}

interface MailparserAddressGroup {
  value: MailparserAddress[]
}

interface MailparserAttachment {
  filename?: string
  size?: number
  contentType?: string
}

export interface MailFolder {
  path: string
  name: string
  specialUse?: string
  messages: number
  unseen: number
}

export interface MailMessage {
  uid: number
  seq: number
  messageId?: string
  subject: string
  from: { name: string, address: string }[]
  to: { name: string, address: string }[]
  date: string
  flags: string[]
  preview: string
}

export interface MailMessageFull extends MailMessage {
  html: string
  text: string
  cc?: { name: string, address: string }[]
  attachments: { filename: string, size: number, contentType: string }[]
}

function parseEnvelopeAddress(a: ImapEnvelopeAddress): { name: string, address: string } {
  if (!a) return { name: '', address: '' }

  let address = ''

  // ImapFlow may provide .address directly on some servers
  if (a.address) {
    address = a.address
  } else if (a.mailbox && a.host) {
    address = `${a.mailbox}@${a.host}`
  } else if (a.mailbox) {
    address = a.mailbox
  } else if (a.host) {
    address = a.host
  }

  let name = a.name || ''

  // Some IMAP servers put the full email in the name field when mailbox/host are null
  if (!address && name && name.includes('@')) {
    address = name
    name = ''
  }

  // If still no address, try to extract email from name like "Name <email@example.com>"
  if (!address && name) {
    const match = name.match(/<([^>]+)>/)
    if (match?.[1]) {
      address = match[1]
      name = name.replace(/<[^>]+>/, '').trim()
    }
  }

  // If we have an address but no name, use the local part of the email as display name
  if (!name && address) {
    const atIdx = address.indexOf('@')
    if (atIdx > 0) {
      name = address.substring(0, atIdx)
    }
  }

  return { name, address }
}

export async function testConnection(
  host: string,
  port: number,
  tlsMode: string,
  rejectUnauthorized: boolean,
  timeoutMs: number = 10000
): Promise<{ success: boolean, error?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.destroy()
      resolve({ success: false, error: `Connection to ${host}:${port} timed out after ${timeoutMs / 1000}s` })
    }, timeoutMs)

    const onError = (err: Error) => {
      clearTimeout(timer)
      resolve({ success: false, error: `Cannot reach ${host}:${port} — ${err.message}` })
    }

    const onConnect = () => {
      clearTimeout(timer)
      socket.destroy()
      resolve({ success: true })
    }

    let socket: net.Socket | tls.TLSSocket

    if (tlsMode === 'tls') {
      socket = tls.connect({ host, port, rejectUnauthorized }, onConnect)
    } else {
      socket = net.connect({ host, port }, onConnect)
    }

    socket.on('error', onError)
  })
}

function createImapClient(session: SessionData, password: string): ImapFlow {
  return new ImapFlow({
    host: session.imapHost,
    port: session.imapPort,
    secure: session.tlsMode === 'tls',
    auth: {
      user: session.email,
      pass: password
    },
    tls: { rejectUnauthorized: session.rejectUnauthorized },
    logger: false
  })
}

export async function verifyImapCredentials(
  host: string,
  port: number,
  tlsMode: string,
  rejectUnauthorized: boolean,
  email: string,
  password: string
): Promise<{ success: boolean, error?: string }> {
  const client = new ImapFlow({
    host,
    port,
    secure: tlsMode === 'tls',
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized },
    logger: false
  })

  try {
    await client.connect()
    await client.logout()
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message || 'IMAP connection failed' }
  }
}

export async function listFolders(session: SessionData, password: string): Promise<MailFolder[]> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const mailboxes = await client.list()
    const folders: MailFolder[] = []

    for (const mailbox of mailboxes) {
      const status = await client.status(mailbox.path, { messages: true, unseen: true })
      folders.push({
        path: mailbox.path,
        name: mailbox.name,
        specialUse: mailbox.specialUse || undefined,
        messages: status.messages || 0,
        unseen: status.unseen || 0
      })
    }

    return folders
  } finally {
    await client.logout()
  }
}

export async function listMessages(
  session: SessionData,
  password: string,
  folder: string = 'INBOX',
  page: number = 1,
  limit: number = 50
): Promise<{ messages: MailMessage[], total: number }> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      const status = await client.status(folder, { messages: true })
      const total = status.messages || 0

      if (total === 0) {
        return { messages: [], total: 0 }
      }

      const start = Math.max(1, total - (page * limit) + 1)
      const end = Math.max(1, total - ((page - 1) * limit))
      const range = `${start}:${end}`

      const messages: MailMessage[] = []

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        headers: ['date'],
        source: { start: 0, maxLength: 256 }
      })) {
        messages.push({
          uid: msg.uid,
          seq: msg.seq,
          messageId: msg.envelope?.messageId || undefined,
          subject: msg.envelope?.subject || '(no subject)',
          from: (msg.envelope?.from || []).map(parseEnvelopeAddress),
          to: (msg.envelope?.to || []).map(parseEnvelopeAddress),
          date: msg.envelope?.date?.toISOString() || '',
          flags: Array.from(msg.flags || []),
          preview: ''
        })
      }

      // Return newest first
      messages.reverse()
      return { messages, total }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export interface SearchQuery {
  text?: string
  from?: string
  to?: string
  subject?: string
  since?: string
  before?: string
  larger?: number
  smaller?: number
  flagged?: boolean
}

export async function searchMessages(
  session: SessionData,
  password: string,
  folder: string = 'INBOX',
  query: SearchQuery,
  limit: number = 50
): Promise<{ messages: MailMessage[], total: number }> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      // Build IMAP search criteria
      const criteria: Record<string, string | Date | number | boolean> = {}
      if (query.text) criteria.body = query.text
      if (query.from) criteria.from = query.from
      if (query.to) criteria.to = query.to
      if (query.subject) criteria.subject = query.subject
      if (query.since) criteria.since = new Date(query.since)
      if (query.before) criteria.before = new Date(query.before)
      if (query.larger) criteria.larger = query.larger
      if (query.smaller) criteria.smaller = query.smaller
      if (query.flagged) criteria.flagged = true

      const uids = await client.search(criteria, { uid: true })

      if (!uids || uids.length === 0) {
        return { messages: [], total: 0 }
      }

      const total = uids.length
      // Take the most recent UIDs (highest numbers = newest)
      const sortedUids = [...uids].sort((a, b) => b - a)
      const pageUids = sortedUids.slice(0, limit)
      const uidRange = pageUids.join(',')

      const messages: MailMessage[] = []

      for await (const msg of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        headers: ['date'],
        source: { start: 0, maxLength: 256 }
      }, { uid: true })) {
        messages.push({
          uid: msg.uid,
          seq: msg.seq,
          messageId: msg.envelope?.messageId || undefined,
          subject: msg.envelope?.subject || '(no subject)',
          from: (msg.envelope?.from || []).map(parseEnvelopeAddress),
          to: (msg.envelope?.to || []).map(parseEnvelopeAddress),
          date: msg.envelope?.date?.toISOString() || '',
          flags: Array.from(msg.flags || []),
          preview: ''
        })
      }

      // Sort newest first
      messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return { messages, total }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function getMessage(
  session: SessionData,
  password: string,
  folder: string,
  uid: number
): Promise<MailMessageFull | null> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true
      }, { uid: true })

      if (!msg || !msg.source) return null

      // Parse the raw source to get HTML/text
      const parsed: ParsedMail = await simpleParser(msg.source)

      return {
        uid: msg.uid,
        seq: msg.seq,
        messageId: parsed.messageId || msg.envelope?.messageId || undefined,
        subject: parsed.subject || '(no subject)',
        from: (parsed.from?.value || []).map((a: MailparserAddress) => ({
          name: a.name || '',
          address: a.address || ''
        })),
        to: (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [])
          .flatMap((t: MailparserAddressGroup) => t.value || [])
          .map((a: MailparserAddress) => ({ name: a.name || '', address: a.address || '' })),
        cc: (parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : [])
          .flatMap((t: MailparserAddressGroup) => t.value || [])
          .map((a: MailparserAddress) => ({ name: a.name || '', address: a.address || '' })),
        date: parsed.date?.toISOString() || '',
        flags: Array.from(msg.flags || []),
        preview: parsed.text?.substring(0, 200) || '',
        html: parsed.html || parsed.textAsHtml || '',
        text: parsed.text || '',
        attachments: (parsed.attachments || []).map((a: MailparserAttachment) => ({
          filename: a.filename || 'attachment',
          size: a.size || 0,
          contentType: a.contentType || 'application/octet-stream'
        }))
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function getAttachment(
  session: SessionData,
  password: string,
  folder: string,
  uid: number,
  filename: string
): Promise<{ content: Buffer, contentType: string, filename: string } | null> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        source: true
      }, { uid: true })

      if (!msg || !msg.source) return null

      const parsed: ParsedMail = await simpleParser(msg.source)
      const att = (parsed.attachments || []).find(
        a => a.filename === filename
      )
      if (!att) return null

      return {
        content: att.content,
        contentType: att.contentType || 'application/octet-stream',
        filename: att.filename || 'attachment'
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function findUidByMessageId(
  session: SessionData,
  password: string,
  folder: string,
  messageId: string
): Promise<number | null> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      // Try with angle brackets first
      const withBrackets = messageId.startsWith('<') ? messageId : `<${messageId}>`
      let uids = await client.search(
        { header: { 'Message-ID': withBrackets } },
        { uid: true }
      )
      if (uids && uids.length > 0) return uids[0] ?? null

      // Try without angle brackets
      uids = await client.search(
        { header: { 'Message-ID': messageId } },
        { uid: true }
      )
      if (uids && uids.length > 0) return uids[0] ?? null

      return null
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function updateMessageFlags(
  session: SessionData,
  password: string,
  folder: string,
  uid: number,
  flags: { add?: string[], remove?: string[] }
): Promise<void> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      if (flags.add?.length) {
        await client.messageFlagsAdd(String(uid), flags.add, { uid: true })
      }
      if (flags.remove?.length) {
        await client.messageFlagsRemove(String(uid), flags.remove, { uid: true })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function updateMessageFlagsBatch(
  session: SessionData,
  password: string,
  folder: string,
  uids: number[],
  flags: { add?: string[], remove?: string[] }
): Promise<void> {
  if (uids.length === 0) return
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      const uidRange = uids.join(',')
      if (flags.add?.length) {
        await client.messageFlagsAdd(uidRange, flags.add, { uid: true })
      }
      if (flags.remove?.length) {
        await client.messageFlagsRemove(uidRange, flags.remove, { uid: true })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export interface CollectedContact {
  name: string
  address: string
}

export async function collectAddresses(
  session: SessionData,
  password: string
): Promise<CollectedContact[]> {
  const client = createImapClient(session, password)
  await client.connect()

  const addressMap = new Map<string, string>() // lowercase email -> best name

  async function extractFromFolder(folder: string, field: 'from' | 'to') {
    try {
      const lock = await client.getMailboxLock(folder)
      try {
        const status = await client.status(folder, { messages: true })
        const total = status.messages || 0
        if (total === 0) return

        const start = Math.max(1, total - 199)
        const range = `${start}:${total}`

        for await (const msg of client.fetch(range, {
          envelope: true
        })) {
          const addresses = field === 'from'
            ? (msg.envelope?.from || [])
            : [...(msg.envelope?.to || []), ...(msg.envelope?.cc || [])]

          for (const raw of addresses) {
            const parsed = parseEnvelopeAddress(raw)
            if (!parsed.address || !parsed.address.includes('@')) continue

            const key = parsed.address.toLowerCase()
            const existing = addressMap.get(key)
            // Keep the name if we have one and existing doesn't
            if (!existing || (!existing && parsed.name)) {
              addressMap.set(key, parsed.name)
            }
            // Prefer a real name over local-part-derived name
            if (existing && parsed.name && parsed.name !== parsed.address.split('@')[0]) {
              addressMap.set(key, parsed.name)
            }
          }
        }
      } finally {
        lock.release()
      }
    } catch {
      // Folder may not exist, skip
    }
  }

  try {
    // Get folder list to find Sent folder
    const mailboxes = await client.list()
    const sentFolder = mailboxes.find(m => m.specialUse === '\\Sent')?.path || 'Sent'

    // Collect To/Cc from Sent, From from INBOX
    await extractFromFolder(sentFolder, 'to')
    await extractFromFolder('INBOX', 'from')

    // Convert map to sorted array
    const contacts: CollectedContact[] = []
    for (const [address, name] of addressMap) {
      contacts.push({ name, address })
    }

    contacts.sort((a, b) => {
      const nameA = (a.name || a.address).toLowerCase()
      const nameB = (b.name || b.address).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return contacts
  } finally {
    await client.logout()
  }
}

export async function getDraftContent(
  session: SessionData,
  password: string,
  folder: string,
  uid: number
): Promise<{ to: string, cc: string, bcc: string, subject: string, html: string } | null> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        source: true
      }, { uid: true })

      if (!msg || !msg.source) return null

      // Extract body from raw source (skip simpleParser for speed)
      const raw = msg.source.toString()
      const headerEnd = raw.indexOf('\r\n\r\n')
      const body = headerEnd >= 0 ? raw.substring(headerEnd + 4) : ''

      const to = (msg.envelope?.to || []).map(parseEnvelopeAddress)
        .map(a => a.name ? `${a.name} <${a.address}>` : a.address)
        .join(', ')
      const cc = (msg.envelope?.cc || []).map(parseEnvelopeAddress)
        .map(a => a.name ? `${a.name} <${a.address}>` : a.address)
        .join(', ')
      const bcc = (msg.envelope?.bcc || []).map(parseEnvelopeAddress)
        .map(a => a.name ? `${a.name} <${a.address}>` : a.address)
        .join(', ')

      return {
        to,
        cc,
        bcc,
        subject: msg.envelope?.subject || '',
        html: body
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function appendDraft(
  session: SessionData,
  password: string,
  rawMessage: string | Buffer,
  replaceUid?: number
): Promise<{ uid: number, folder: string }> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    // Find the Drafts folder
    const mailboxes = await client.list()
    const draftsFolder = mailboxes.find(m => m.specialUse === '\\Drafts')?.path || 'Drafts'

    // Delete the previous draft version if replacing
    if (replaceUid) {
      const lock = await client.getMailboxLock(draftsFolder)
      try {
        await client.messageDelete(String(replaceUid), { uid: true })
      } catch {
        // Ignore — old draft may already be gone
      } finally {
        lock.release()
      }
    }

    const result = await client.append(draftsFolder, rawMessage, ['\\Draft', '\\Seen'])
    return { uid: result?.uid || 0, folder: draftsFolder }
  } finally {
    await client.logout()
  }
}

export async function moveMessage(
  session: SessionData,
  password: string,
  fromFolder: string,
  uid: number,
  toFolder: string
): Promise<void> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(fromFolder)
    try {
      await client.messageMove(String(uid), toFolder, { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}

export async function deleteMessage(
  session: SessionData,
  password: string,
  folder: string,
  uid: number
): Promise<void> {
  const client = createImapClient(session, password)
  await client.connect()

  try {
    const lock = await client.getMailboxLock(folder)
    try {
      await client.messageFlagsAdd(String(uid), ['\\Deleted'], { uid: true })
      await client.messageDelete(String(uid), { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }
}
