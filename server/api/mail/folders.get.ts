export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const token = getCookie(event, 'hourinbox_session')!
  const encryptedPassword = await redis.get(`password:${token}`)
  if (!encryptedPassword) {
    throw createError({ statusCode: 401, message: 'Session expired' })
  }

  const query = getQuery(event)
  const forceRefresh = query.refresh === 'true'

  // Check Redis cache first (60s TTL)
  const cacheKey = `cache:folders:${session.email}`
  if (!forceRefresh) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return { folders: JSON.parse(cached) }
    }
  }

  const password = decryptPassword(encryptedPassword)

  try {
    const folders = await listFolders(session, password)
    await redis.set(cacheKey, JSON.stringify(folders), 'EX', 60)
    return { folders }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
