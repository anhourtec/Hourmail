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

  // Check Redis cache first (5min TTL)
  const cacheKey = `cache:contacts:${session.email}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return { contacts: JSON.parse(cached) }
  }

  const password = decryptPassword(encryptedPassword)

  try {
    const contacts = await collectAddresses(session, password)
    await redis.set(cacheKey, JSON.stringify(contacts), 'EX', 300)
    return { contacts }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
