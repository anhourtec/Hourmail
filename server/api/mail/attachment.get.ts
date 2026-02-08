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

  const query = getQuery(event)
  const uid = parseInt(query.uid as string)
  const folder = (query.folder as string) || 'INBOX'
  const filename = query.filename as string

  if (!uid || !filename) {
    throw createError({ statusCode: 400, message: 'Missing uid or filename' })
  }

  const password = decryptPassword(encryptedPassword)

  try {
    const att = await getAttachment(session, password, folder, uid, filename)
    if (!att) {
      throw createError({ statusCode: 404, message: 'Attachment not found' })
    }

    const mode = (query.mode as string) === 'view' ? 'inline' : 'attachment'
    setResponseHeaders(event, {
      'Content-Type': att.contentType,
      'Content-Disposition': `${mode}; filename="${encodeURIComponent(att.filename)}"`,
      'Content-Length': String(att.content.length),
      'Cache-Control': 'private, max-age=3600'
    })

    return att.content
  } catch (err: unknown) {
    const error = err as Error
    if ('statusCode' in (err as object)) throw err
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
