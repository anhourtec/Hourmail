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
  const param = getRouterParam(event, 'uid') || ''
  const query = getQuery(event)
  const folder = (query.folder as string) || 'INBOX'

  let uid: number

  if (isNumericUid(param)) {
    uid = parseInt(param)
  } else {
    // Treat as base64url-encoded Message-ID
    const messageId = decodeMessageId(param)
    if (!messageId) {
      throw createError({ statusCode: 400, message: 'Invalid message identifier' })
    }

    // Check cache for Message-ID → UID resolution
    const resolveKey = `cache:resolve:${session.email}:${folder}:${messageId}`
    const cachedUid = await redis.get(resolveKey)
    if (cachedUid) {
      uid = parseInt(cachedUid)
    } else {
      const resolved = await findUidByMessageId(session, password, folder, messageId)
      if (!resolved) {
        throw createError({ statusCode: 404, message: 'Message not found' })
      }
      uid = resolved
      // Cache the resolution for 5 minutes
      await redis.set(resolveKey, String(uid), 'EX', 300)
    }
  }

  if (!uid) {
    throw createError({ statusCode: 400, message: 'Invalid message UID' })
  }

  // Check Redis cache for full message (60s TTL)
  const cacheKey = `cache:msg:${session.email}:${folder}:${uid}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  try {
    const message = await getMessage(session, password, folder, uid)
    if (!message) {
      throw createError({ statusCode: 404, message: 'Message not found' })
    }
    // Cache for 60 seconds
    await setMailCache(session.email, cacheKey, message, 60)
    return message
  } catch (err: unknown) {
    const error = err as Error
    if ('statusCode' in (err as object)) throw err
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
