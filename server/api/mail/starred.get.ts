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

  // Check Redis cache (30s TTL)
  const cacheKey = `cache:starred:${session.email}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  const password = decryptPassword(encryptedPassword)

  try {
    const result = await searchMessages(session, password, 'INBOX', { flagged: true }, 50)
    await setMailCache(session.email, cacheKey, result, 30)
    return result
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
